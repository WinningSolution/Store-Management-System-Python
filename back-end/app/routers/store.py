from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.store import Store
from app.schemas.store import StoreListResponse, StoreListItem


router = APIRouter(prefix="/stores", tags=["stores"])


@router.get("", response_model=StoreListResponse)
def list_stores(db: Session = Depends(get_db)):
    rows = db.query(Store).order_by(Store.store_id).all()
    items = [
        StoreListItem(storeId=row.store_id, storeNm=row.store_nm)
        for row in rows
    ]
    return StoreListResponse(items=items)




