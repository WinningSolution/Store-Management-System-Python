from typing import List

from pydantic import BaseModel


class StoreListItem(BaseModel):
    storeId: str
    storeNm: str | None = None


class StoreListResponse(BaseModel):
    items: List[StoreListItem]




