from datetime import datetime, date, timedelta
from typing import Optional, Dict, List
import csv
import io
import calendar

from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.sales import Sales, Discount
from app.models.product import Product
from app.models.inventory import InventoryStatus
from app.models.store import Store
from app.schemas.sales import (
    SalesListResponse,
    SalesListItem,
    SalesSummaryResponse,
    DailySalesItem,
    LineSalesItem,
    PaymentSalesItem,
    SalesDetailResponse,
    SalesDetailHeader,
    SalesDetailItem,
    SalesTrendCompareResponse,
    TrendComparePoint,
    PeriodSummaryItem,
    LineCompareItem,
    SalesCategoryCompareResponse,
    CategoryCompareItem,
    StoreRankingResponse,
    StoreRankingItem,
    StoreCategoryHeatmapResponse,
    StoreCategoryHeatmapItem,
    StoreTopProductsResponse,
    StoreTopProductItem,
    StoreTopProductMonthlyItem,
    CategoryTopProductsResponse,
    CategoryTopProductItem,
    CategoryTrendResponse,
    CategoryTrendItem,
    LineTrendResponse,
    LineTrendItem,
    LineTopProductsResponse,
    LineTopProductItem,
    DiscountEventsResponse,
    DiscountEventItem,
    DiscountSummary,
    DiscountTopProductsResponse,
    DiscountTopProductItem,
)


router = APIRouter(prefix="/sales", tags=["sales"])


