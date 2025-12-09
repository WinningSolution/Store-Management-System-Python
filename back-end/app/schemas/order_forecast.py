from datetime import date
from typing import List, Optional

from pydantic import BaseModel


class OrderForecastSummary(BaseModel):
    baseDate: date
    storeId: Optional[str] = None
    urgentCount: int
    totalRecommendQty: int
    coveragePct: float


class OrderForecastSummaryResponse(BaseModel):
    summary: OrderForecastSummary


class OrderForecastItem(BaseModel):
    storeId: str
    prodId: str
    prodNm: Optional[str] = None
    baseDate: date
    pred7dQty: float
    currStock: int
    recommendQty: int
    priority: str
    explainText: Optional[str] = None


class OrderForecastItemsResponse(BaseModel):
    items: List[OrderForecastItem]
    total: int



