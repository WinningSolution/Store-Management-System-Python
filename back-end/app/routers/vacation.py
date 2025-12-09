from datetime import date
from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Vacation, Employee
from app.schemas.vacation import VacationItem, VacationListResponse

router = APIRouter(tags=["vacation"])


@router.get("/vacations", response_model=VacationListResponse)
def list_vacations(
    store_id: Optional[str] = Query(None),
    emp_id: Optional[str] = Query(None),
    start_dt: Optional[date] = Query(None),
    end_dt: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    vacation_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    휴가 신청 목록 조회
    - VACATION 테이블을 기준으로 요청 단위(직원+유형+요청일)로 집계
    """
    q = (
        db.query(
            Vacation.store_id.label("store_id"),
            Vacation.emp_id.label("emp_id"),
            Employee.emp_nm.label("emp_nm"),
            func.min(Vacation.vacation_dt).label("start_dt"),
            func.max(Vacation.vacation_dt).label("end_dt"),
            Vacation.vacation_type.label("vacation_type"),
            Vacation.status.label("status"),
            func.min(Vacation.requested_at).label("applied_at"),
            func.max(Vacation.approved_at).label("approved_at"),
            func.count(Vacation.vacation_dt).label("days"),
        )
        .join(
            Employee,
            (Employee.store_id == Vacation.store_id)
            & (Employee.emp_id == Vacation.emp_id),
        )
    )

    if store_id:
        q = q.filter(Vacation.store_id == store_id)
    if emp_id:
        q = q.filter(Vacation.emp_id == emp_id)
    if start_dt:
        q = q.filter(Vacation.vacation_dt >= start_dt)
    if end_dt:
        q = q.filter(Vacation.vacation_dt <= end_dt)
    if status:
        q = q.filter(Vacation.status == status)
    if vacation_type:
        q = q.filter(Vacation.vacation_type == vacation_type)

    q = q.group_by(
        Vacation.store_id,
        Vacation.emp_id,
        Employee.emp_nm,
        Vacation.vacation_type,
        Vacation.status,
    ).order_by(func.min(Vacation.vacation_dt))

    rows = q.all()

    items: List[VacationItem] = []
    for r in rows:
        items.append(
            VacationItem(
                storeId=r.store_id,
                empId=r.emp_id,
                empNm=r.emp_nm,
                startDate=r.start_dt,
                endDate=r.end_dt,
                vacationType=r.vacation_type,
                status=r.status,
                appliedDate=r.applied_at,
                approvedDate=r.approved_at,
                days=r.days,
            )
        )

    return VacationListResponse(items=items)












