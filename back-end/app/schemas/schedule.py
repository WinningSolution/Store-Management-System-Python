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


class WeeklyDemandPoint(BaseModel):
    date: date
    dayname: str
    predictedSales: float
    actualSales: float


class DemandForecastResponse(BaseModel):
    heatmap: List[DemandHeatmapItem]
    summaryPeaks: List[DemandPeakItem]
    # 오늘(또는 기준일) 기준 예측 KPI
    expectedSalesToday: float
    expectedVisitorsToday: int
    peakHour: Optional[int] = None
    peakRequiredStaff: Optional[int] = None
    weeklySummary: List[WeeklyDemandPoint] = []
    weeklyAccuracy: Optional[float] = None


class AutoSchedulingRequest(BaseModel):
    storeId: str
    weekStartDt: date
    strategy: Optional[str] = "full"


class AutoSchedulingResult(BaseModel):
    status: str
    conflicts: List[dict]


class ApplyScheduleRequest(BaseModel):
    storeId: str
    weekStartDt: date


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

