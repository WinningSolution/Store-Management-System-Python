from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee, Attend, Vacation, ScheduleIngredient, ScheduleResult
from app.models.store import Store
from app.schemas.employee import (
    EmployeeListResponse,
    EmployeeListItem,
    EmployeeDetailResponse,
    EmployeeBasic,
    AttendanceSummary,
    AttendanceLogItem,
    VacationItem,
    ScheduleIngredientItem,
    ScheduleResultSummaryItem,
    CreateEmployeeRequest,
    UpdateEmployeeRequest,
    TerminateEmployeeRequest,
)

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("", response_model=EmployeeListResponse)
def list_employees(
    store_id: Optional[str] = Query(None),
    work_status: Optional[str] = Query(None),
    grade: Optional[str] = Query(None),
    keyword: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    직원 목록 조회 API
    - 필터: 지점, 근무상태, 직급, 검색어(이름/EMP_ID)
    - 페이지네이션 지원
    """
    query = (
        db.query(Employee, Store.store_nm)
        .join(Store, Store.store_id == Employee.store_id, isouter=True)
    )

    if store_id:
        query = query.filter(Employee.store_id == store_id)
    if work_status:
        query = query.filter(Employee.work_status == work_status)
    if grade:
        query = query.filter(Employee.grade == grade)
    if keyword:
        like = f"%{keyword}%"
        query = query.filter(
            (Employee.emp_nm.ilike(like)) | (Employee.emp_id.ilike(like))
        )

    total = query.count()
    offset = (page - 1) * page_size
    rows = query.order_by(Employee.store_id, Employee.emp_id).offset(offset).limit(page_size).all()

    items: List[EmployeeListItem] = []
    for emp, store_nm in rows:
        items.append(
            EmployeeListItem(
                storeId=emp.store_id,
                storeNm=store_nm,
                empId=emp.emp_id,
                empNm=emp.emp_nm,
                grade=emp.grade,
                workStatus=emp.work_status,
                schStatus=emp.sch_status,
                hireDt=emp.hire_dt,
            )
        )

    return EmployeeListResponse(items=items, total=total, page=page, pageSize=page_size)


@router.get("/{emp_id}", response_model=EmployeeDetailResponse)
def get_employee_detail(
    emp_id: str,
    store_id: str,
    month: Optional[str] = Query(None, description="YYYY-MM 형식, 기본은 현재 월"),
    db: Session = Depends(get_db),
):
    """
    직원 상세 조회 API
    - EMP 기본 정보
    - 근태 요약 / 최근 근태 로그
    - 휴가 내역
    - 근무 가능 요일/시간대
    - 스케줄 결과 요약 (현재는 skeleton 형태)
    """
    emp: Optional[Employee] = (
        db.query(Employee).filter(Employee.store_id == store_id, Employee.emp_id == emp_id).first()
    )
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    store: Optional[Store] = db.query(Store).filter(Store.store_id == store_id).first()

    basic = EmployeeBasic(
        storeId=emp.store_id,
        empId=emp.emp_id,
        empNm=emp.emp_nm,
        grade=emp.grade,
        workStatus=emp.work_status,
        schStatus=emp.sch_status,
        hireDt=emp.hire_dt,
    )

    # 근태 요약: 간단히 이번 달/전체 기준 count 로직 skeleton
    # 상세 집계는 추후 ETL이나 뷰로 대체 가능
    attend_logs = (
        db.query(Attend)
        .filter(Attend.store_id == store_id, Attend.emp_id == emp_id)
        .order_by(Attend.work_dt.desc())
        .limit(30)
        .all()
    )

    work_days = len(attend_logs)
    late_count = len([a for a in attend_logs if a.late_flag == "Y"])
    early_leave_count = len([a for a in attend_logs if a.early_flag == "Y"])

    attendance_summary = AttendanceSummary(
        month=month or "",
        workDays=work_days,
        lateCount=late_count,
        earlyLeaveCount=early_leave_count,
    )

    recent_attendance_logs: List[AttendanceLogItem] = []
    for a in attend_logs:
        # SHIFT_START_PLAN / SHIFT_END_PLAN 컬럼은 이미 TIME 타입이므로
        # datetime.time 객체 그대로 넘기면 FastAPI/Pydantic 이 직렬화해 준다.
        recent_attendance_logs.append(
            AttendanceLogItem(
                workDt=a.work_dt,
                shiftStartPlan=a.shift_start_plan,
                shiftEndPlan=a.shift_end_plan,
                clockInTs=a.clock_in_ts,
                clockOutTs=a.clock_out_ts,
                lateFlag=a.late_flag,
                earlyFlag=a.early_flag,
            )
        )

    vacations_raw = (
        db.query(Vacation)
        .filter(Vacation.store_id == store_id, Vacation.emp_id == emp_id)
        .order_by(Vacation.vacation_dt.desc())
        .limit(30)
        .all()
    )
    vacations: List[VacationItem] = []
    for v in vacations_raw:
        vacations.append(
            VacationItem(
                vacationDt=v.vacation_dt,
                vacationType=v.vacation_type,
                status=v.status,
                requestedAt=v.requested_at,
                approvedAt=v.approved_at,
                canceledAt=v.canceled_at,
                remainDays=float(v.remain_days) if v.remain_days is not None else None,
            )
        )

    ingredients_raw = (
        db.query(ScheduleIngredient)
        .filter(ScheduleIngredient.emp_id == emp_id)
        .all()
    )
    schedule_ingredient: List[ScheduleIngredientItem] = []
    for ing in ingredients_raw:
        schedule_ingredient.append(
            ScheduleIngredientItem(
                dayname=ing.dayname,
                workType=ing.work_type,
                status=int(ing.status),
            )
        )

    # 스케줄 결과 요약은 현재 skeleton: 해당 직원이 근무 가능한 슬롯 기준 dummy false
    schedule_result_summary: List[ScheduleResultSummaryItem] = []
    results_raw = db.query(ScheduleResult).all()
    for r in results_raw:
        schedule_result_summary.append(
            ScheduleResultSummaryItem(
                weekStartDt=r.week_start_dt,
                dayname=r.dayname,
                workType=r.work_type,
                assigned=False,
            )
        )

    return EmployeeDetailResponse(
        basic=basic,
        attendanceSummary=attendance_summary,
        recentAttendanceLogs=recent_attendance_logs,
        vacations=vacations,
        scheduleIngredient=schedule_ingredient,
        scheduleResultSummary=schedule_result_summary,
    )


@router.post("", status_code=201)
def create_employee(payload: CreateEmployeeRequest, db: Session = Depends(get_db)):
    exists = (
        db.query(Employee)
        .filter(Employee.store_id == payload.storeId, Employee.emp_id == payload.empId)
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="직원ID가 이미 존재합니다.")

    emp = Employee(
        store_id=payload.storeId,
        emp_id=payload.empId,
        emp_nm=payload.empNm,
        grade=payload.grade,
        hire_dt=payload.hireDt,
        work_status="재직",
        sch_status=payload.schStatus,
    )
    db.add(emp)
    db.commit()
    return {"message": "직원 등록이 완료되었습니다."}


@router.put("/{emp_id}")
def update_employee(
    emp_id: str,
    payload: UpdateEmployeeRequest,
    store_id: str,
    db: Session = Depends(get_db),
):
    emp = (
        db.query(Employee)
        .filter(Employee.store_id == store_id, Employee.emp_id == emp_id)
        .first()
    )
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    if payload.empNm is not None:
        emp.emp_nm = payload.empNm
    if payload.grade is not None:
        emp.grade = payload.grade
    if payload.schStatus is not None:
        emp.sch_status = payload.schStatus

    db.commit()
    return {"message": "직원 정보가 수정되었습니다."}


@router.post("/{emp_id}/terminate")
def terminate_employee(
    emp_id: str,
    payload: TerminateEmployeeRequest,
    db: Session = Depends(get_db),
):
    emp = (
        db.query(Employee)
        .filter(Employee.store_id == payload.storeId, Employee.emp_id == emp_id)
        .first()
    )
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    emp.work_status = "퇴사"
    db.commit()
    return {"message": "퇴사 처리되었습니다."}












