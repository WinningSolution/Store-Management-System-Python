from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel


class SalesSummary(BaseModel):
    todaySales: float
    weekSales: float
    weekSalesYoY: Optional[float] = None
    weekSalesWoW: Optional[float] = None


class InventoryAlertItem(BaseModel):
    prodId: str
    prodNm: str
    storeId: str
    stockStatus: str
    totalQty: int


class TodayAttendanceItem(BaseModel):
    empId: str
    empNm: str
    grade: Optional[str] = None
    storeId: str
    clockInTs: Optional[datetime] = None
    clockOutTs: Optional[datetime] = None
    status: str


class VacationTodayItem(BaseModel):
    empId: str
    empNm: str
    vacationType: str
    vacationDt: date


class NotificationItem(BaseModel):
    id: str
    type: str
    title: str
    message: str
    createdAt: datetime


class MainDashboardResponse(BaseModel):
    salesSummary: SalesSummary
    inventoryAlerts: List[InventoryAlertItem]
    todayAttendance: List[TodayAttendanceItem]
    vacationToday: List[VacationTodayItem]
    notifications: List[NotificationItem]


class ManagementKpi(BaseModel):
    totalSales: float
    totalMargin: Optional[float] = None
    totalCustomers: Optional[int] = None
    avgBasketSize: Optional[float] = None
    inventoryTurnover: Optional[float] = None


class ManagementDashboardResponse(BaseModel):
    kpi: ManagementKpi
    charts: dict












