from datetime import date, datetime, time, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import (
    Attend,
    Employee,
    ScheduleResult,
    ScheduleIngredient,
    Vacation,
)
from app.models.sales import Sales
from app.schemas.schedule import (
    ScheduleCalendarResponse,
    ScheduleCalendarItem,
    ScheduleUploadResult,
    DemandForecastResponse,
    DemandHeatmapItem,
    DemandPeakItem,
    WeeklyDemandPoint,
    AutoSchedulingRequest,
    AutoSchedulingResult,
    ApplyScheduleRequest,
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
    target_dt: date = Query(..., description="예측 기준일 (오늘에 해당하는 날짜)"),
    history_days: int = Query(28, ge=7, le=90, description="과거 참조 일수 (기본 4주)"),
    db: Session = Depends(get_db),
):
    """
    피크 타임·수요 예측

    - SALES 테이블을 기준으로, 기준일 이전 history_days 동안의 데이터를 이용해
      시간대별 평균 매출/트래픽/필요 인원을 계산한다.
    - 방문객 수는 매출액을 2만원 객단가로 나눈 값으로 추정.
    - 필요 인원은 매출액을 50만원당 1명 기준으로 단순 환산.
    """
    history_start = target_dt - timedelta(days=history_days)

    # SALES에서 집계
    q = (
        db.query(
            func.date(Sales.sale_dt).label("dt"),
            func.date_format(Sales.sale_dt, "%H").label("hh"),
            func.sum(Sales.unit_price * Sales.qty).label("sales_amt"),
        )
        .filter(Sales.store_id == store_id)
        .filter(
            Sales.sale_dt
            >= datetime.combine(history_start, datetime.min.time())
        )
        .filter(
            Sales.sale_dt
            < datetime.combine(target_dt, datetime.min.time())
        )
        .filter(Sales.sale_status == "정상")
        .group_by("dt", "hh")
        .order_by("dt", "hh")
    )

    rows = q.all()

    heatmap: List[DemandHeatmapItem] = []
    # 요일 이름 매핑 (Mon..Sun)
    weekday_map = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    # 시간대별 매출 합계/일수 집계 (오늘 예측용)
    hour_sales_sum: dict[int, float] = {}
    hour_days: dict[int, set[date]] = {}
    # 날짜별 총 매출 (과거) -> 요일별 평균 매출 산출용
    daily_sales_history: dict[date, float] = {}

    for r in rows:
        dt_val: date = r.dt
        hh_str: str = r.hh
        hh_int = int(hh_str)
        sales_amt: float = float(r.sales_amt or 0)

        # 방문객·필요인원 추정
        visitors = int(sales_amt / 20000)  # 2만원당 1명 방문객 가정
        required_staff = max(1, int(sales_amt / 500000))  # 50만원당 1명 필요

        heatmap.append(
            DemandHeatmapItem(
                dayname=weekday_map[dt_val.weekday()],
                hour=hh_int,
                salesAmt=sales_amt,
                trafficCnt=visitors,
                requiredStaff=required_staff,
            )
        )

        # 시간대별 집계 (예측 KPI 계산용)
        hour_sales_sum[hh_int] = hour_sales_sum.get(hh_int, 0.0) + sales_amt
        if hh_int not in hour_days:
            hour_days[hh_int] = set()
        hour_days[hh_int].add(dt_val)

        # 날짜별 총 매출 (시간대 합산)
        daily_sales_history[dt_val] = daily_sales_history.get(dt_val, 0.0) + sales_amt

    # 오늘(기준일) 예측 KPI 계산
    expected_sales_today = 0.0
    expected_visitors_today = 0
    peak_hour: Optional[int] = None
    peak_required_staff = 0

    for hh, total_sales in hour_sales_sum.items():
        day_count = len(hour_days.get(hh, set())) or 1
        avg_sales = total_sales / day_count

        visitors = int(avg_sales / 20000)
        required_staff = max(1, int(avg_sales / 500000))

        expected_sales_today += avg_sales
        expected_visitors_today += visitors

        if required_staff > peak_required_staff:
            peak_required_staff = required_staff
            peak_hour = hh

    # 요약 피크 정보 (상위 5개 시간대, 과거 기준)
    top = sorted(heatmap, key=lambda x: x.salesAmt, reverse=True)[:5]
    summary_peaks: List[DemandPeakItem] = []
    for item in top:
        summary_peaks.append(
            DemandPeakItem(
                date=target_dt,
                hour=item.hour,
                salesAmt=item.salesAmt,
                requiredStaff=item.requiredStaff,
            )
        )

    # --- 주간 매출 예측 vs 실제 요약 ---
    # 1) 요일별 평균 일 매출 (과거 history 기간 기준)
    weekday_totals = {i: 0.0 for i in range(7)}
    weekday_counts = {i: 0 for i in range(7)}
    for d, amt in daily_sales_history.items():
        w = d.weekday()
        weekday_totals[w] += amt
        weekday_counts[w] += 1

    # 2) 대상 주차(월~일) 계산
    week_start = target_dt - timedelta(days=target_dt.weekday())  # 월요일
    week_end = week_start + timedelta(days=6)

    # 3) 실제 주간 매출: 대상 주차의 일자별 총 매출
    q_week = (
        db.query(
            func.date(Sales.sale_dt).label("dt"),
            func.sum(Sales.unit_price * Sales.qty).label("sales_amt"),
        )
        .filter(Sales.store_id == store_id)
        .filter(
            Sales.sale_dt
            >= datetime.combine(week_start, datetime.min.time())
        )
        .filter(
            Sales.sale_dt
            <= datetime.combine(week_end, datetime.max.time())
        )
        .filter(Sales.sale_status == "정상")
        .group_by("dt")
    )
    rows_week = q_week.all()
    actual_week_map: dict[date, float] = {}
    for r in rows_week:
        d: date = r.dt
        actual_week_map[d] = float(r.sales_amt or 0.0)

    # 4) 요약 포인트 및 예측 정확도 계산
    weekly_summary: List[WeeklyDemandPoint] = []
    acc_sum = 0.0
    acc_cnt = 0

    for i in range(7):
        cur_date = week_start + timedelta(days=i)
        w = cur_date.weekday()
        # 과거 데이터가 없으면 0으로 둔다.
        if weekday_counts[w] > 0:
            predicted = weekday_totals[w] / weekday_counts[w]
        else:
            predicted = 0.0
        actual = actual_week_map.get(cur_date, 0.0)

        weekly_summary.append(
            WeeklyDemandPoint(
                date=cur_date,
                dayname=weekday_map[w],
                predictedSales=predicted,
                actualSales=actual,
            )
        )

        if actual > 0:
            # 단순 일별 정확도: max(0, 1 - |예측-실제| / 실제)
            day_acc = 1.0 - abs(predicted - actual) / actual
            if day_acc < 0:
                day_acc = 0.0
            if day_acc > 1:
                day_acc = 1.0
            acc_sum += day_acc
            acc_cnt += 1

    weekly_accuracy: Optional[float] = None
    if acc_cnt > 0:
        weekly_accuracy = round((acc_sum / acc_cnt) * 100.0, 1)

    return DemandForecastResponse(
        heatmap=heatmap,
        summaryPeaks=summary_peaks,
        expectedSalesToday=expected_sales_today,
        expectedVisitorsToday=expected_visitors_today,
        peakHour=peak_hour,
        peakRequiredStaff=peak_required_staff,
        weeklySummary=weekly_summary,
        weeklyAccuracy=weekly_accuracy,
    )


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

    - SCHEDULE_RESULT 에 정의된 요일/근무타입별 필요 인원(required_cnt)을 기준으로
      직원 선호도(SCHEDULE_INGREDIENT), 휴가(VACATION)를 반영하여
      간단한 그리디 알고리즘으로 직원 배치를 수행한다.
    """
    rows = (
        db.query(ScheduleResult)
        .filter(ScheduleResult.week_start_dt == week_start_dt)
        .all()
    )

    # 해당 점포의 재직 직원 목록
    employees: List[Employee] = (
        db.query(Employee)
        .filter(Employee.store_id == store_id, Employee.work_status == "재직")
        .all()
    )
    emp_map = {e.emp_id: e for e in employees}
    emp_ids = [e.emp_id for e in employees]

    # 근무 가능 요일/시간대 (선호도)
    ing_rows: List[ScheduleIngredient] = []
    if emp_ids:
        ing_rows = (
            db.query(ScheduleIngredient)
            .filter(ScheduleIngredient.emp_id.in_(emp_ids))
            .all()
        )
    availability: dict[str, set[tuple[str, str]]] = {}
    for ing in ing_rows:
        if ing.status != 1:
            continue
        key = ing.emp_id
        if key not in availability:
            availability[key] = set()
        availability[key].add((ing.dayname, ing.work_type))

    # 휴가 정보: 해당 주차에 휴가가 있는 직원은 해당 일자에 배치하지 않음
    week_end_dt = week_start_dt + timedelta(days=6)
    vac_rows: List[Vacation] = (
        db.query(Vacation)
        .filter(
            Vacation.store_id == store_id,
            Vacation.vacation_dt >= week_start_dt,
            Vacation.vacation_dt <= week_end_dt,
            Vacation.status == "승인",
        )
        .all()
    )
    vacation_set: set[tuple[str, date]] = set()
    for v in vac_rows:
        vacation_set.add((v.emp_id, v.vacation_dt))

    # 요일명 → 날짜 매핑
    # week_start_dt 는 월요일을 기준으로 입력된다고 가정
    dayname_to_offset = {
        "Mon": 0,
        "Tue": 1,
        "Wed": 2,
        "Thu": 3,
        "Fri": 4,
        "Sat": 5,
        "Sun": 6,
    }

    # 공정 배치를 위한 직원별 통계
    assigned_counts: dict[str, int] = {emp.emp_id: 0 for emp in employees}
    assigned_dates: dict[str, set[date]] = {emp.emp_id: set() for emp in employees}

    items: List[ScheduleResultItem] = []

    # 요일 / 근무타입별로 직원 배치
    for r in rows:
        # 실제 날짜 계산
        offset = dayname_to_offset.get(r.dayname, 0)
        work_date = week_start_dt + timedelta(days=offset)

        # 이 슬롯에 배치 가능한 직원 후보 필터링
        candidates: List[Employee] = []
        for emp in employees:
            # 선호 요일/시간대
            if (r.dayname, r.work_type) not in availability.get(
                emp.emp_id, set()
            ):
                continue
            # 해당 일자 휴가 여부
            if (emp.emp_id, work_date) in vacation_set:
                continue
            # 동일 일자에 이미 다른 근무타입으로 배치된 경우 제외
            if work_date in assigned_dates.get(emp.emp_id, set()):
                continue
            candidates.append(emp)

        # 점장/관리자 우선 배치(grade 에 '점장' 이 포함된 직원)
        def is_manager(e: Employee) -> bool:
            return bool(e.grade and "점장" in e.grade)

        candidates.sort(
            key=lambda e: (
                0 if is_manager(e) else 1,  # 관리자 우선
                assigned_counts.get(e.emp_id, 0),  # 적게 배치된 직원 우선
                e.emp_id,
            )
        )

        assigned_list: List[dict] = []
        for cand in candidates[: r.required_cnt]:
            assigned_list.append(
                {
                    "empId": cand.emp_id,
                    "empNm": cand.emp_nm,
                    "grade": cand.grade,
                }
            )
            assigned_counts[cand.emp_id] = assigned_counts.get(cand.emp_id, 0) + 1
            assigned_dates.setdefault(cand.emp_id, set()).add(work_date)

        items.append(
            ScheduleResultItem(
                weekStartDt=r.week_start_dt,
                dayname=r.dayname,
                workType=r.work_type,
                requiredCnt=r.required_cnt,
                assignedEmpList=assigned_list,
            )
        )

    return ScheduleResultResponse(items=items)


@router.post("/scheduling/apply", response_model=AutoSchedulingResult)
def apply_schedule(
    payload: ApplyScheduleRequest,
    db: Session = Depends(get_db),
):
    """
    자동 스케줄 결과를 ATTEND 테이블에 반영한다.

    - /scheduling/result 와 동일한 로직으로 직원 배치를 계산한 뒤
      해당 점포 + 주차(weekStartDt ~ weekStartDt+6)에 대해 ATTEND 를 재생성한다.
    """
    store_id = payload.storeId
    week_start_dt = payload.weekStartDt

    # 1) 현재 설정(선호도/휴가/필요 인원)에 따른 배정 결과 계산 재사용
    schedule_result = get_schedule_result(
        store_id=store_id,
        week_start_dt=week_start_dt,
        db=db,
    )
    items = schedule_result.items

    # 2) 기존 ATTEND 삭제 (해당 점포 + 해당 주차)
    week_end_dt = week_start_dt + timedelta(days=6)
    db.query(Attend).filter(
        Attend.store_id == store_id,
        Attend.work_dt >= week_start_dt,
        Attend.work_dt <= week_end_dt,
    ).delete()

    # 요일명 → 날짜 오프셋
    dayname_to_offset = {
        "Mon": 0,
        "Tue": 1,
        "Wed": 2,
        "Thu": 3,
        "Fri": 4,
        "Sat": 5,
        "Sun": 6,
    }

    # 근무타입별 기본 근무 시간대 매핑 (예시)
    def get_shift_times(work_type: str) -> tuple[time, time]:
        if work_type == "오전":
            # 오픈 근무 (09-18)
            return time(9, 0), time(18, 0)
        # 오후
        # 미들/클로징 혼합을 단순화하여 12-21로 가정
        return time(12, 0), time(21, 0)

    # 3) 새 ATTEND 생성
    for slot in items:
        offset = dayname_to_offset.get(slot.dayname, 0)
        work_dt = week_start_dt + timedelta(days=offset)
        start_t, end_t = get_shift_times(slot.workType)

        for emp_info in slot.assignedEmpList:
            emp_id = emp_info.get("empId")
            if not emp_id:
                continue

            db.add(
                Attend(
                    store_id=store_id,
                    emp_id=emp_id,
                    work_dt=work_dt,
                    shift_start_plan=start_t,
                    shift_end_plan=end_t,
                )
            )

    db.commit()

    return AutoSchedulingResult(status="applied", conflicts=[])


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



