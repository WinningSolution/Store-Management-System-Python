from datetime import date, datetime, time
from typing import List, Optional

from pydantic import BaseModel, Field


class EmployeeListItem(BaseModel):
    storeId: str
    storeNm: Optional[str] = None
    empId: str
    empNm: str
    grade: Optional[str] = None
    workStatus: str
    schStatus: str
    hireDt: date


class EmployeeListResponse(BaseModel):
    items: List[EmployeeListItem]
    total: int
    page: int
    pageSize: int


class AttendanceLogItem(BaseModel):
    workDt: date
    shiftStartPlan: Optional[time] = None
    shiftEndPlan: Optional[time] = None
    clockInTs: Optional[datetime] = None
    clockOutTs: Optional[datetime] = None
    lateFlag: Optional[str] = None
    earlyFlag: Optional[str] = None


class VacationItem(BaseModel):
    vacationDt: date
    vacationType: str
    status: str
    requestedAt: datetime
    approvedAt: Optional[datetime] = None
    canceledAt: Optional[datetime] = None
    remainDays: Optional[float] = None


class ScheduleIngredientItem(BaseModel):
    dayname: str
    workType: str
    status: int


class ScheduleResultSummaryItem(BaseModel):
    weekStartDt: date
    dayname: str
    workType: str
    assigned: bool = Field(
        ..., description="해당 슬롯에 이 직원이 배치되었는지 여부 (추후 확장용)"
    )


class EmployeeBasic(BaseModel):
    storeId: str
    empId: str
    empNm: str
    grade: Optional[str] = None
    workStatus: str
    schStatus: str
    hireDt: date


class AttendanceSummary(BaseModel):
    month: str
    workDays: int
    lateCount: int
    earlyLeaveCount: int


class EmployeeDetailResponse(BaseModel):
    basic: EmployeeBasic
    attendanceSummary: AttendanceSummary
    recentAttendanceLogs: List[AttendanceLogItem]
    vacations: List[VacationItem]
    scheduleIngredient: List[ScheduleIngredientItem]
    scheduleResultSummary: List[ScheduleResultSummaryItem]


class CreateEmployeeRequest(BaseModel):
    storeId: str
    empId: str
    empNm: str
    grade: Optional[str] = None
    hireDt: date
    phone: Optional[str] = None  # 별도 컬럼 미정, 추후 확장용
    schStatus: str = "무관"


class UpdateEmployeeRequest(BaseModel):
    empNm: Optional[str] = None
    phone: Optional[str] = None
    grade: Optional[str] = None
    schStatus: Optional[str] = None


class TerminateEmployeeRequest(BaseModel):
    storeId: str
    terminateDt: date












