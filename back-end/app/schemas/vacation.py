from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel


class VacationItem(BaseModel):
    storeId: str
    empId: str
    empNm: str
    startDate: date
    endDate: date
    vacationType: str
    status: str
    appliedDate: datetime
    approvedDate: Optional[datetime] = None
    days: Decimal


class VacationListResponse(BaseModel):
    items: List[VacationItem]












