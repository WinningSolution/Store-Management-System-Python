from datetime import date, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.sales import Sales
from app.models.product import Product
from app.schemas.order_forecast import (
    OrderForecastSummary,
    OrderForecastSummaryResponse,
    OrderForecastItem,
    OrderForecastItemsResponse,
)


router = APIRouter(prefix="/order-forecast", tags=["order-forecast"])


def _get_latest_base_date(db: Session) -> Optional[date]:
    row = db.execute(text("SELECT MAX(BASE_DATE) AS base_date FROM MART_ORDER_FORECAST_RESULT")).mappings().first()
    return row["base_date"] if row and row["base_date"] else None


@router.get("/summary", response_model=OrderForecastSummaryResponse)
def get_order_forecast_summary(
    store_id: Optional[str] = Query(None, description="점포 ID"),
    base_date: Optional[date] = Query(None, description="예측 기준일 (미지정 시 최신일)"),
    db: Session = Depends(get_db),
):
    """
    AI 발주 예측 상단 KPI 요약
    - 긴급 발주 필요 SKU 수
    - 총 추천 발주량
    - 예측 발주 커버리지 (최근 90일 매출 중 추천 발주 대상 SKU 매출 비중, 금액 기준)
    """
    if base_date is None:
        latest_base = _get_latest_base_date(db)
        if latest_base is None:
            # 예측 결과가 아직 없는 경우
            empty = OrderForecastSummary(
                baseDate=date.today(),
                storeId=store_id,
                urgentCount=0,
                totalRecommendQty=0,
                coveragePct=0.0,
            )
            return OrderForecastSummaryResponse(summary=empty)
        base_date = latest_base

    params = {"base_date": base_date}
    where_clauses = ["BASE_DATE = :base_date"]
    if store_id:
        where_clauses.append("STORE_ID = :store_id")
        params["store_id"] = store_id
    where_sql = " AND ".join(where_clauses)

    # 긴급 발주 필요 SKU 수
    urgent_sql = text(
        f"""
        SELECT COUNT(*) AS cnt
        FROM MART_ORDER_FORECAST_RESULT
        WHERE {where_sql}
          AND PRIORITY = '긴급'
        """
    )
    urgent_count = int(db.execute(urgent_sql, params).scalar() or 0)

    # 총 추천 발주량
    total_sql = text(
        f"""
        SELECT COALESCE(SUM(RECOMMEND_QTY), 0) AS qty
        FROM MART_ORDER_FORECAST_RESULT
        WHERE {where_sql}
        """
    )
    total_recommend = int(db.execute(total_sql, params).scalar() or 0)

    # 예측 발주 커버리지 계산 (최근 90일 매출 금액 기준)
    coverage_pct = 0.0
    # 최근 90일 구간
    start_90d = base_date - timedelta(days=90)

    # 전체 매출 금액
    total_sales_q = (
        db.query(
            func.coalesce(func.sum(Sales.qty * func.coalesce(Product.origin_price, 0)), 0.0)
        )
        .join(Product, Product.prod_id == Sales.prod_id, isouter=True)
        .filter(
            func.date(Sales.sale_dt) >= start_90d,
            func.date(Sales.sale_dt) < base_date,
        )
    )
    if store_id:
        total_sales_q = total_sales_q.filter(Sales.store_id == store_id)
    total_sales_amount = float(total_sales_q.scalar() or 0.0)

    # 추천 발주 대상 SKU 매출 금액 (RECOMMEND_QTY > 0 인 SKU 만)
    # EXISTS 서브쿼리로 MART_ORDER_FORECAST_RESULT 와 연결
    sub_where = "r.STORE_ID = s.store_id AND r.PROD_ID = s.prod_id AND r.BASE_DATE = :base_date AND r.RECOMMEND_QTY > 0"
    if store_id:
        sub_where += " AND r.STORE_ID = :store_id"

    target_sales_sql = text(
        f"""
        SELECT COALESCE(SUM(s.QTY * COALESCE(p.origin_price, 0)), 0) AS amt
        FROM SALES s
        JOIN PRODUCT p ON p.prod_id = s.prod_id
        WHERE DATE(s.sale_dt) >= :start_90d
          AND DATE(s.sale_dt) <  :base_date
          {"AND s.store_id = :store_id" if store_id else ""}
          AND EXISTS (
            SELECT 1
            FROM MART_ORDER_FORECAST_RESULT r
            WHERE {sub_where}
          )
        """
    )
    target_params = {
        "start_90d": start_90d,
        "base_date": base_date,
    }
    if store_id:
        target_params["store_id"] = store_id

    target_amount = float(db.execute(target_sales_sql, target_params).scalar() or 0.0)

    if total_sales_amount > 0:
        coverage_pct = (target_amount / total_sales_amount) * 100.0

    summary = OrderForecastSummary(
        baseDate=base_date,
        storeId=store_id,
        urgentCount=urgent_count,
        totalRecommendQty=total_recommend,
        coveragePct=round(coverage_pct, 1),
    )
    return OrderForecastSummaryResponse(summary=summary)


