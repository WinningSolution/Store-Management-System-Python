from datetime import date, datetime, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, extract
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
    TodaySalesPoint,
    WeekPeakPoint,
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

    # 전주(지난 주간) 매출 계산 후 주간 전주 대비 증감률(%)
    prev_week_start = week_start - timedelta(days=7)
    prev_week_end = week_end - timedelta(days=7)
    prev_week_sales_q = db.query(func.sum(Sales.qty * Sales.unit_price))
    if store_id:
        prev_week_sales_q = prev_week_sales_q.filter(Sales.store_id == store_id)
    prev_week_sales = (
        prev_week_sales_q.filter(
            func.date(Sales.sale_dt) >= prev_week_start,
            func.date(Sales.sale_dt) <= prev_week_end,
        ).scalar()
        or 0
    )

    # Decimal → float 로 변환 후 증감률 계산 (Decimal * float 오류 방지)
    week_sales_val = float(week_sales or 0)
    prev_week_sales_val = float(prev_week_sales or 0)
    week_wow: Optional[float] = None
    if prev_week_sales_val > 0:
        week_wow = float(
            (week_sales_val - prev_week_sales_val) / prev_week_sales_val * 100.0
        )

    sales_summary = SalesSummary(
        todaySales=float(today_sales),
        weekSales=float(week_sales),
        weekSalesYoY=None,
        weekSalesWoW=week_wow,
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

    # 주요 알림 구성 (재고/근태/휴가 요약)
    notifications: List[NotificationItem] = []

    now_dt = datetime.utcnow()

    # 1) 재고 긴급/임박 알림 (상위 3개만)
    for alert in alerts[:3]:
        if alert.stockStatus == "품절":
            title = f"재고 품절: {alert.prodNm}"
            message = f"{alert.storeId} - {alert.prodNm} 재고가 0개입니다."
        else:
            title = f"재고 임박: {alert.prodNm}"
            message = f"{alert.storeId} - {alert.prodNm} 재고 {alert.totalQty}개 남음"
        notifications.append(
            NotificationItem(
                id=f"inv-{alert.storeId}-{alert.prodId}",
                type="inventory",
                title=title,
                message=message,
                createdAt=now_dt,
            )
        )

    # 2) 미출근 직원 알림
    not_attended = [att for att in today_attendance if att.status == "미출근"]
    if not_attended:
        cnt = len(not_attended)
        sample = not_attended[0]
        title = "미출근 직원 알림"
        message = f"{today} 기준 미출근 {cnt}명 (예: {sample.empNm})"
        notifications.append(
            NotificationItem(
                id=f"att-{today.isoformat()}",
                type="attendance",
                title=title,
                message=message,
                createdAt=now_dt,
            )
        )

    # 3) 휴가 직원 알림
    if vacation_today:
        cnt = len(vacation_today)
        sample_vac = vacation_today[0]
        title = "오늘 휴가 직원"
        message = f"{today} 휴가자 {cnt}명 (예: {sample_vac.empNm})"
        notifications.append(
            NotificationItem(
                id=f"vac-{today.isoformat()}",
                type="vacation",
                title=title,
                message=message,
                createdAt=now_dt,
            )
        )

    # 오늘 매출 시간대별 시리즈 (실제 매출 기준)
    sales_time_query = db.query(
        extract("hour", Sales.sale_dt).label("hour"),
        func.sum(Sales.qty * Sales.unit_price).label("amount"),
    ).filter(func.date(Sales.sale_dt) == today)
    if store_id:
        sales_time_query = sales_time_query.filter(Sales.store_id == store_id)
    sales_time_query = sales_time_query.group_by("hour").order_by("hour")

    today_sales_series: List[TodaySalesPoint] = []
    for row in sales_time_query.all():
        hour_int = int(row.hour)
        time_label = f"{hour_int:02d}:00"
        today_sales_series.append(
            TodaySalesPoint(timeLabel=time_label, sales=float(row.amount or 0.0))
        )

    # 주간 요일별 매출 시리즈는 현재 메인 대시보드에서 사용하지 않으므로 빈 배열로 반환
    week_peak_series: List[WeekPeakPoint] = []

    return MainDashboardResponse(
        salesSummary=sales_summary,
        inventoryAlerts=alerts,
        todayAttendance=today_attendance,
        vacationToday=vacation_today,
        notifications=notifications,
        todaySalesSeries=today_sales_series,
        weekPeakSeries=week_peak_series,
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


