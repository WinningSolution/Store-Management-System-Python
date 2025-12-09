from datetime import date, datetime, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.sales import Sales
from app.models.inventory import InventoryStatus
from app.models.employee import Attend, Employee, Vacation
from app.schemas.dashboard import (
    MainDashboardResponse,
    SalesSummary,
    InventoryAlertItem,
    TodayAttendanceItem,
    VacationTodayItem,
    NotificationItem,
    ManagementDashboardResponse,
    ManagementKpi,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/main", response_model=MainDashboardResponse)
def get_main_dashboard(
    store_id: Optional[str] = Query(None),
    date_param: Optional[date] = Query(None, alias="date"),
    db: Session = Depends(get_db),
):
    """
    메인 대시보드 요약
    - 기준 일자: 기본은 "매출이 존재하는 마지막 일자"
      (실 데이터가 과거에만 있는 개발/더미 환경에서도 항상 값이 보이도록)
    - 오늘/이번주 매출
    - 재고 임박/품절 알림
    - 오늘 출근 직원 / 휴가 직원
    """
    if date_param:
        today = date_param
    else:
        last_sale_date = db.query(func.max(func.date(Sales.sale_dt))).scalar()
        today = last_sale_date or datetime.utcnow().date()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    sales_query = db.query(func.sum(Sales.qty * Sales.unit_price))
    if store_id:
        sales_query = sales_query.filter(Sales.store_id == store_id)

    today_sales = (
        sales_query.filter(func.date(Sales.sale_dt) == today).scalar() or 0
    )
    week_sales = (
        sales_query.filter(
            func.date(Sales.sale_dt) >= week_start,
            func.date(Sales.sale_dt) <= week_end,
        ).scalar()
        or 0
    )

    sales_summary = SalesSummary(
        todaySales=float(today_sales),
        weekSales=float(week_sales),
        weekSalesYoY=None,
        weekSalesWoW=None,
    )

    # 재고 임박/품절 알림
    inv_query = db.query(InventoryStatus).filter(InventoryStatus.snapshot_dt == today)
    if store_id:
        inv_query = inv_query.filter(InventoryStatus.store_id == store_id)
    alerts: List[InventoryAlertItem] = []
    for inv in inv_query.all():
        total_qty = (inv.fl_qty or 0) + (inv.br_qty or 0)
        if total_qty == 0:
            status = "품절"
        elif total_qty <= 3:
            status = "임박"
        else:
            continue
        alerts.append(
            InventoryAlertItem(
                prodId=inv.prod_id,
                prodNm=inv.prod_nm,
                storeId=inv.store_id,
                stockStatus=status,
                totalQty=total_qty,
            )
        )

    # 오늘 출근 직원
    attend_query = (
        db.query(Attend, Employee.emp_nm, Employee.grade)
        .join(Employee, (Employee.store_id == Attend.store_id) & (Employee.emp_id == Attend.emp_id))
        .filter(Attend.work_dt == today)
    )
    if store_id:
        attend_query = attend_query.filter(Attend.store_id == store_id)
    today_attendance: List[TodayAttendanceItem] = []
    for att, emp_nm, grade in attend_query.all():
        status = "근무"
        if not att.clock_in_ts:
            status = "미출근"
        today_attendance.append(
            TodayAttendanceItem(
                empId=att.emp_id,
                empNm=emp_nm,
                grade=grade,
                storeId=att.store_id,
                clockInTs=att.clock_in_ts,
                clockOutTs=att.clock_out_ts,
                status=status,
            )
        )

    # 오늘 휴가 직원
    vac_query = db.query(Vacation, Employee.emp_nm).join(
        Employee,
        (Employee.store_id == Vacation.store_id) & (Employee.emp_id == Vacation.emp_id),
    ).filter(Vacation.vacation_dt == today, Vacation.status == "승인")
    if store_id:
        vac_query = vac_query.filter(Vacation.store_id == store_id)
    vacation_today: List[VacationTodayItem] = []
    for vac, emp_nm in vac_query.all():
        vacation_today.append(
            VacationTodayItem(
                empId=vac.emp_id,
                empNm=emp_nm,
                vacationType=vac.vacation_type,
                vacationDt=vac.vacation_dt,
            )
        )

    # 알림은 skeleton (추후 별도 테이블 연동 가능)
    notifications: List[NotificationItem] = []

    return MainDashboardResponse(
        salesSummary=sales_summary,
        inventoryAlerts=alerts,
        todayAttendance=today_attendance,
        vacationToday=vacation_today,
        notifications=notifications,
    )


@router.get("/management", response_model=ManagementDashboardResponse)
def get_management_dashboard(
    store_id: Optional[str] = Query(None),
    start_dt: Optional[date] = Query(
        None, description="조회 시작일 (미지정 시 마지막 매출월의 1일)"
    ),
    end_dt: Optional[date] = Query(
        None, description="조회 종료일 (미지정 시 마지막 매출일)"
    ),
    db: Session = Depends(get_db),
):
    """
    경영 지표 대시보드
    - 기본 기간: 매출이 존재하는 마지막 월 기준 (마지막 매출일이 속한 달의 1일 ~ 마지막 매출일)
    - 총 매출, 고객 수, 재고 회전율 등 기본 KPI skeleton
    """
    last_sale_date = db.query(func.max(func.date(Sales.sale_dt))).scalar()
    if last_sale_date is None:
        # 매출 데이터가 전혀 없는 경우
        kpi = ManagementKpi(
            totalSales=0.0,
            totalMargin=None,
            totalCustomers=None,
            avgBasketSize=None,
            inventoryTurnover=None,
        )
        return ManagementDashboardResponse(kpi=kpi, charts={})

    if not start_dt:
        start_dt = date(last_sale_date.year, last_sale_date.month, 1)
    if not end_dt:
        end_dt = last_sale_date

    sales_query = db.query(func.sum(Sales.qty * Sales.unit_price))
    if store_id:
        sales_query = sales_query.filter(Sales.store_id == store_id)
    total_sales = (
        sales_query.filter(
            func.date(Sales.sale_dt) >= start_dt,
            func.date(Sales.sale_dt) <= end_dt,
        ).scalar()
        or 0
    )

    kpi = ManagementKpi(
        totalSales=float(total_sales),
        totalMargin=None,
        totalCustomers=None,
        avgBasketSize=None,
        inventoryTurnover=None,
    )

    charts = {}
    return ManagementDashboardResponse(kpi=kpi, charts=charts)