@router.get("/items", response_model=OrderForecastItemsResponse)
def get_order_forecast_items(
    store_id: Optional[str] = Query(None, description="점포 ID"),
    base_date: Optional[date] = Query(None, description="예측 기준일 (미지정 시 최신일)"),
    priority: Optional[str] = Query(None, description="우선순위 필터 (긴급/높음/보통)"),
    page: int = Query(1, ge=1, description="페이지 번호 (1부터 시작)"),
    page_size: int = Query(50, ge=1, le=200, description="페이지 크기"),
    db: Session = Depends(get_db),
):
    """
    AI 발주 예측 SKU 목록
    - 기본 정렬: 우선순위(긴급>높음>보통) → 추천 발주량 DESC
    """
    if base_date is None:
        latest_base = _get_latest_base_date(db)
        if latest_base is None:
            return OrderForecastItemsResponse(items=[], total=0)
        base_date = latest_base

    params = {"base_date": base_date}
    where_clauses = ["r.BASE_DATE = :base_date"]

    if store_id:
        where_clauses.append("r.STORE_ID = :store_id")
        params["store_id"] = store_id

    if priority:
        where_clauses.append("r.PRIORITY = :priority")
        params["priority"] = priority

    where_sql = " AND ".join(where_clauses)

    # 전체 개수
    count_sql = text(
        f"""
        SELECT COUNT(*) AS cnt
        FROM MART_ORDER_FORECAST_RESULT r
        WHERE {where_sql}
        """
    )
    total = int(db.execute(count_sql, params).scalar() or 0)

    if total == 0:
        return OrderForecastItemsResponse(items=[], total=0)

    offset = (page - 1) * page_size

    # 우선순위 정렬: 긴급 > 높음 > 보통
    order_sql = """
      CASE r.PRIORITY
        WHEN '긴급' THEN 1
        WHEN '높음' THEN 2
        ELSE 3
      END,
      r.RECOMMEND_QTY DESC
    """

    items_sql = text(
        f"""
        SELECT
          r.STORE_ID,
          r.PROD_ID,
          r.BASE_DATE,
          r.PRED_7D_QTY,
          r.CURR_STOCK,
          r.RECOMMEND_QTY,
          r.PRIORITY,
          r.EXPLAIN_TEXT,
          p.prod_nm
        FROM MART_ORDER_FORECAST_RESULT r
        LEFT JOIN PRODUCT p ON p.prod_id = r.PROD_ID
        WHERE {where_sql}
        ORDER BY {order_sql}
        LIMIT :limit OFFSET :offset
        """
    )

    items_params = dict(params)
    items_params.update({"limit": page_size, "offset": offset})

    rows = db.execute(items_sql, items_params).mappings().all()

    items: List[OrderForecastItem] = []
    for row in rows:
        items.append(
            OrderForecastItem(
                storeId=row["STORE_ID"],
                prodId=row["PROD_ID"],
                prodNm=row.get("prod_nm"),
                baseDate=row["BASE_DATE"],
                pred7dQty=float(row["PRED_7D_QTY"] or 0.0),
                currStock=int(row["CURR_STOCK"] or 0),
                recommendQty=int(row["RECOMMEND_QTY"] or 0),
                priority=row["PRIORITY"],
                explainText=row.get("EXPLAIN_TEXT"),
            )
        )

    return OrderForecastItemsResponse(items=items, total=total)



