from datetime import date, datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Attend, Employee, ScheduleResult, ScheduleIngredient
from app.models.sales import Sales
from app.schemas.schedule import (
    ScheduleCalendarResponse,
    ScheduleCalendarItem,
    ScheduleUploadResult,
    DemandForecastResponse,
    DemandHeatmapItem,
    DemandPeakItem,
    AutoSchedulingRequest,
    AutoSchedulingResult,
    ScheduleResultResponse,
    ScheduleResultItem,
    ScheduleIngredientItem,
    ScheduleIngredientListResponse,
    ScheduleIngredientSaveRequest,
)

router = APIRouter(tags=["schedule"])


@router.get("/schedules", response_model=ScheduleCalendarResponse)
def get_schedule_calendar(
    store_id: str = Query(...),
    start_date: date = Query(...),
    end_date: date = Query(...),
    emp_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    근무 스케줄 캘린더 조회
    """
    query = (
        db.query(Attend, Employee.emp_nm)
        .join(Employee, (Employee.store_id == Attend.store_id) & (Employee.emp_id == Attend.emp_id))
        .filter(
            Attend.store_id == store_id,
            Attend.work_dt >= start_date,
            Attend.work_dt <= end_date,
        )
    )
    if emp_id:
        query = query.filter(Attend.emp_id == emp_id)

    rows = query.all()
    items: List[ScheduleCalendarItem] = []
    for att, emp_nm in rows:
        items.append(
            ScheduleCalendarItem(
                storeId=att.store_id,
                empId=att.emp_id,
                empNm=emp_nm,
                workDt=att.work_dt,
                shiftStartPlan=att.shift_start_plan,
                shiftEndPlan=att.shift_end_plan,
                clockInTs=att.clock_in_ts,
                clockOutTs=att.clock_out_ts,
                lateFlag=att.late_flag,
                earlyFlag=att.early_flag,
            )
        )
    return ScheduleCalendarResponse(items=items)


@router.post("/schedules/upload", response_model=ScheduleUploadResult)
async def upload_schedule_csv(
    store_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    CSV 기반 근무 스케줄 등록 (skeleton)
    - 실제 CSV 파싱 로직은 추후 구현
    """
    content = (await file.read()).decode("utf-8").splitlines()
    total_rows = max(len(content) - 1, 0)  # 헤더 제외 가정
    success_rows = 0
    errors: List[dict] = []

    # TODO: CSV 파싱 및 ATTEND INSERT 로직 구현

    return ScheduleUploadResult(
        totalRows=total_rows,
        successRows=success_rows,
        errorRows=len(errors),
        errors=errors,
    )


@router.get("/scheduling/demand", response_model=DemandForecastResponse)
def get_demand_forecast(
    store_id: str = Query(...),
    start_dt: date = Query(...),
    end_dt: date = Query(...),
    db: Session = Depends(get_db),
):
    """
    피크 타임·수요 예측 (최소 구현)
    - SALES 테이블을 기준으로 일자/시간대별 매출 합계를 집계
    - requiredStaff 는 매출액을 단순 비율로 환산 (예: 50만원당 1명)
    """
    # SALES에서 집계 (UTC 기준, 더미 데이터는 로컬과 크게 차이 없다고 가정)
    q = (
        db.query(
            func.date(Sales.sale_dt).label("dt"),
            func.date_format(Sales.sale_dt, "%H").label("hh"),
            func.sum(Sales.unit_price * Sales.qty).label("sales_amt"),
        )
        .filter(Sales.store_id == store_id)
        .filter(Sales.sale_dt >= datetime.combine(start_dt, datetime.min.time()))
        .filter(Sales.sale_dt <= datetime.combine(end_dt, datetime.max.time()))
        .filter(Sales.sale_status == "정상")
        .group_by("dt", "hh")
        .order_by("dt", "hh")
    )

    rows = q.all()

    heatmap: List[DemandHeatmapItem] = []
    # 요일 이름 매핑 (Mon..Sun)
    weekday_map = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    for r in rows:
        dt: date = r.dt
        hh: str = r.hh
        sales_amt: float = float(r.sales_amt or 0)

        # 간단한 방문객·필요인원 추정 로직 (예시)
        visitors = int(sales_amt / 20000)  # 2만원당 1명 방문객 가정
        required_staff = max(1, int(sales_amt / 500000))  # 50만원당 1명 필요

        heatmap.append(
            DemandHeatmapItem(
                dayname=weekday_map[dt.weekday()],
                hour=int(hh),
                salesAmt=sales_amt,
                trafficCnt=visitors,
                requiredStaff=required_staff,
            )
        )

    # 요약 피크 정보 (상위 5개 시간대)
    top = sorted(heatmap, key=lambda x: x.salesAmt, reverse=True)[:5]
    summary_peaks: List[DemandPeakItem] = []
    for item in top:
        # 날짜는 start_dt~end_dt 중 하나로 충분하므로, 여기서는 start_dt 사용
        summary_peaks.append(
            DemandPeakItem(
                date=start_dt,
                hour=item.hour,
                salesAmt=item.salesAmt,
                requiredStaff=item.requiredStaff,
            )
        )

    return DemandForecastResponse(heatmap=heatmap, summaryPeaks=summary_peaks)


@router.post("/scheduling/auto-generate", response_model=AutoSchedulingResult)
def auto_generate_schedule(
    payload: AutoSchedulingRequest,
    db: Session = Depends(get_db),
):
    """
    자동 스케줄 생성 (최소 구현)
    - 요청된 weekStartDt 기준으로 SCHEDULE_RESULT 를 생성
    - 현재는 요일/근무타입별로 고정된 required_cnt 를 넣는 간단한 버전
    """
    week_start = payload.weekStartDt

    # 기존 결과 삭제
    db.query(ScheduleResult).filter(ScheduleResult.week_start_dt == week_start).delete()

    daynames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    work_types = ["오전", "오후"]

    for dn in daynames:
        for wt in work_types:
            # 간단한 예시: 평일/주말에 따라 필요 인원 차등
            if dn in ["Sat", "Sun"]:
                base_cnt = 4
            else:
                base_cnt = 3

            db.add(
                ScheduleResult(
                    week_start_dt=week_start,
                    dayname=dn,
                    work_type=wt,
                    required_cnt=base_cnt,
                )
            )

    db.commit()

    return AutoSchedulingResult(status="generated", conflicts=[])


@router.get("/scheduling/result", response_model=ScheduleResultResponse)
def get_schedule_result(
    store_id: str = Query(...),
    week_start_dt: date = Query(...),
    db: Session = Depends(get_db),
):
    """
    자동 스케줄 결과 조회
    - 현재는 SCHEDULE_RESULT 기준 최소 인원 정의만 반환, assignedEmpList 는 빈 리스트
    """
    rows = (
        db.query(ScheduleResult)
        .filter(ScheduleResult.week_start_dt == week_start_dt)
        .all()
    )
    items: List[ScheduleResultItem] = []
    for r in rows:
        items.append(
            ScheduleResultItem(
                weekStartDt=r.week_start_dt,
                dayname=r.dayname,
                workType=r.work_type,
                requiredCnt=r.required_cnt,
                assignedEmpList=[],
            )
        )

    return ScheduleResultResponse(items=items)


@router.get("/scheduling/ingredients", response_model=ScheduleIngredientListResponse)
def get_schedule_ingredients(
    emp_id: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    근무 가능 요일/시간대 조회 (SCHEDULE_INGREDIENT)
    """
    rows = (
        db.query(ScheduleIngredient)
        .filter(ScheduleIngredient.emp_id == emp_id)
        .all()
    )
    items: List[ScheduleIngredientItem] = []
    for r in rows:
        items.append(
            ScheduleIngredientItem(
                empId=r.emp_id,
                dayname=r.dayname,
                workType=r.work_type,
                status=r.status,
            )
        )
    return ScheduleIngredientListResponse(items=items)


@router.post("/scheduling/ingredients")
def save_schedule_ingredients(
    payload: ScheduleIngredientSaveRequest,
    db: Session = Depends(get_db),
):
    """
    근무 가능 요일/시간대 저장
    - 지정한 empId 에 대한 기존 레코드를 모두 삭제 후, 요청 본문 기준으로 재생성
    """
    # 기존 데이터 삭제
    db.query(ScheduleIngredient).filter(
        ScheduleIngredient.emp_id == payload.empId
    ).delete()

    # 새 데이터 삽입
    for item in payload.items:
        db.add(
            ScheduleIngredient(
                emp_id=payload.empId,
                dayname=item.dayname,
                work_type=item.workType,
                status=item.status,
            )
        )

    db.commit()
    return {"message": "근무 가능 요일/시간대가 저장되었습니다."}



