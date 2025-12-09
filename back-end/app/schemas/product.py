from datetime import date
from typing import List, Optional

from pydantic import BaseModel


class ProductListItem(BaseModel):
    prodId: str
    prodNm: Optional[str] = None
    season: Optional[str] = None
    prodLine: Optional[str] = None
    category: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None
    originPrice: Optional[float] = None
    regDt: Optional[date] = None
    outDt: Optional[date] = None
    saleState: Optional[str] = None


class ProductListResponse(BaseModel):
    items: List[ProductListItem]


