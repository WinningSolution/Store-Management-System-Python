from datetime import date, datetime, time
from typing import List, Optional

from pydantic import BaseModel


class ScheduleCalendarItem(BaseModel):
    storeId: str
    empId: str
    empNm: Optional[str] = None
    workDt: date
    shiftStartPlan: Optional[time] = None
    shiftEndPlan: Optional[time] = None
    clockInTs: Optional[datetime] = None
    clockOutTs: Optional[datetime] = None
    lateFlag: Optional[str] = None
    earlyFlag: Optional[str] = None


class ScheduleCalendarResponse(BaseModel):
    items: List[ScheduleCalendarItem]


class ScheduleUploadResult(BaseModel):
    totalRows: int
    successRows: int
    errorRows: int
    errors: List[dict]


class DemandHeatmapItem(BaseModel):
    dayname: str
    hour: int
    salesAmt: float
    trafficCnt: int
    requiredStaff: int


class DemandPeakItem(BaseModel):
    date: date
    hour: int
    salesAmt: float
    requiredStaff: int


class DemandForecastResponse(BaseModel):
    heatmap: List[DemandHeatmapItem]
    summaryPeaks: List[DemandPeakItem]


class AutoSchedulingRequest(BaseModel):
    storeId: str
    weekStartDt: date
    strategy: Optional[str] = "full"


class AutoSchedulingResult(BaseModel):
    status: str
    conflicts: List[dict]


class ScheduleResultItem(BaseModel):
    weekStartDt: date
    dayname: str
    workType: str
    requiredCnt: int
    assignedEmpList: List[dict]


class ScheduleResultResponse(BaseModel):
    items: List[ScheduleResultItem]


class ScheduleIngredientItem(BaseModel):
    empId: str
    dayname: str  # Mon..Sun
    workType: str  # 오전 / 오후
    status: int    # 1 가능, 0 불가


class ScheduleIngredientListResponse(BaseModel):
    items: List[ScheduleIngredientItem]


class ScheduleIngredientSaveRequest(BaseModel):
    empId: str
    items: List[ScheduleIngredientItem]