@router.get("", response_model=SalesListResponse)
def list_sales(
    store_id: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None, description="조회 시작일 (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="조회 종료일 (YYYY-MM-DD)"),
    category: Optional[str] = Query(None),
    pay_type: Optional[str] = Query(None),
    keyword: Optional[str] = Query(
        None, description="SALE_ID 또는 PROD_NM 일부 검색"
    ),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    판매 내역 리스트
    - 단순 필터 + 페이지네이션
    """
    query = (
        db.query(
            Sales.sale_id,
            Sales.sale_dt,
            Sales.store_id,
            Store.store_nm,
            Sales.prod_id,
            Sales.prod_nm,
            Product.prod_line,
            Product.category,
            Sales.qty,
            Sales.unit_price,
            (Sales.unit_price * Sales.qty).label("amount"),
            Sales.pay_type,
            Sales.channel,
        )
        .join(Product, Product.prod_id == Sales.prod_id, isouter=True)
        .join(Store, Store.store_id == Sales.store_id, isouter=True)
    )

    if store_id:
        query = query.filter(Sales.store_id == store_id)
    if date_from:
        query = query.filter(Sales.sale_dt >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        query = query.filter(Sales.sale_dt <= datetime.combine(date_to, datetime.max.time()))
    if category:
        query = query.filter(Product.category == category)
    if pay_type:
        query = query.filter(Sales.pay_type == pay_type)
    if keyword:
        like = f"%{keyword}%"
        query = query.filter(
            (Sales.sale_id.ilike(like)) | (Sales.prod_nm.ilike(like))
        )

    total = query.count()
    offset = (page - 1) * page_size
    rows = (
        query.order_by(Sales.sale_dt.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    items: list[SalesListItem] = []
    for (
        sale_id,
        sale_dt,
        store_id,
        store_nm,
        prod_id,
        prod_nm,
        prod_line,
        category,
        qty,
        unit_price,
        amount,
        pay_type,
        channel,
    ) in rows:
        items.append(
            SalesListItem(
                saleId=sale_id,
                saleDt=sale_dt,
                storeId=store_id,
                storeNm=store_nm,
                prodId=prod_id,
                prodNm=prod_nm,
                prodLine=prod_line,
                category=category,
                qty=qty,
                unitPrice=int(unit_price),
                amount=int(amount),
                payType=pay_type,
                channel=channel,
            )
        )

    return SalesListResponse(items=items, total=total, page=page, pageSize=page_size)


@router.get("/summary", response_model=SalesSummaryResponse)
def get_sales_summary(
    store_id: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None, description="조회 시작일 (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="조회 종료일 (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    """
    판매 요약 인사이트 3개
    1) 일자별 매출 추이
    2) 라인(또는 카테고리)별 매출 비중
    3) 결제수단별 매출 비중
    """

    base_filter = []
    if store_id:
        base_filter.append(Sales.store_id == store_id)
    if date_from:
        base_filter.append(Sales.sale_dt >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        base_filter.append(Sales.sale_dt <= datetime.combine(date_to, datetime.max.time()))

    # 1) 일자별 매출 추이
    daily_rows = (
        db.query(
            func.date(Sales.sale_dt).label("sales_date"),
            func.sum(Sales.unit_price * Sales.qty).label("total_amount"),
        )
        .filter(*base_filter)
        .group_by(func.date(Sales.sale_dt))
        .order_by(func.date(Sales.sale_dt))
        .all()
    )
    daily = [
        DailySalesItem(date=row.sales_date, totalAmount=int(row.total_amount or 0))
        for row in daily_rows
    ]

    # 2) 라인별 매출 비중 (PRODUCT.PROD_LINE 기준)
    line_rows = (
        db.query(
            Product.prod_line.label("line"),
            func.sum(Sales.unit_price * Sales.qty).label("total_amount"),
        )
        .join(Product, Product.prod_id == Sales.prod_id, isouter=True)
        .filter(*base_filter)
        .group_by(Product.prod_line)
        .all()
    )
    by_line = [
        LineSalesItem(line=row.line, totalAmount=int(row.total_amount or 0))
        for row in line_rows
    ]

    # 3) 결제수단별 매출 비중
    payment_rows = (
        db.query(
            Sales.pay_type.label("pay_type"),
            func.sum(Sales.unit_price * Sales.qty).label("total_amount"),
        )
        .filter(*base_filter)
        .group_by(Sales.pay_type)
        .all()
    )
    by_payment = [
        PaymentSalesItem(
            payType=row.pay_type, totalAmount=int(row.total_amount or 0)
        )
        for row in payment_rows
    ]

    return SalesSummaryResponse(daily=daily, byLine=by_line, byPayment=by_payment)


def _month_range_from_string(month_str: str, db: Session) -> tuple[date, date]:
    """YYYY-MM 형식에서 해당 월의 시작/종료 날짜를 계산. 값이 없으면 SALES 의 최대월 사용."""
    if month_str:
        try:
            year, month = map(int, month_str.split("-"))
        except ValueError:
            raise HTTPException(status_code=400, detail="base_month 형식은 YYYY-MM 이어야 합니다.")
    else:
        max_dt = db.query(func.max(Sales.sale_dt)).scalar()
        if not max_dt:
            raise HTTPException(status_code=400, detail="SALES 데이터가 없습니다.")
        year = max_dt.year
        month = max_dt.month

    start = date(year, month, 1)
    last_day = calendar.monthrange(year, month)[1]
    end = date(year, month, last_day)
    return start, end


def _shift_month(year: int, month: int, offset_months: int) -> tuple[int, int]:
    """연/월에서 offset_months 만큼 이동한 연/월 계산."""
    idx = (year * 12 + (month - 1)) + offset_months
    new_year = idx // 12
    new_month = idx % 12 + 1
    return new_year, new_month


@router.get("/trend-compare", response_model=SalesTrendCompareResponse)
def get_sales_trend_compare(
    base_month: Optional[str] = Query(
        None, description="기준 월 (YYYY-MM). 미지정 시 SALES 최대 월 기준"
    ),
    compare_mode: str = Query(
        "prev_year", description="'prev_year' 또는 'prev_month'"
    ),
    store_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    매출 추세 비교
    - 기준 월 vs 전년 동월 / 전월 동월의 매출 추세 및 요약, 라인별 매출 비교
    """
    # 1) 기준 기간 계산
    base_start, base_end = _month_range_from_string(base_month, db)
    base_year, base_mon = base_start.year, base_start.month

    # 2) 비교 기간 계산
    if compare_mode == "prev_year":
        cmp_year, cmp_mon = base_year - 1, base_mon
    elif compare_mode == "prev_month":
        cmp_year, cmp_mon = _shift_month(base_year, base_mon, -1)
    else:
        raise HTTPException(status_code=400, detail="compare_mode 는 prev_year / prev_month 만 지원합니다.")

    cmp_start = date(cmp_year, cmp_mon, 1)
    cmp_last_day = calendar.monthrange(cmp_year, cmp_mon)[1]
    cmp_end = date(cmp_year, cmp_mon, cmp_last_day)

    base_filter = [Sales.sale_dt >= datetime.combine(base_start, datetime.min.time()),
                   Sales.sale_dt <= datetime.combine(base_end, datetime.max.time())]
    cmp_filter = [Sales.sale_dt >= datetime.combine(cmp_start, datetime.min.time()),
                  Sales.sale_dt <= datetime.combine(cmp_end, datetime.max.time())]
    if store_id:
        base_filter.append(Sales.store_id == store_id)
        cmp_filter.append(Sales.store_id == store_id)

    # 3) 일별 추세 (기준/비교)
    base_daily_rows = (
        db.query(
            func.date(Sales.sale_dt).label("sales_date"),
            func.sum(Sales.unit_price * Sales.qty).label("amount"),
        )
        .filter(*base_filter)
        .group_by(func.date(Sales.sale_dt))
        .order_by(func.date(Sales.sale_dt))
        .all()
    )
    cmp_daily_rows = (
        db.query(
            func.date(Sales.sale_dt).label("sales_date"),
            func.sum(Sales.unit_price * Sales.qty).label("amount"),
        )
        .filter(*cmp_filter)
        .group_by(func.date(Sales.sale_dt))
        .order_by(func.date(Sales.sale_dt))
        .all()
    )

    base_by_day: Dict[int, int] = {
        row.sales_date.day: int(row.amount or 0) for row in base_daily_rows
    }
    cmp_by_day: Dict[int, int] = {
        row.sales_date.day: int(row.amount or 0) for row in cmp_daily_rows
    }

    days_in_base = calendar.monthrange(base_year, base_mon)[1]
    trend_points: list[TrendComparePoint] = []
    for d in range(1, days_in_base + 1):
        trend_points.append(
            TrendComparePoint(
                label=f"{d}일",
                base=base_by_day.get(d, 0),
                compare=cmp_by_day.get(d, 0),
            )
        )

    # 4) 기간 요약 (총 매출 / 건수 / 객단가)
    def _build_summary(
        label: str, filters: list
    ) -> PeriodSummaryItem:
        q = db.query(
            func.sum(Sales.unit_price * Sales.qty).label("sales"),
            func.count(func.distinct(Sales.sale_id)).label("orders"),
        ).filter(*filters)
        row = q.one()
        sales_val = int(row.sales or 0)
        orders_val = int(row.orders or 0)
        aov_val = float(sales_val / orders_val) if orders_val > 0 else 0.0
        return PeriodSummaryItem(
            label=label,
            sales=sales_val,
            orders=orders_val,
            aov=aov_val,
        )

    base_label = f"{base_year}-{base_mon:02d}"
    cmp_label = f"{cmp_year}-{cmp_mon:02d}"

    summary_base = _build_summary("이번 기간", base_filter)
    summary_cmp_prev = _build_summary(
        "비교 기간", cmp_filter
    )

    summary_items = [
        PeriodSummaryItem(
            label=f"{cmp_year}년 {cmp_mon}월",
            sales=summary_cmp_prev.sales,
            orders=summary_cmp_prev.orders,
            aov=summary_cmp_prev.aov,
        ),
        PeriodSummaryItem(
            label=f"{base_year}년 {base_mon}월",
            sales=summary_base.sales,
            orders=summary_base.orders,
            aov=summary_base.aov,
        ),
    ]

    # 5) 라인별 매출 비교
    def _line_agg(filters: list) -> Dict[Optional[str], int]:
        rows = (
            db.query(
                Product.prod_line.label("line"),
                func.sum(Sales.unit_price * Sales.qty).label("amount"),
            )
            .join(Product, Product.prod_id == Sales.prod_id, isouter=True)
            .filter(*filters)
            .group_by(Product.prod_line)
            .all()
        )
        return {row.line: int(row.amount or 0) for row in rows}

    base_line = _line_agg(base_filter)
    cmp_line = _line_agg(cmp_filter)

    all_lines = sorted({k for k in base_line.keys()} | {k for k in cmp_line.keys()} if (base_line or cmp_line) else [])

    line_items: list[LineCompareItem] = []
    for line in all_lines:
        line_items.append(
            LineCompareItem(
                line=line,
                baseAmount=base_line.get(line, 0),
                compareAmount=cmp_line.get(line, 0),
            )
        )

    return SalesTrendCompareResponse(
        basePeriodLabel=base_label,
        comparePeriodLabel=cmp_label,
        trend=trend_points,
        summary=summary_items,
        lineCompare=line_items,
    )


