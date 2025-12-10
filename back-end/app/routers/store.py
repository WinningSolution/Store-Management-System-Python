from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.store import Store
from app.models.employee import Employee
from app.schemas.store import StoreListResponse, StoreListItem


router = APIRouter(prefix="/stores", tags=["stores"])


@router.get("", response_model=StoreListResponse)
def list_stores(db: Session = Depends(get_db)):
    # 점장(grade = '점장') 정보를 store_id 기준으로 집계
    manager_subq = (
        db.query(
            Employee.store_id.label("store_id"),
            func.max(Employee.emp_nm).label("manager_nm"),
        )
        .filter(Employee.grade == "점장")
        .group_by(Employee.store_id)
        .subquery()
    )

    rows = (
        db.query(
            Store,
            manager_subq.c.manager_nm,
        )
        .outerjoin(manager_subq, Store.store_id == manager_subq.c.store_id)
        .order_by(Store.store_id)
        .all()
    )
    items = []
    for store_row, manager_nm in rows:
        items.append(
            StoreListItem(
                storeId=store_row.store_id,
                storeNm=store_row.store_nm,
                gu=store_row.gu,
                dong=store_row.dong,
                managerNm=manager_nm,
                # 주소는 현재 GU/DONG 기준의 행정동 수준 텍스트만 구성
                address=" ".join([p for p in [store_row.gu, store_row.dong] if p]),
                lat=float(store_row.lat) if store_row.lat is not None else None,
                lng=float(store_row.lng) if store_row.lng is not None else None,
                storeGeojson=store_row.store_geojson,
            )
        )
    return StoreListResponse(items=items)




