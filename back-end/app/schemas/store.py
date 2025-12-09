from typing import List

from pydantic import BaseModel


class StoreListItem(BaseModel):
    storeId: str
    storeNm: str | None = None
    gu: str | None = None
    dong: str | None = None
    managerNm: str | None = None
    address: str | None = None
    lat: float | None = None
    lng: float | None = None
    storeGeojson: dict | None = None


class StoreListResponse(BaseModel):
    items: List[StoreListItem]




