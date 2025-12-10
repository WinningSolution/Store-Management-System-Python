from typing import List, Optional
from datetime import date, datetime

from pydantic import BaseModel


class InventoryItem(BaseModel):
    sku: str
    prodNm: str
    prodLine: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None
    price: float
    location: str
    stock: int
    status: str  # 정상 / 임박 / 긴급 / 품절
    recommended: int
    last7: int
    last90: int
    aiSuggested: int


class InventoryListResponse(BaseModel):
    items: List[InventoryItem]
    total: int


class InventoryStockHistoryPoint(BaseModel):
    date: str
    stock: int


class InventoryChangeLogItem(BaseModel):
    date: datetime
    moveType: str
    qty: int
    beforeQty: int
    afterQty: int
    location: Optional[str] = None


class InventoryDetailItem(BaseModel):
    sku: str
    prodNm: str
    category: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None
    price: float
    location: str
    stock: int
    status: str
    recommended: int
    avgSalesPerDay: float
    daysUntilOut: Optional[int]
    aiSuggested: Optional[int] = None
    aiExplain: Optional[str] = None


class InventoryFlowSummary(BaseModel):
    prevCarry: int
    hqInbound: int
    customerReturn: int
    sold: int
    current: int


class InventoryDetailResponse(BaseModel):
    item: InventoryDetailItem
    stockHistory: List[InventoryStockHistoryPoint]
    changeLog: List[InventoryChangeLogItem]
    flowReferenceDate: date
    flow: InventoryFlowSummary


class DeadStockSummary(BaseModel):
    totalAmount: float
    totalRatio: float
    skuCount: int
    avgDaysWithoutSale: float
    # 전월 비교용 기준 값
    prevTotalAmount: float
    prevTotalRatio: float
    prevSkuCount: int
    prevAvgDaysWithoutSale: float


class DeadStockStoreItem(BaseModel):
    storeId: str
    storeNm: Optional[str] = None
    amount: float


class DeadStockCategoryItem(BaseModel):
    category: Optional[str] = None
    amount: float
    ratio: float


class DeadStockTrendPoint(BaseModel):
    month: str
    ratio: float
    amount: float


class DeadStockListItem(BaseModel):
    prodId: str
    prodNm: str
    storeId: str
    storeNm: Optional[str] = None
    stock: int
    daysWithoutSale: int
    lastSaleDate: Optional[date] = None
    amount: float
    category: Optional[str] = None


class DeadStockMonitorResponse(BaseModel):
    summary: DeadStockSummary
    stores: List[DeadStockStoreItem]
    categories: List[DeadStockCategoryItem]
    trend: List[DeadStockTrendPoint]
    items: List[DeadStockListItem]


class DeadStockItemsResponse(BaseModel):
    items: List[DeadStockListItem]
    total: int


