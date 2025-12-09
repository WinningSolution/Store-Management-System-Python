from typing import List, Optional
from datetime import date

from pydantic import BaseModel


class RegionSegmentMetricsItem(BaseModel):
    region: str
    segment: str
    customerCount: int
    purchaseCount: int
    totalAmount: int
    totalQty: int
    avgAmountPerTxn: float
    avgAmountPerCustomer: float
    avgPurchaseCount: float
    avgQtyPerCustomer: float


class RegionSegmentMetricsResponse(BaseModel):
    items: List[RegionSegmentMetricsItem]


class RegionSegmentTrendItem(BaseModel):
    month: str  # YYYY-MM
    region: str
    segment: str
    sales: int
    orders: int
    customers: int
    qty: int


class RegionSegmentTrendResponse(BaseModel):
    items: List[RegionSegmentTrendItem]


class RegionSegmentTopCategoryItem(BaseModel):
    region: str
    segment: str
    rank: int
    category: str
    sales: int
    share: float


class RegionSegmentTopCategoriesResponse(BaseModel):
    items: List[RegionSegmentTopCategoryItem]


class RegionSegmentTopProductItem(BaseModel):
    region: str
    segment: str
    rank: int
    prodId: str
    prodNm: Optional[str]
    category: Optional[str]
    sales: int
    qty: int


class RegionSegmentTopProductsResponse(BaseModel):
    items: List[RegionSegmentTopProductItem]


class CustomerSegmentOptionsResponse(BaseModel):
    items: List[str]


class CustomerSegmentMasterItem(BaseModel):
    segmentId: str
    segmentName: str
    segmentType: str
    description: Optional[str] = None
    customerCount: int
    isActive: bool


class CustomerSegmentMasterResponse(BaseModel):
    items: List[CustomerSegmentMasterItem]


class CustomerSegmentLogItem(BaseModel):
    customerId: str
    customerName: Optional[str] = None
    fromSegment: Optional[str] = None
    toSegment: str
    changedDate: date
    reason: Optional[str] = None


class CustomerSegmentLogResponse(BaseModel):
    items: List[CustomerSegmentLogItem]
