from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel


class CustomerListItem(BaseModel):
    customerId: str
    gender: Optional[str] = None
    ageGroup: Optional[str] = None
    region: Optional[str] = None
    signupDt: date
    signupChannel: Optional[str] = None
    lastPurchaseDt: Optional[date] = None
    totalAmount: int
    purchaseCount: int
    segment: Optional[str] = None


class CustomerListResponse(BaseModel):
    items: List[CustomerListItem]
    total: int
    page: int
    pageSize: int


class CustomerDetailPurchaseItem(BaseModel):
    saleDt: datetime
    saleId: str
    amount: int
    products: Optional[str] = None


class CustomerDetailRfm(BaseModel):
    recency: int  # 최근 구매까지의 일수 기반 점수 (1~5)
    frequency: int  # 구매 횟수 기반 점수 (1~10)
    monetary: int  # 총 구매액 (원)


class CustomerDetailResponse(BaseModel):
    customerId: str
    gender: Optional[str] = None
    ageGroup: Optional[str] = None
    region: Optional[str] = None
    signupDt: date
    signupChannel: Optional[str] = None
    segment: Optional[str] = None
    totalAmount: int
    purchaseCount: int
    lastPurchaseDt: Optional[date] = None
    rfm: CustomerDetailRfm
    recentPurchases: List[CustomerDetailPurchaseItem] = []


