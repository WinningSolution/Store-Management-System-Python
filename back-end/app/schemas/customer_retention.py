from typing import List
from pydantic import BaseModel


class RetentionTrendItem(BaseModel):
    month: str
    segment: str
    retentionRate: float


class RetentionTrendResponse(BaseModel):
    items: List[RetentionTrendItem]


class CohortRetentionItem(BaseModel):
    startMonth: str
    period: int
    retention: float


class CohortRetentionResponse(BaseModel):
    items: List[CohortRetentionItem]




