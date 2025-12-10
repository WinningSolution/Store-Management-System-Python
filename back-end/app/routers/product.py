from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.product import Product
from app.schemas.product import ProductListItem, ProductListResponse

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=ProductListResponse)
def list_products(
    season: Optional[str] = Query(None, description="시즌 필터 (예: SS24)"),
    prod_line: Optional[str] = Query(None, description="라인 필터 (남성/여성/키즈 등)"),
    category: Optional[str] = Query(None, description="카테고리 필터 (상의/하의 등)"),
    sale_state: Optional[str] = Query(None, description="판매 상태 (판매중/단종 등)"),
    db: Session = Depends(get_db),
):
    """
    상품 마스터 목록 조회
    - 간단한 필터(시즌/라인/카테고리/판매상태)만 지원
    """
    query = db.query(Product)

    if season:
        query = query.filter(Product.season == season)
    if prod_line:
        query = query.filter(Product.prod_line == prod_line)
    if category:
        query = query.filter(Product.category == category)
    if sale_state:
        query = query.filter(Product.sale_state == sale_state)

    rows: List[Product] = query.order_by(Product.prod_id).all()

    items = [
        ProductListItem(
            prodId=row.prod_id,
            prodNm=row.prod_nm,
            season=row.season,
            prodLine=row.prod_line,
            category=row.category,
            color=row.color,
            size=row.size,
            originPrice=float(row.origin_price) if row.origin_price is not None else None,
            regDt=row.reg_dt,
            outDt=row.out_dt,
            saleState=row.sale_state,
        )
        for row in rows
    ]

    return ProductListResponse(items=items)