@router.get("/category-compare", response_model=SalesCategoryCompareResponse)
def get_category_compare(
    base_month: Optional[str] = Query(
        None, description="기준 월 (YYYY-MM). 미지정 시 SALES 최대 월 기준"
    ),
    compare_mode: str = Query(
        "prev_year", description="'prev_year' 또는 'prev_month'"
    ),
    store_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    카테고리별 매출 비중 비교
    - 기준 월 vs 전년 동월 / 전월 동월의 카테고리별 매출 합계를 비교
    """
    base_start, base_end = _month_range_from_string(base_month, db)
    base_year, base_mon = base_start.year, base_start.month

    if compare_mode == "prev_year":
        cmp_year, cmp_mon = base_year - 1, base_mon
    elif compare_mode == "prev_month":
        cmp_year, cmp_mon = _shift_month(base_year, base_mon, -1)
    else:
        raise HTTPException(
            status_code=400,
            detail="compare_mode 는 prev_year / prev_month 만 지원합니다.",
        )

    cmp_start = date(cmp_year, cmp_mon, 1)
    cmp_last_day = calendar.monthrange(cmp_year, cmp_mon)[1]
    cmp_end = date(cmp_year, cmp_mon, cmp_last_day)

    base_filter = [
        Sales.sale_dt >= datetime.combine(base_start, datetime.min.time()),
        Sales.sale_dt <= datetime.combine(base_end, datetime.max.time()),
    ]
    cmp_filter = [
        Sales.sale_dt >= datetime.combine(cmp_start, datetime.min.time()),
        Sales.sale_dt <= datetime.combine(cmp_end, datetime.max.time()),
    ]
    if store_id:
        base_filter.append(Sales.store_id == store_id)
        cmp_filter.append(Sales.store_id == store_id)

    def _category_agg(filters: list) -> Dict[Optional[str], int]:
        rows = (
            db.query(
                Product.category.label("category"),
                func.sum(Sales.unit_price * Sales.qty).label("amount"),
            )
            .join(Product, Product.prod_id == Sales.prod_id, isouter=True)
            .filter(*filters)
            .group_by(Product.category)
            .all()
        )
        return {row.category: int(row.amount or 0) for row in rows}

    base_cat = _category_agg(base_filter)
    cmp_cat = _category_agg(cmp_filter)

    all_categories = sorted(
        {k for k in base_cat.keys()} | {k for k in cmp_cat.keys()}
        if (base_cat or cmp_cat)
        else []
    )

    items: list[CategoryCompareItem] = []
    for cat in all_categories:
        items.append(
            CategoryCompareItem(
                category=cat,
                baseAmount=base_cat.get(cat, 0),
                compareAmount=cmp_cat.get(cat, 0),
            )
        )

    base_label = f"{base_year}-{base_mon:02d}"
    cmp_label = f"{cmp_year}-{cmp_mon:02d}"

    return SalesCategoryCompareResponse(
        basePeriodLabel=base_label,
        comparePeriodLabel=cmp_label,
        categories=items,
    )


@router.get("/store-ranking", response_model=StoreRankingResponse)
def get_store_ranking(
    period: str = Query(
        "recent", description="'recent'(최근 1년) 또는 'past'(그 이전 1년)"
    ),
    top_n: int = Query(30, ge=1, le=200),
    base_month: Optional[str] = Query(
        None, description="기준 연월 (YYYY-MM). 미지정 시 최신 매출 기준"
    ),
    db: Session = Depends(get_db),
):
    """
    점포별 매출 랭킹
    - base_month 가 지정된 경우: 해당 월 한 달 기준 매출 랭킹
    - base_month 가 없는 경우:
        - recent: SALES 의 최대일자를 기준으로 과거 365일
        - past: 최근 1년 이전의 365일
    """
    max_dt: datetime | None = db.query(func.max(Sales.sale_dt)).scalar()
    if not max_dt:
        raise HTTPException(status_code=400, detail="SALES 데이터가 없습니다.")

    # 1) base_month 가 지정된 경우: 해당 월 한 달 기준으로 조회 (기준 기간 매출 랭킹)
    if base_month:
        start, end = _month_range_from_string(base_month, db)
    else:
        # 2) base_month 가 없는 경우: 기존처럼 최근 1년 / 과거 1년 기준
        recent_end = max_dt.date()
        recent_start = recent_end - timedelta(days=365)

        past_end = recent_start - timedelta(days=1)
        past_start = past_end - timedelta(days=365)

        if period == "recent":
            start, end = recent_start, recent_end
        elif period == "past":
            start, end = past_start, past_end
        else:
            raise HTTPException(
                status_code=400, detail="period 는 recent 또는 past 여야 합니다."
            )

    filters = [
        Sales.sale_dt >= datetime.combine(start, datetime.min.time()),
        Sales.sale_dt <= datetime.combine(end, datetime.max.time()),
    ]

    rows = (
        db.query(
            Sales.store_id,
            Store.store_nm,
            func.sum(Sales.unit_price * Sales.qty).label("sales"),
        )
        .join(Store, Store.store_id == Sales.store_id, isouter=True)
        .filter(*filters)
        .group_by(Sales.store_id, Store.store_nm)
        .order_by(func.sum(Sales.unit_price * Sales.qty).desc())
        .limit(top_n)
        .all()
    )

    # 전체 점포 매출 합계 (구간 비중 계산용)
    total_sales_all = (
        db.query(func.sum(Sales.unit_price * Sales.qty))
        .filter(*filters)
        .scalar()
    ) or 0

    items = [
        StoreRankingItem(
            storeId=row.store_id,
            storeNm=row.store_nm,
            sales=int(row.sales or 0),
        )
        for row in rows
    ]
    return StoreRankingResponse(items=items, totalSalesAll=int(total_sales_all))


@router.get("/store-category-heatmap", response_model=StoreCategoryHeatmapResponse)
def get_store_category_heatmap(
    period: str = Query(
        "recent", description="'recent'(최근 1년) 또는 'past'(그 이전 1년)"
    ),
    store_id: Optional[list[str]] = Query(
        None, description="조회 대상 점포 ID 리스트 (여러 개 가능)"
    ),
    base_month: Optional[str] = Query(
        None, description="기준 연월 (YYYY-MM). 미지정 시 최신 매출 기준"
    ),
    db: Session = Depends(get_db),
):
    """
    점포별 카테고리별 매출 히트맵
    - base_month 가 지정된 경우: 해당 월 한 달 기준
    - base_month 가 없는 경우:
        - period 에 따라 최근 1년 / 과거 1년 범위 내에서
    - 지정한 점포 ID 들에 대한 카테고리별 매출 합계를 반환
    """
    max_dt: datetime | None = db.query(func.max(Sales.sale_dt)).scalar()
    if not max_dt:
        raise HTTPException(status_code=400, detail="SALES 데이터가 없습니다.")

    # 1) base_month 가 지정된 경우: 해당 월 한 달 기준 (점포별 매출 랭킹과 동일한 기준)
    if base_month:
        start, end = _month_range_from_string(base_month, db)
    else:
        # 2) base_month 가 없는 경우: 기존처럼 최근 1년 / 과거 1년 기준
        recent_end = max_dt.date()
        recent_start = recent_end - timedelta(days=365)

        past_end = recent_start - timedelta(days=1)
        past_start = past_end - timedelta(days=365)

        if period == "recent":
            start, end = recent_start, recent_end
        elif period == "past":
            start, end = past_start, past_end
        else:
            raise HTTPException(
                status_code=400, detail="period 는 recent 또는 past 여야 합니다."
            )

    filters = [
        Sales.sale_dt >= datetime.combine(start, datetime.min.time()),
        Sales.sale_dt <= datetime.combine(end, datetime.max.time()),
    ]
    if store_id:
        filters.append(Sales.store_id.in_(store_id))

    rows = (
        db.query(
            Sales.store_id,
            Store.store_nm,
            Product.category,
            func.sum(Sales.unit_price * Sales.qty).label("sales"),
        )
        .join(Store, Store.store_id == Sales.store_id, isouter=True)
        .join(Product, Product.prod_id == Sales.prod_id, isouter=True)
        .filter(*filters)
        .group_by(Sales.store_id, Store.store_nm, Product.category)
        .all()
    )

    items = [
        StoreCategoryHeatmapItem(
            storeId=row.store_id,
            storeNm=row.store_nm,
            category=row.category,
            sales=int(row.sales or 0),
        )
        for row in rows
    ]

    return StoreCategoryHeatmapResponse(items=items)


@router.get("/category-top-products", response_model=CategoryTopProductsResponse)
def get_category_top_products(
    period: str = Query(
        "recent", description="'recent'(최근 1년) 또는 'past'(그 이전 1년)"
    ),
    top_n: int = Query(30, ge=1, le=200),
    base_month: Optional[str] = Query(
        None, description="기준 연월 (YYYY-MM). 미지정 시 최신 매출 기준"
    ),
    store_id: Optional[str] = Query(
        None, description="조회 대상 점포 ID (지정 시 해당 점포 기준으로 집계)"
    ),
    db: Session = Depends(get_db),
):
    """
    카테고리별 TOP 상품
    - base_month 가 지정된 경우: 해당 월 "당월" 기준 매출 TOP N 상품
    - base_month 가 없고 store_id 만 있는 경우: 최근 1년 / 과거 1년 기준 (기존 동작 유지)
    - store_id 가 없는 경우: 전체 매장 통합 매출 기준
    """
    max_dt: datetime | None = db.query(func.max(Sales.sale_dt)).scalar()
    if not max_dt:
        raise HTTPException(status_code=400, detail="SALES 데이터가 없습니다.")

    # 1) base_month 가 있으면: 해당 월 한 달만 집계
    if base_month:
        start, end = _month_range_from_string(base_month, db)
    else:
        # 2) base_month 가 없으면: 기존처럼 최근 1년 / 과거 1년 구간
        base_end = max_dt.date()

        recent_end = base_end
        recent_start = recent_end - timedelta(days=365)

        past_end = recent_start - timedelta(days=1)
        past_start = past_end - timedelta(days=365)

        if period == "recent":
            start, end = recent_start, recent_end
        elif period == "past":
            start, end = past_start, past_end
        else:
            raise HTTPException(
                status_code=400, detail="period 는 recent 또는 past 여야 합니다."
            )

    base_filters = [
        Sales.sale_dt >= datetime.combine(start, datetime.min.time()),
        Sales.sale_dt <= datetime.combine(end, datetime.max.time()),
    ]
    if store_id:
        base_filters.append(Sales.store_id == store_id)

    # 전체 매출 합계 (구성비 계산용) – 선택한 점포가 있으면 해당 점포 기준
    total_sales = (
        db.query(func.sum(Sales.unit_price * Sales.qty))
        .filter(*base_filters)
        .scalar()
    )
    if not total_sales or total_sales <= 0:
        return CategoryTopProductsResponse(items=[])

    # TOP N 상품 집계
    product_rows = (
        db.query(
            Sales.prod_id,
            Product.prod_nm,
            Product.category,
            func.sum(Sales.unit_price * Sales.qty).label("sales"),
            func.sum(Sales.qty).label("qty"),
        )
        .join(Product, Product.prod_id == Sales.prod_id, isouter=True)
        .filter(*base_filters)
        .group_by(Sales.prod_id, Product.prod_nm, Product.category)
        .order_by(func.sum(Sales.unit_price * Sales.qty).desc())
        .limit(top_n)
        .all()
    )

    items: List[CategoryTopProductItem] = []
    for idx, row in enumerate(product_rows, start=1):
        sales_val = int(row.sales or 0)
        qty_val = int(row.qty or 0)
        share = float(sales_val) / float(total_sales) * 100.0 if total_sales else 0.0

        items.append(
            CategoryTopProductItem(
                rank=idx,
                prodId=row.prod_id,
                prodNm=row.prod_nm,
                category=row.category,
                sales=sales_val,
                qty=qty_val,
                share=round(share, 1),
            )
        )

    return CategoryTopProductsResponse(items=items)


@router.get("/category-trend", response_model=CategoryTrendResponse)
def get_category_trend(
    period: str = Query(
        "recent", description="'recent'(최근 1년) 또는 'past'(그 이전 1년)"
    ),
    base_month: Optional[str] = Query(
        None, description="기준 연월 (YYYY-MM). 미지정 시 최신 매출 기준"
    ),
    store_id: Optional[str] = Query(
        None, description="조회 대상 점포 ID (지정 시 해당 점포 기준으로 집계)"
    ),
    db: Session = Depends(get_db),
):
    """
    카테고리별 매출 추이 (연도별 1~12월)
    - 최근 1년: SALES 최대일자의 연도 기준
    - 과거 1년: 그 이전 연도
    - month: 1~12, category: PRODUCT.CATEGORY
    """
    max_dt: datetime | None = db.query(func.max(Sales.sale_dt)).scalar()
    if not max_dt:
        raise HTTPException(status_code=400, detail="SALES 데이터가 없습니다.")

    if base_month:
        try:
            year, month = map(int, base_month.split("-"))
        except Exception:
            raise HTTPException(
                status_code=400, detail="base_month 는 'YYYY-MM' 형식이어야 합니다."
            )
    else:
        year = max_dt.year

    if period == "recent":
        target_year = year
    elif period == "past":
        target_year = year - 1
    else:
        raise HTTPException(
            status_code=400, detail="period 는 recent 또는 past 여야 합니다."
        )

    start = date(target_year, 1, 1)
    end = date(target_year, 12, 31)

    filters = [
        Sales.sale_dt >= datetime.combine(start, datetime.min.time()),
        Sales.sale_dt <= datetime.combine(end, datetime.max.time()),
    ]
    if store_id:
        filters.append(Sales.store_id == store_id)

    # MySQL: 월은 01~12 문자열로 추출 후 파이썬에서 int 변환
    month_expr = func.date_format(Sales.sale_dt, "%m")
    rows = (
        db.query(
            month_expr.label("m"),
            Product.category,
            func.sum(Sales.unit_price * Sales.qty).label("sales"),
        )
        .join(Product, Product.prod_id == Sales.prod_id, isouter=True)
        .filter(*filters)
        .group_by(month_expr, Product.category)
        .all()
    )

    items: List[CategoryTrendItem] = []
    for row in rows:
        try:
            m = int(row.m)
        except (TypeError, ValueError):
            continue
        items.append(
            CategoryTrendItem(
                month=m,
                category=row.category,
                sales=int(row.sales or 0),
            )
        )

    return CategoryTrendResponse(items=items)


@router.get("/line-trend", response_model=LineTrendResponse)
def get_line_trend(
    period: str = Query(
        "recent", description="'recent'(최근 1년) 또는 'past'(그 이전 1년)"
    ),
    base_month: Optional[str] = Query(
        None, description="기준 연월 (YYYY-MM). 미지정 시 최신 매출 기준"
    ),
    store_id: Optional[str] = Query(
        None, description="조회 대상 점포 ID (지정 시 해당 점포 기준으로 집계)"
    ),
    db: Session = Depends(get_db),
):
    """
    라인별(여/남/키즈) 매출 추이
    - 월별로 PRODUCT.PROD_LINE 기준 매출 합계를 집계
    - category-trend 와 동일한 로직으로 연도 범위를 결정
    """
    max_dt: datetime | None = db.query(func.max(Sales.sale_dt)).scalar()
    if not max_dt:
        raise HTTPException(status_code=400, detail="SALES 데이터가 없습니다.")

    if base_month:
        try:
            year, month = map(int, base_month.split("-"))
        except Exception:
            raise HTTPException(
                status_code=400, detail="base_month 는 'YYYY-MM' 형식이어야 합니다."
            )
    else:
        year = max_dt.year

    if period == "recent":
        target_year = year
    elif period == "past":
        target_year = year - 1
    else:
        raise HTTPException(
            status_code=400, detail="period 는 recent 또는 past 여야 합니다."
        )

    start = date(target_year, 1, 1)
    end = date(target_year, 12, 31)

    filters = [
        Sales.sale_dt >= datetime.combine(start, datetime.min.time()),
        Sales.sale_dt <= datetime.combine(end, datetime.max.time()),
    ]
    if store_id:
        filters.append(Sales.store_id == store_id)

    month_expr = func.date_format(Sales.sale_dt, "%m")
    rows = (
        db.query(
            month_expr.label("m"),
            Product.prod_line,
            func.sum(Sales.unit_price * Sales.qty).label("sales"),
        )
        .join(Product, Product.prod_id == Sales.prod_id, isouter=True)
        .filter(*filters)
        .group_by(month_expr, Product.prod_line)
        .all()
    )

    items: List[LineTrendItem] = []
    for row in rows:
        try:
            m = int(row.m)
        except (TypeError, ValueError):
            continue
        items.append(
            LineTrendItem(
                month=m,
                line=row.prod_line,
                sales=int(row.sales or 0),
            )
        )

    return LineTrendResponse(items=items)


@router.get("/discount-events", response_model=DiscountEventsResponse)
def list_discount_events(
    base_month: Optional[str] = Query(
        None, description="기준 월 (YYYY-MM). 미지정 시 SALES 최대 월 기준"
    ),
    active_only: bool = Query(
        True,
        description="기준 월 기준으로 이벤트 기간이 겹치는 이벤트만 조회할지 여부",
    ),
    db: Session = Depends(get_db),
):
    """
    할인/이벤트 마스터 목록
    - 기준 월과 겹치는 이벤트를 기본으로 반환
    """
    # 기준 월 한 달 범위를 계산
    month_start, month_end = _month_range_from_string(base_month, db)

    base_query = db.query(
        Discount.event_id,
        Discount.event_type,
        Discount.event_nm,
        func.min(Discount.str_dt).label("start_dt"),
        func.max(Discount.end_dt).label("end_dt"),
    )

    if active_only:
        # 이벤트 기간이 기준 월과 겹치는 것만
        base_query = base_query.filter(
            Discount.end_dt >= datetime.combine(month_start, datetime.min.time()),
            Discount.str_dt <= datetime.combine(month_end, datetime.max.time()),
        )

    rows = (
        base_query.group_by(
            Discount.event_id,
            Discount.event_type,
            Discount.event_nm,
        )
        .order_by(func.min(Discount.str_dt).asc())
        .all()
    )

    items: List[DiscountEventItem] = []
    for row in rows:
        items.append(
            DiscountEventItem(
                eventId=row.event_id,
                eventNm=row.event_nm,
                eventType=row.event_type,
                startDt=row.start_dt,
                endDt=row.end_dt,
            )
        )

    return DiscountEventsResponse(items=items)


@router.get("/discount-summary", response_model=DiscountSummary)
def get_discount_summary(
    base_month: Optional[str] = Query(
        None, description="기준 월 (YYYY-MM). 미지정 시 SALES 최대 월 기준"
    ),
    store_id: Optional[str] = Query(
        None, description="대상 매장 ID (미지정 시 전체 매장)"
    ),
    event_id: Optional[int] = Query(
        None, description="이벤트 ID (미지정 시 이벤트 전체 합산)"
    ),
    db: Session = Depends(get_db),
):
    """
    할인/이벤트별 매출 요약
    - 기준 월 한 달 기준
    - 전체 매출 vs 이벤트 매출 비교
    """
    start, end = _month_range_from_string(base_month, db)

    base_filters = [
        Sales.sale_dt >= datetime.combine(start, datetime.min.time()),
        Sales.sale_dt <= datetime.combine(end, datetime.max.time()),
    ]
    if store_id:
        base_filters.append(Sales.store_id == store_id)

    # 전체 매출 / 거래 수
    total_row = (
        db.query(
            func.sum(Sales.unit_price * Sales.qty).label("sales"),
            func.count(Sales.sale_id.distinct()).label("orders"),
        )
        .filter(*base_filters)
        .one()
    )
    total_sales = int(total_row.sales or 0)
    total_orders = int(total_row.orders or 0)

    # 이벤트 매출 / 거래 수 (event_id 가 있거나, discount 가 걸린 건만)
    event_filters = list(base_filters)
    if event_id is not None:
        event_filters.append(Sales.event_id == event_id)
    else:
        event_filters.append(Sales.event_id.isnot(None))

    event_row = (
        db.query(
            func.sum(Sales.unit_price * Sales.qty).label("sales"),
            func.count(Sales.sale_id.distinct()).label("orders"),
        )
        .filter(*event_filters)
        .one()
    )
    event_sales = int(event_row.sales or 0)
    event_orders = int(event_row.orders or 0)

    share = (
        float(event_sales) / float(total_sales) * 100.0
        if total_sales > 0 and event_sales > 0
        else 0.0
    )

    return DiscountSummary(
        totalSales=total_sales,
        totalOrders=total_orders,
        eventSales=event_sales,
        eventOrders=event_orders,
        eventSalesShare=round(share, 1),
    )


@router.get("/discount-top-products", response_model=DiscountTopProductsResponse)
def get_discount_top_products(
    base_month: Optional[str] = Query(
        None, description="기준 월 (YYYY-MM). 미지정 시 SALES 최대 월 기준"
    ),
    store_id: Optional[str] = Query(
        None, description="대상 매장 ID (미지정 시 전체 매장)"
    ),
    event_id: Optional[int] = Query(
        None, description="이벤트 ID (미지정 시 이벤트 전체 합산)"
    ),
    top_n: int = Query(30, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    할인/이벤트별 TOP 상품
    - 기준 월 한 달 기준
    - event_id 지정 시 해당 이벤트만, 없으면 모든 이벤트 합산
    """
    start, end = _month_range_from_string(base_month, db)

    base_filters = [
        Sales.sale_dt >= datetime.combine(start, datetime.min.time()),
        Sales.sale_dt <= datetime.combine(end, datetime.max.time()),
    ]
    if store_id:
        base_filters.append(Sales.store_id == store_id)

    # 전체 이벤트 매출 합계 (구성비 기준)
    sales_filters = list(base_filters)
    if event_id is not None:
        sales_filters.append(Sales.event_id == event_id)
    else:
        sales_filters.append(Sales.event_id.isnot(None))

    total_sales = (
        db.query(func.sum(Sales.unit_price * Sales.qty))
        .filter(*sales_filters)
        .scalar()
    )
    if not total_sales or total_sales <= 0:
        return DiscountTopProductsResponse(items=[])

    rows = (
        db.query(
            Sales.prod_id,
            Product.prod_nm,
            Product.category,
            Product.prod_line,
            func.sum(Sales.unit_price * Sales.qty).label("sales"),
            func.sum(Sales.qty).label("qty"),
        )
        .join(Product, Product.prod_id == Sales.prod_id, isouter=True)
        .filter(*sales_filters)
        .group_by(Sales.prod_id, Product.prod_nm, Product.category, Product.prod_line)
        .order_by(func.sum(Sales.unit_price * Sales.qty).desc())
        .limit(top_n)
        .all()
    )

    items: List[DiscountTopProductItem] = []
    for idx, row in enumerate(rows, start=1):
        sales_val = int(row.sales or 0)
        qty_val = int(row.qty or 0)
        share = float(sales_val) / float(total_sales) * 100.0 if total_sales else 0.0

        items.append(
            DiscountTopProductItem(
                rank=idx,
                prodId=row.prod_id,
                prodNm=row.prod_nm,
                category=row.category,
                line=row.prod_line,
                sales=sales_val,
                qty=qty_val,
                share=round(share, 1),
            )
        )

    return DiscountTopProductsResponse(items=items)


@router.get("/line-top-products", response_model=LineTopProductsResponse)
def get_line_top_products(
    period: str = Query(
        "recent", description="'recent'(최근 1년) 또는 'past'(그 이전 1년)"
    ),
    top_n: int = Query(30, ge=1, le=200),
    base_month: Optional[str] = Query(
        None, description="기준 연월 (YYYY-MM). 미지정 시 최신 매출 기준"
    ),
    store_id: Optional[str] = Query(
        None, description="조회 대상 점포 ID (지정 시 해당 점포 기준으로 집계)"
    ),
    db: Session = Depends(get_db),
):
    """
    라인별 TOP 상품
    - base_month 가 지정된 경우: 해당 월 한 달 기준 매출 TOP N 상품
    - base_month 가 없으면: period 에 따라 최근 1년 / 과거 1년 기준
    - store_id 가 있으면 해당 점포 기준, 없으면 전체 매장 통합 기준
    """
    max_dt: datetime | None = db.query(func.max(Sales.sale_dt)).scalar()
    if not max_dt:
        raise HTTPException(status_code=400, detail="SALES 데이터가 없습니다.")

    # 1) base_month 가 있으면: 해당 월 한 달만 집계
    if base_month:
        start, end = _month_range_from_string(base_month, db)
    else:
        # 2) 없으면 기존 recent/past 규칙으로 1년 구간
        base_end = max_dt.date()
        recent_end = base_end
        recent_start = recent_end - timedelta(days=365)

        past_end = recent_start - timedelta(days=1)
        past_start = past_end - timedelta(days=365)

        if period == "recent":
            start, end = recent_start, recent_end
        elif period == "past":
            start, end = past_start, past_end
        else:
            raise HTTPException(
                status_code=400, detail="period 는 recent 또는 past 여야 합니다."
            )

    base_filters = [
        Sales.sale_dt >= datetime.combine(start, datetime.min.time()),
        Sales.sale_dt <= datetime.combine(end, datetime.max.time()),
    ]
    if store_id:
        base_filters.append(Sales.store_id == store_id)

    # 전체 매출 합계 (구성비 계산용)
    total_sales = (
        db.query(func.sum(Sales.unit_price * Sales.qty))
        .filter(*base_filters)
        .scalar()
    )
    if not total_sales or total_sales <= 0:
        return LineTopProductsResponse(items=[])

    product_rows = (
        db.query(
            Sales.prod_id,
            Product.prod_nm,
            Product.prod_line,
            func.sum(Sales.unit_price * Sales.qty).label("sales"),
            func.sum(Sales.qty).label("qty"),
        )
        .join(Product, Product.prod_id == Sales.prod_id, isouter=True)
        .filter(*base_filters)
        .group_by(Sales.prod_id, Product.prod_nm, Product.prod_line)
        .order_by(func.sum(Sales.unit_price * Sales.qty).desc())
        .limit(top_n)
        .all()
    )

    items: List[LineTopProductItem] = []
    for idx, row in enumerate(product_rows, start=1):
        sales_val = int(row.sales or 0)
        qty_val = int(row.qty or 0)
        share = float(sales_val) / float(total_sales) * 100.0 if total_sales else 0.0

        items.append(
            LineTopProductItem(
                rank=idx,
                prodId=row.prod_id,
                prodNm=row.prod_nm,
                line=row.prod_line,
                sales=sales_val,
                qty=qty_val,
                share=round(share, 1),
            )
        )

    return LineTopProductsResponse(items=items)


@router.get("/store-top-products", response_model=StoreTopProductsResponse)
def get_store_top_products(
    store_id: str = Query(..., description="조회 대상 점포 ID"),
    period: str = Query(
        "recent", description="'recent'(최근 1년) 또는 'past'(그 이전 1년)"
    ),
    top_n: int = Query(30, ge=1, le=200),
    base_month: Optional[str] = Query(
        None, description="기준 연월 (YYYY-MM). 미지정 시 최신 매출 기준"
    ),
    db: Session = Depends(get_db),
):
    """
    점포별 TOP 상품
    - base_month 가 지정된 경우: 해당 월 한 달 기준
    - base_month 가 없는 경우:
        - period 에 따라 최근 1년 / 과거 1년 범위 내에서
    - 지정한 점포 ID 의 TOP N 상품 및 월별 매출 추이를 반환
    """
    max_dt: datetime | None = db.query(func.max(Sales.sale_dt)).scalar()
    if not max_dt:
        raise HTTPException(status_code=400, detail="SALES 데이터가 없습니다.")

    # 1) base_month 가 지정된 경우: 해당 월 한 달 기준 (랭킹/히트맵과 동일)
    if base_month:
        start, end = _month_range_from_string(base_month, db)
    else:
        # 2) base_month 가 없는 경우: 기존처럼 최근 1년 / 과거 1년 기준
        base_end = max_dt.date()

        recent_end = base_end
        recent_start = recent_end - timedelta(days=365)

        past_end = recent_start - timedelta(days=1)
        past_start = past_end - timedelta(days=365)

        if period == "recent":
            start, end = recent_start, recent_end
        elif period == "past":
            start, end = past_start, past_end
        else:
            raise HTTPException(
                status_code=400, detail="period 는 recent 또는 past 여야 합니다."
            )

    base_filters = [
        Sales.store_id == store_id,
        Sales.sale_dt >= datetime.combine(start, datetime.min.time()),
        Sales.sale_dt <= datetime.combine(end, datetime.max.time()),
    ]

    # 선택 점포의 전체 매출 합 (구성비 계산용)
    total_sales = (
        db.query(func.sum(Sales.unit_price * Sales.qty))
        .filter(*base_filters)
        .scalar()
    )
    if not total_sales or total_sales <= 0:
        return StoreTopProductsResponse(items=[])

    # TOP N 상품 집계
    product_rows = (
        db.query(
            Sales.prod_id,
            Product.prod_nm,
            func.sum(Sales.unit_price * Sales.qty).label("sales"),
            func.sum(Sales.qty).label("qty"),
        )
        .join(Product, Product.prod_id == Sales.prod_id, isouter=True)
        .filter(*base_filters)
        .group_by(Sales.prod_id, Product.prod_nm)
        .order_by(func.sum(Sales.unit_price * Sales.qty).desc())
        .limit(top_n)
        .all()
    )

    if not product_rows:
        return StoreTopProductsResponse(items=[])

    prod_ids = [row.prod_id for row in product_rows]

    # 최신 재고 스냅샷 기준 각 상품의 현재 재고 (FL+BR) 조회
    latest_snapshot = (
        db.query(func.max(InventoryStatus.snapshot_dt))
        .filter(InventoryStatus.store_id == store_id)
        .scalar()
    )
    stock_map: Dict[str, int] = {}
    if latest_snapshot:
        inv_rows = (
            db.query(
                InventoryStatus.prod_id,
                (InventoryStatus.fl_qty + InventoryStatus.br_qty).label("stock"),
            )
            .filter(
                InventoryStatus.store_id == store_id,
                InventoryStatus.snapshot_dt == latest_snapshot,
                InventoryStatus.prod_id.in_(prod_ids),
            )
            .all()
        )
        for r in inv_rows:
            stock_map[r.prod_id] = int(r.stock or 0)

    # TOP N 상품에 대한 월별 매출 추이 집계
    month_expr = func.date_format(Sales.sale_dt, "%Y-%m")
    month_rows = (
        db.query(
            Sales.prod_id,
            month_expr.label("month"),
            func.sum(Sales.unit_price * Sales.qty).label("amount"),
        )
        .filter(*base_filters, Sales.prod_id.in_(prod_ids))
        .group_by(Sales.prod_id, month_expr)
        .all()
    )

    series_map: Dict[str, Dict[str, int]] = {}
    month_set: set[str] = set()
    for row in month_rows:
        prod_id = row.prod_id
        month = row.month
        month_set.add(month)
        prod_series = series_map.setdefault(prod_id, {})
        prod_series[month] = int(row.amount or 0)

    ordered_months: List[str] = sorted(month_set)

    items: List[StoreTopProductItem] = []
    for idx, row in enumerate(product_rows, start=1):
        sales_val = int(row.sales or 0)
        qty_val = int(row.qty or 0)
        share = float(sales_val) / float(total_sales) * 100.0 if total_sales else 0.0

        monthly: List[StoreTopProductMonthlyItem] = [
            StoreTopProductMonthlyItem(
                month=month,
                amount=series_map.get(row.prod_id, {}).get(month, 0),
            )
            for month in ordered_months
        ]

        items.append(
            StoreTopProductItem(
                rank=idx,
                prodId=row.prod_id,
                prodNm=row.prod_nm,
                sales=sales_val,
                qty=qty_val,
                share=round(share, 1),
                stock=stock_map.get(row.prod_id, 0),
                monthly=monthly,
            )
        )

    return StoreTopProductsResponse(items=items)


@router.get("/export")
def export_sales(
    store_id: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None, description="조회 시작일 (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="조회 종료일 (YYYY-MM-DD)"),
    category: Optional[str] = Query(None),
    pay_type: Optional[str] = Query(None),
    keyword: Optional[str] = Query(
        None, description="SALE_ID 또는 PROD_NM 일부 검색"
    ),
    db: Session = Depends(get_db),
):
    """
    판매 내역 엑셀(CSV) 다운로드
    - 페이지네이션 없이, 현재 필터 조건 전체를 CSV 파일로 반환
    """
    query = (
        db.query(
            Sales.sale_id,
            Sales.sale_dt,
            Sales.store_id,
            Store.store_nm,
            Sales.prod_id,
            Sales.prod_nm,
            Product.prod_line,
            Product.category,
            Sales.qty,
            Sales.unit_price,
            (Sales.unit_price * Sales.qty).label("amount"),
            Sales.pay_type,
            Sales.channel,
        )
        .join(Product, Product.prod_id == Sales.prod_id, isouter=True)
        .join(Store, Store.store_id == Sales.store_id, isouter=True)
    )

    if store_id:
        query = query.filter(Sales.store_id == store_id)
    if date_from:
        query = query.filter(Sales.sale_dt >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        query = query.filter(Sales.sale_dt <= datetime.combine(date_to, datetime.max.time()))
    if category:
        query = query.filter(Product.category == category)
    if pay_type:
        query = query.filter(Sales.pay_type == pay_type)
    if keyword:
        like = f"%{keyword}%"
        query = query.filter(
            (Sales.sale_id.ilike(like)) | (Sales.prod_nm.ilike(like))
        )

    rows = query.order_by(Sales.sale_dt.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # 헤더 행
    writer.writerow(
        [
            "SALE_ID",
            "SALE_DT",
            "STORE_ID",
            "STORE_NM",
            "PROD_ID",
            "PROD_NM",
            "PROD_LINE",
            "CATEGORY",
            "QTY",
            "UNIT_PRICE",
            "AMOUNT",
            "PAY_TYPE",
            "CHANNEL",
        ]
    )

    for (
        sale_id,
        sale_dt,
        store_id_val,
        store_nm,
        prod_id,
        prod_nm,
        prod_line,
        category_val,
        qty,
        unit_price,
        amount,
        pay_type_val,
        channel,
    ) in rows:
        writer.writerow(
            [
                sale_id,
                sale_dt.strftime("%Y-%m-%d %H:%M:%S") if isinstance(sale_dt, datetime) else sale_dt,
                store_id_val,
                store_nm or "",
                prod_id,
                prod_nm or "",
                prod_line or "",
                category_val or "",
                qty,
                int(unit_price),
                int(amount),
                pay_type_val or "",
                channel or "",
            ]
        )

    csv_content = output.getvalue()
    # 한글 엑셀 호환을 위해 BOM 추가
    csv_with_bom = "\ufeff" + csv_content

    filename = f"sales_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_with_bom,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )


@router.get("/{sale_id}", response_model=SalesDetailResponse)
def get_sale_detail(
    sale_id: str,
    db: Session = Depends(get_db),
):
    """
    특정 SALE_ID 기준 영수증 상세
    - 같은 SALE_ID 를 가진 행들을 모두 조회해서 라인아이템으로 반환
    """
    rows = (
        db.query(
            Sales,
            Product.prod_line,
            Product.category,
            Store.store_nm,
        )
        .join(Product, Product.prod_id == Sales.prod_id, isouter=True)
        .join(Store, Store.store_id == Sales.store_id, isouter=True)
        .filter(Sales.sale_id == sale_id)
        .order_by(Sales.sale_dt)
        .all()
    )

    if not rows:
        raise HTTPException(status_code=404, detail="Sale not found")

    # 헤더 정보는 첫 행 기준
    first_sales, _, _, store_nm = rows[0]
    total_amount = 0
    total_qty = 0
    items: list[SalesDetailItem] = []

    for s, prod_line, category, _ in rows:
        line_amount = int(s.unit_price * s.qty)
        total_amount += line_amount
        total_qty += s.qty
        items.append(
            SalesDetailItem(
                prodId=s.prod_id,
                prodNm=s.prod_nm,
                qty=s.qty,
                unitPrice=int(s.unit_price),
                amount=line_amount,
                prodLine=prod_line,
                category=category,
            )
        )

    header = SalesDetailHeader(
        saleId=first_sales.sale_id,
        saleDt=first_sales.sale_dt,
        storeId=first_sales.store_id,
        storeNm=store_nm,
        customerId=first_sales.customer_id,
        payType=first_sales.pay_type,
        channel=first_sales.channel,
        totalAmount=total_amount,
        totalQty=total_qty,
    )

    return SalesDetailResponse(header=header, items=items)



