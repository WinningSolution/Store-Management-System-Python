from datetime import datetime, date
from typing import List, Optional

from pydantic import BaseModel


class SalesListItem(BaseModel):
    saleId: str
    saleDt: datetime
    storeId: str
    # 선택적으로 매장명도 내려줄 수 있도록 필드 추가 (현재는 사용하지 않지만 확장용)
    storeNm: Optional[str] = None
    prodId: str
    prodNm: Optional[str]
    prodLine: Optional[str]
    category: Optional[str]
    qty: int
    unitPrice: int
    amount: int
    payType: Optional[str]
    channel: Optional[str]


class SalesListResponse(BaseModel):
    items: List[SalesListItem]
    total: int
    page: int
    pageSize: int


class DailySalesItem(BaseModel):
    date: date
    totalAmount: int


class LineSalesItem(BaseModel):
    line: Optional[str]
    totalAmount: int


class PaymentSalesItem(BaseModel):
    payType: Optional[str]
    totalAmount: int


class SalesSummaryResponse(BaseModel):
    daily: List[DailySalesItem]
    byLine: List[LineSalesItem]
    byPayment: List[PaymentSalesItem]


class SalesDetailItem(BaseModel):
    prodId: str
    prodNm: Optional[str]
    qty: int
    unitPrice: int
    amount: int
    prodLine: Optional[str]
    category: Optional[str]


class SalesDetailHeader(BaseModel):
    saleId: str
    saleDt: datetime
    storeId: str
    storeNm: Optional[str]
    customerId: Optional[str]
    payType: Optional[str]
    channel: Optional[str]
    totalAmount: int
    totalQty: int


class SalesDetailResponse(BaseModel):
    header: SalesDetailHeader
    items: List[SalesDetailItem]


class TrendComparePoint(BaseModel):
    label: str
    base: int
    compare: int


class PeriodSummaryItem(BaseModel):
    label: str
    sales: int
    orders: int
    aov: float


class LineCompareItem(BaseModel):
    line: Optional[str]
    baseAmount: int
    compareAmount: int


class SalesTrendCompareResponse(BaseModel):
    basePeriodLabel: str
    comparePeriodLabel: str
    trend: List[TrendComparePoint]
    summary: List[PeriodSummaryItem]
    lineCompare: List[LineCompareItem]


class CategoryCompareItem(BaseModel):
    category: Optional[str]
    baseAmount: int
    compareAmount: int


class SalesCategoryCompareResponse(BaseModel):
    basePeriodLabel: str
    comparePeriodLabel: str
    categories: List[CategoryCompareItem]


class StoreRankingItem(BaseModel):
    storeId: str
    storeNm: Optional[str]
    sales: int


class StoreRankingResponse(BaseModel):
    items: List[StoreRankingItem]
    totalSalesAll: int


class StoreCategoryHeatmapItem(BaseModel):
    storeId: str
    storeNm: Optional[str]
    category: Optional[str]
    sales: int


class StoreCategoryHeatmapResponse(BaseModel):
    items: List[StoreCategoryHeatmapItem]


class StoreTopProductMonthlyItem(BaseModel):
    month: str
    amount: int


class StoreTopProductItem(BaseModel):
    rank: int
    prodId: str
    prodNm: Optional[str]
    sales: int
    qty: int
    share: float
    stock: int
    monthly: List[StoreTopProductMonthlyItem]


class StoreTopProductsResponse(BaseModel):
    items: List[StoreTopProductItem]


class CategoryTopProductItem(BaseModel):
    rank: int
    prodId: str
    prodNm: Optional[str]
    category: Optional[str]
    sales: int
    qty: int
    share: float


class CategoryTopProductsResponse(BaseModel):
    items: List[CategoryTopProductItem]


class CategoryTrendItem(BaseModel):
    month: int  # 1~12
    category: Optional[str]
    sales: int


class CategoryTrendResponse(BaseModel):
    items: List[CategoryTrendItem]


class LineTrendItem(BaseModel):
    month: int  # 1~12
    line: Optional[str]
    sales: int


class LineTrendResponse(BaseModel):
    items: List[LineTrendItem]


class LineTopProductItem(BaseModel):
    rank: int
    prodId: str
    prodNm: Optional[str]
    line: Optional[str]
    sales: int
    qty: int
    share: float


class LineTopProductsResponse(BaseModel):
    items: List[LineTopProductItem]


class DiscountEventItem(BaseModel):
    eventId: int
    eventNm: str
    eventType: Optional[str]
    startDt: datetime
    endDt: datetime


class DiscountEventsResponse(BaseModel):
    items: List[DiscountEventItem]


class DiscountSummary(BaseModel):
    totalSales: int          # 기준 기간 전체 매출
    totalOrders: int         # 기준 기간 전체 거래 수
    eventSales: int          # 선택 이벤트 매출
    eventOrders: int         # 선택 이벤트 거래 수
    eventSalesShare: float   # 이벤트 매출 비중 (%)


class DiscountTopProductItem(BaseModel):
    rank: int
    prodId: str
    prodNm: Optional[str]
    category: Optional[str]
    line: Optional[str]
    sales: int
    qty: int
    share: float


class DiscountTopProductsResponse(BaseModel):
    items: List[DiscountTopProductItem]


