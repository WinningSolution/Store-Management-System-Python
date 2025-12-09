from datetime import date, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.inventory import InventoryStatus, InventoryHistory
from app.models.order_forecast import OrderForecastResult
from app.models.product import Product
from app.models.store import Store
from app.models.sales import Sales
from app.schemas.inventory import (
    InventoryItem,
    InventoryListResponse,
    InventoryDetailResponse,
    InventoryDetailItem,
    InventoryStockHistoryPoint,
    InventoryChangeLogItem,
    InventoryFlowSummary,
    DeadStockSummary,
    DeadStockStoreItem,
    DeadStockCategoryItem,
    DeadStockTrendPoint,
    DeadStockListItem,
    DeadStockMonitorResponse,
    DeadStockItemsResponse,
)


router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("", response_model=InventoryListResponse)
def list_inventory(
    store_id: Optional[str] = Query(None, description="점포 ID (미지정 시 전체)"),
    snapshot_date: Optional[date] = Query(
        None, description="재고 스냅샷 기준일 (YYYY-MM-DD). 미지정 시 최신일"
    ),
    db: Session = Depends(get_db),
):
    """
    재고 현황 리스트
    - INVENTORY_STATUS 의 최신 snapshot_dt 기준으로 점포별 재고 조회
    - 최근 7일 판매량(last7)을 사용해 추천 재고 / 상태(정상/임박/긴급/품절) 계산
    """
    # 스냅샷 기준일 결정
    if snapshot_date:
        snapshot_dt = snapshot_date
    else:
        snapshot_dt = db.query(func.max(InventoryStatus.snapshot_dt)).scalar()
        if not snapshot_dt:
            return InventoryListResponse(items=[], total=0)

    # 최근 7일 / 180일 판매량 집계 (store, prod 기준)
    last7_start = snapshot_dt - timedelta(days=7)
    last90_start = snapshot_dt - timedelta(days=180)

    sales_last7_query = (
        db.query(
            Sales.store_id.label("store_id"),
            Sales.prod_id.label("prod_id"),
            func.sum(Sales.qty).label("last7"),
        )
        .filter(
            func.date(Sales.sale_dt) >= last7_start,
            func.date(Sales.sale_dt) <= snapshot_dt,
        )
        .group_by(Sales.store_id, Sales.prod_id)
    )
    if store_id:
        sales_last7_query = sales_last7_query.filter(Sales.store_id == store_id)
    sales_last7_subq = sales_last7_query.subquery()

    sales_last90_query = (
        db.query(
            Sales.store_id.label("store_id"),
            Sales.prod_id.label("prod_id"),
            func.sum(Sales.qty).label("last90"),
        )
        .filter(
            func.date(Sales.sale_dt) >= last90_start,
            func.date(Sales.sale_dt) <= snapshot_dt,
        )
        .group_by(Sales.store_id, Sales.prod_id)
    )
    if store_id:
        sales_last90_query = sales_last90_query.filter(Sales.store_id == store_id)
    sales_last90_subq = sales_last90_query.subquery()

    # 재고 + 상품 정보 + 최근 7일 판매량 + AI 발주 예측 조인
    inv_query = (
        db.query(
            InventoryStatus.store_id,
            InventoryStatus.prod_id,
            InventoryStatus.prod_nm,
            InventoryStatus.fl_qty,
            InventoryStatus.br_qty,
            Product.prod_line,
            Product.color,
            Product.size,
            Product.origin_price,
            func.coalesce(sales_last7_subq.c.last7, 0).label("last7"),
            func.coalesce(sales_last90_subq.c.last90, 0).label("last90"),
            func.coalesce(OrderForecastResult.recommend_qty, 0).label("ai_suggested"),
        )
        .outerjoin(Product, Product.prod_id == InventoryStatus.prod_id)
        .outerjoin(
            sales_last7_subq,
            (sales_last7_subq.c.store_id == InventoryStatus.store_id)
            & (sales_last7_subq.c.prod_id == InventoryStatus.prod_id),
        )
        .outerjoin(
            sales_last90_subq,
            (sales_last90_subq.c.store_id == InventoryStatus.store_id)
            & (sales_last90_subq.c.prod_id == InventoryStatus.prod_id),
        )
        .outerjoin(
            OrderForecastResult,
            (OrderForecastResult.store_id == InventoryStatus.store_id)
            & (OrderForecastResult.prod_id == InventoryStatus.prod_id)
            & (OrderForecastResult.base_date == snapshot_dt),
        )
        .filter(InventoryStatus.snapshot_dt == snapshot_dt)
    )
    if store_id:
        inv_query = inv_query.filter(InventoryStatus.store_id == store_id)

    rows = inv_query.all()

    base_default = 5  # 최근 7일 판매량이 0인 SKU에 사용할 기본 추천 재고
    items: List[InventoryItem] = []

    for row in rows:
        total_qty = int((row.fl_qty or 0) + (row.br_qty or 0))
        last7 = int(row.last7 or 0)
        last90 = int(row.last90 or 0)
        last7_for_calc = last7 if last7 > 0 else base_default
        recommended = int(last7_for_calc)

        if total_qty == 0:
            status = "품절"
        else:
            ratio = total_qty / recommended if recommended > 0 else 1.0
            if ratio <= 0.3:
                status = "긴급"
            elif ratio <= 0.7:
                status = "임박"
            else:
                status = "정상"

        # 위치는 우선 FL+BR 를 합산한 개념으로, 매장 재고가 있으면 '매장', 아니면 'BR' 로 표기
        location = "매장" if (row.fl_qty or 0) > 0 else "BR"

        price = float(row.origin_price or 0)
        ai_suggested = int(row.ai_suggested or 0)

        items.append(
            InventoryItem(
                sku=row.prod_id,
                prodNm=row.prod_nm,
                prodLine=row.prod_line,
                color=row.color,
                size=row.size,
                price=price,
                location=location,
                stock=total_qty,
                status=status,
                recommended=recommended,
                last7=last7,
                last90=last90,
                aiSuggested=ai_suggested,
            )
        )

    return InventoryListResponse(items=items, total=len(items))


@router.get("/detail", response_model=InventoryDetailResponse)
def inventory_detail(
    store_id: str,
    prod_id: str,
    db: Session = Depends(get_db),
):
    """
    특정 점포·상품의 재고 상세 정보 + 더미 기반 재고 추이/흐름/이력
    - INVENTORY_STATUS 최신 snapshot_dt 기준
    - INVENTORY_HISTORY 를 사용해 변경 이력 구성
    """
    # 최신 스냅샷 일자
    snapshot_dt = (
        db.query(func.max(InventoryStatus.snapshot_dt))
        .filter(
            InventoryStatus.store_id == store_id,
            InventoryStatus.prod_id == prod_id,
        )
        .scalar()
    )
    if not snapshot_dt:
        raise HTTPException(status_code=404, detail="Inventory not found")

    # 기본 정보 + 최근 7일 판매량
    base_row = (
        db.query(
            InventoryStatus.store_id,
            InventoryStatus.prod_id,
            InventoryStatus.prod_nm,
            InventoryStatus.fl_qty,
            InventoryStatus.br_qty,
            Product.category,
            Product.color,
            Product.size,
            Product.origin_price,
        )
        .outerjoin(Product, Product.prod_id == InventoryStatus.prod_id)
        .filter(
            InventoryStatus.store_id == store_id,
            InventoryStatus.prod_id == prod_id,
            InventoryStatus.snapshot_dt == snapshot_dt,
        )
        .first()
    )
    if not base_row:
        raise HTTPException(status_code=404, detail="Inventory not found")

    total_qty = int((base_row.fl_qty or 0) + (base_row.br_qty or 0))

    last7_start = snapshot_dt - timedelta(days=7)
    last7 = (
        db.query(func.coalesce(func.sum(Sales.qty), 0))
        .filter(
            Sales.store_id == store_id,
            Sales.prod_id == prod_id,
            func.date(Sales.sale_dt) >= last7_start,
            func.date(Sales.sale_dt) <= snapshot_dt,
        )
        .scalar()
        or 0
    )

    base_default = 5
    last7_for_calc = last7 if last7 > 0 else base_default
    recommended = int(last7_for_calc)

    if total_qty == 0:
        status = "품절"
    else:
        ratio = total_qty / recommended if recommended > 0 else 1.0
        if ratio <= 0.3:
            status = "긴급"
        elif ratio <= 0.7:
            status = "임박"
        else:
            status = "정상"

    location = "매장" if (base_row.fl_qty or 0) > 0 else "BR"
    price = float(base_row.origin_price or 0)

    avg_sales_per_day = float(last7_for_calc) / 7.0
    if avg_sales_per_day > 0:
        days_until_out = int(total_qty / avg_sales_per_day)
    else:
        days_until_out = None

    # AI 발주 예측 결과 (있으면 함께 반환)
    of_row = (
        db.query(OrderForecastResult)
        .filter(
            OrderForecastResult.store_id == store_id,
            OrderForecastResult.prod_id == prod_id,
            OrderForecastResult.base_date == snapshot_dt,
        )
        .first()
    )
    ai_suggested = int(of_row.recommend_qty) if of_row else None
    ai_explain = of_row.explain_text if of_row else None

    detail_item = InventoryDetailItem(
        sku=prod_id,
        prodNm=base_row.prod_nm,
        category=base_row.category,
        color=base_row.color,
        size=base_row.size,
        price=price,
        location=location,
        stock=total_qty,
        status=status,
        recommended=recommended,
        avgSalesPerDay=round(avg_sales_per_day, 1),
        daysUntilOut=days_until_out,
        aiSuggested=ai_suggested,
        aiExplain=ai_explain,
    )

    # 변경 이력: 최신 30건, 최신 재고 기준으로 before/after 계산
    history_rows = (
        db.query(
            InventoryHistory.move_dt,
            InventoryHistory.move_type,
            InventoryHistory.qty,
            InventoryHistory.location,
        )
        .filter(
            InventoryHistory.store_id == store_id,
            InventoryHistory.prod_id == prod_id,
        )
        .order_by(InventoryHistory.move_dt.desc())
        .limit(30)
        .all()
    )

    change_logs: List[InventoryChangeLogItem] = []
    running_after = total_qty
    total_in_hq = 0
    total_in_return = 0
    total_sold = 0
    for row in history_rows:
        qty = int(row.qty or 0)
        before_qty = running_after - qty
        move_type = (row.move_type or "").strip()

        # IN/OUT 집계 (단순 규칙)
        if qty > 0:
            if move_type == "입고":
                total_in_hq += qty
            elif move_type in ("반품", "고객반품"):
                total_in_return += qty
        elif qty < 0 and move_type == "판매":
            total_sold += -qty

        change_logs.append(
            InventoryChangeLogItem(
                date=row.move_dt,
                moveType=move_type,
                qty=qty,
                beforeQty=before_qty,
                afterQty=running_after,
                location=row.location,
            )
        )
        running_after = before_qty

    # 재고 추이: 실제 이력 기반으로 afterQty를 사용 (오래된 것부터 정렬)
    stock_history: List[InventoryStockHistoryPoint] = []
    for log in reversed(change_logs):
        stock_history.append(
            InventoryStockHistoryPoint(
                date=log.date.strftime("%m/%d"),
                stock=log.afterQty,
            )
        )
    if not stock_history:
        stock_history.append(
            InventoryStockHistoryPoint(
                date=snapshot_dt.strftime("%m/%d"),
                stock=total_qty,
            )
        )

    # 재고 흐름 기준일: INVENTORY_HISTORY 최신 move_dt 기준 (없으면 snapshot_dt)
    latest_move_dt = (
        db.query(func.max(InventoryHistory.move_dt))
        .filter(
            InventoryHistory.store_id == store_id,
            InventoryHistory.prod_id == prod_id,
        )
        .scalar()
    )
    flow_reference_date = (latest_move_dt.date() if latest_move_dt else snapshot_dt)

    # 재고 흐름 요약 (전월이월은 잔차로 계산)
    total_current = total_qty
    prev_carry = max(total_current + total_sold - total_in_hq - total_in_return, 0)
    flow = InventoryFlowSummary(
        prevCarry=int(prev_carry),
        hqInbound=int(total_in_hq),
        customerReturn=int(total_in_return),
        sold=int(total_sold),
        current=int(total_current),
    )

    return InventoryDetailResponse(
        item=detail_item,
        stockHistory=stock_history,
        changeLog=change_logs,
        flowReferenceDate=flow_reference_date,
        flow=flow,
    )


@router.get("/dead-stock", response_model=DeadStockMonitorResponse)
def dead_stock_monitor(
    store_id: Optional[str] = Query(None, description="점포 ID (미지정 시 전체)"),
    snapshot_date: Optional[date] = Query(
        None, description="재고 스냅샷 기준일 (YYYY-MM-DD). 미지정 시 최신일"
    ),
    db: Session = Depends(get_db),
):
    """
    Dead Stock 모니터링
    - 기준: snapshot_dt 기준 최근 180일 동안 판매 수량이 0이고, 재고가 0보다 큰 SKU
    - 요약 KPI + 점포/카테고리 요약 + 상세 리스트를 한 번에 반환
    """
    # 스냅샷 기준일 결정
    if snapshot_date:
        snapshot_dt = snapshot_date
    else:
        snapshot_dt = db.query(func.max(InventoryStatus.snapshot_dt)).scalar()
        if not snapshot_dt:
            empty_summary = DeadStockSummary(
                totalAmount=0.0, totalRatio=0.0, skuCount=0, avgDaysWithoutSale=0.0
            )
            return DeadStockMonitorResponse(
                summary=empty_summary,
                stores=[],
                categories=[],
                trend=[],
                items=[],
            )

    # 공통 로직: 특정 snapshot 에 대한 Dead Stock 요약을 계산하는 헬퍼
    # store_filter: None 이면 전체, 값이 있으면 해당 점포만 대상으로 계산
    def _compute_dead_stock_summary(
        base_snapshot: date,
        store_filter: Optional[str],
        include_items: bool = False,
    ) -> tuple[
        float,
        float,
        int,
        float,
        float,
        List[DeadStockListItem],
        dict[str, float],
        dict[str, float],
    ]:
        sales_start_local = base_snapshot - timedelta(days=180)
        # 점포 필터가 있으면 Sales 단계에서 먼저 필터링하여 쿼리 범위를 최소화
        sales_180_query = db.query(
            Sales.store_id.label("store_id"),
            Sales.prod_id.label("prod_id"),
            func.sum(Sales.qty).label("qty180"),
        ).filter(
            func.date(Sales.sale_dt) >= sales_start_local,
            func.date(Sales.sale_dt) <= base_snapshot,
        )
        if store_filter:
            sales_180_query = sales_180_query.filter(Sales.store_id == store_filter)

        sales_180_subq_local = (
            sales_180_query.group_by(Sales.store_id, Sales.prod_id).subquery()
        )

        # 전체 기간 기준 마지막 판매일 서브쿼리
        last_sale_query = db.query(
            Sales.store_id.label("store_id"),
            Sales.prod_id.label("prod_id"),
            func.max(func.date(Sales.sale_dt)).label("last_sale_all"),
        ).filter(func.date(Sales.sale_dt) <= base_snapshot)
        if store_filter:
            last_sale_query = last_sale_query.filter(Sales.store_id == store_filter)
        last_sale_subq = last_sale_query.group_by(Sales.store_id, Sales.prod_id).subquery()

        inv_q = (
            db.query(
                InventoryStatus.store_id,
                InventoryStatus.prod_id,
                InventoryStatus.prod_nm,
                InventoryStatus.fl_qty,
                InventoryStatus.br_qty,
                InventoryStatus.snapshot_dt,
                Product.category,
                Product.origin_price,
                Store.store_nm,
                func.coalesce(sales_180_subq_local.c.qty180, 0).label("qty180"),
                last_sale_subq.c.last_sale_all,
            )
            .join(Product, Product.prod_id == InventoryStatus.prod_id, isouter=True)
            .join(Store, Store.store_id == InventoryStatus.store_id, isouter=True)
            .outerjoin(
                sales_180_subq_local,
                (sales_180_subq_local.c.store_id == InventoryStatus.store_id)
                & (sales_180_subq_local.c.prod_id == InventoryStatus.prod_id),
            )
            .outerjoin(
                last_sale_subq,
                (last_sale_subq.c.store_id == InventoryStatus.store_id)
                & (last_sale_subq.c.prod_id == InventoryStatus.prod_id),
            )
            .filter(InventoryStatus.snapshot_dt == base_snapshot)
        )
        if store_filter:
            inv_q = inv_q.filter(InventoryStatus.store_id == store_filter)

        rows_local = inv_q.all()

        items_local: List[DeadStockListItem] = []
        total_amount_local = 0.0
        total_days_local = 0
        sku_count_local = 0
        store_amounts_local: dict[str, float] = {}
        category_amounts_local: dict[str, float] = {}

        for row in rows_local:
            total_qty = int((row.fl_qty or 0) + (row.br_qty or 0))
            if total_qty <= 0:
                continue

            sales_180 = int(row.qty180 or 0)
            if sales_180 != 0:
                continue  # 최근 180일 동안 판매가 1개라도 있으면 Dead Stock 아님

            price = float(row.origin_price or 0)
            amount = price * total_qty
            total_amount_local += amount
            sku_count_local += 1

            # 마지막 판매일: 전체 기간 기준
            if row.last_sale_all:
                days_without = (base_snapshot - row.last_sale_all).days
            else:
                # 판매 이력이 전혀 없으면 최소 365일 이상 미판매로 간주
                days_without = 365
            total_days_local += days_without

            store_amounts_local[row.store_id] = store_amounts_local.get(row.store_id, 0.0) + amount
            cat_key = row.category or "기타"
            category_amounts_local[cat_key] = category_amounts_local.get(cat_key, 0.0) + amount

            if include_items:
                items_local.append(
                    DeadStockListItem(
                        prodId=row.prod_id,
                        prodNm=row.prod_nm,
                        storeId=row.store_id,
                        storeNm=row.store_nm,
                        stock=total_qty,
                        daysWithoutSale=days_without,
                        lastSaleDate=row.last_sale_all,
                        amount=amount,
                        category=row.category,
                    )
                )

        avg_days_local = float(total_days_local) / sku_count_local if sku_count_local > 0 else 0.0

        # 전체 재고 자산 대비 비율 계산
        total_inventory_amount_q_local = (
            db.query(
                func.coalesce(
                    func.sum(
                        (InventoryStatus.fl_qty + InventoryStatus.br_qty)
                        * func.coalesce(Product.origin_price, 0)
                    ),
                    0,
                )
            )
            .join(Product, Product.prod_id == InventoryStatus.prod_id, isouter=True)
            .filter(InventoryStatus.snapshot_dt == base_snapshot)
        )
        if store_filter:
            total_inventory_amount_q_local = total_inventory_amount_q_local.filter(
                InventoryStatus.store_id == store_filter
            )
        total_inventory_amount_local = float(total_inventory_amount_q_local.scalar() or 0)

        total_ratio_local = (
            (total_amount_local / total_inventory_amount_local) * 100
            if total_inventory_amount_local > 0
            else 0.0
        )

        return (
            total_amount_local,
            total_ratio_local,
            sku_count_local,
            avg_days_local,
            total_inventory_amount_local,
            items_local,
            store_amounts_local,
            category_amounts_local,
        )

    # 현재 스냅샷 기준 Dead Stock 요약 (선택된 점포 기준)
    (
        total_amount,
        total_ratio,
        sku_count,
        avg_days,
        _total_inventory_amount,
        _dead_items_for_summary,
        store_amounts,
        category_amounts,
    ) = _compute_dead_stock_summary(snapshot_dt, store_id, include_items=False)

    # 전월(이전 스냅샷) 기준 Dead Stock 요약
    prev_snapshot_dt = (
        db.query(func.max(InventoryStatus.snapshot_dt))
        .filter(InventoryStatus.snapshot_dt < snapshot_dt)
        .scalar()
    )
    if prev_snapshot_dt:
        (
            prev_total_amount,
            prev_total_ratio,
            prev_sku_count,
            prev_avg_days,
            _,
            _,
            _,
            _,
        ) = _compute_dead_stock_summary(prev_snapshot_dt, store_id, include_items=False)
    else:
        prev_total_amount = 0.0
        prev_total_ratio = 0.0
        prev_sku_count = 0
        prev_avg_days = 0.0

    summary = DeadStockSummary(
        totalAmount=total_amount,
        totalRatio=total_ratio,
        skuCount=sku_count,
        avgDaysWithoutSale=avg_days,
        prevTotalAmount=prev_total_amount,
        prevTotalRatio=prev_total_ratio,
        prevSkuCount=prev_sku_count,
        prevAvgDaysWithoutSale=prev_avg_days,
    )

    # 점포별 TOP5: 항상 전체 점포 기준 Dead Stock TOP5 를 보여주기 위해
    # 별도로 전체 점포 기준 store_amounts 를 계산
    (
        _total_amount_all,
        _total_ratio_all,
        _sku_count_all,
        _avg_days_all,
        _total_inventory_amount_all,
        _dead_items_all,
        store_amounts_all,
        _category_amounts_all,
    ) = _compute_dead_stock_summary(snapshot_dt, None, include_items=False)

    # 점포별 TOP5 (온라인 점포 제외, 최대 5개)
    store_items: List[DeadStockStoreItem] = []
    for sid, amt in sorted(
        store_amounts_all.items(), key=lambda x: x[1], reverse=True
    ):
        store_nm = db.query(Store.store_nm).filter(Store.store_id == sid).scalar() or sid
        # 온라인 점포는 TOP5 랭킹에서 제외
        name_lower = str(store_nm).lower()
        if "온라인" in str(store_nm) or "online" in name_lower:
            continue
        store_items.append(
            DeadStockStoreItem(storeId=sid, storeNm=store_nm, amount=amt)
        )
        if len(store_items) >= 5:
            break

    # 카테고리별 비중
    categories: List[DeadStockCategoryItem] = []
    for cat, amt in sorted(category_amounts.items(), key=lambda x: x[1], reverse=True):
        ratio = (amt / total_amount) * 100 if total_amount > 0 else 0.0
        categories.append(
            DeadStockCategoryItem(category=cat, amount=amt, ratio=ratio)
        )

    # 추이는 우선 현재 스냅샷 기준 1포인트만 반환 (향후 월별 추이로 확장 가능)
    trend = [
        DeadStockTrendPoint(
            month=snapshot_dt.strftime("%Y-%m"),
            ratio=total_ratio,
            amount=total_amount,
        )
    ]

    return DeadStockMonitorResponse(
        summary=summary,
        stores=store_items,
        categories=categories,
        trend=trend,
        items=[],
    )


@router.get("/dead-stock/items", response_model=DeadStockItemsResponse)
def dead_stock_items(
    store_id: Optional[str] = Query(None, description="점포 ID (미지정 시 전체)"),
    snapshot_date: Optional[date] = Query(
        None, description="재고 스냅샷 기준일 (YYYY-MM-DD). 미지정 시 최신일"
    ),
    page: int = Query(1, ge=1, description="페이지 번호 (1부터 시작)"),
    page_size: int = Query(20, ge=1, le=100, description="페이지 크기"),
    db: Session = Depends(get_db),
):
    """
    Dead Stock 상세 목록 (서버사이드 페이지네이션)
    - 점포/스냅샷 기준 Dead Stock SKU 를 페이지 단위로 반환
    """
    # 스냅샷 기준일 결정
    if snapshot_date:
        snapshot_dt = snapshot_date
    else:
        snapshot_dt = db.query(func.max(InventoryStatus.snapshot_dt)).scalar()
        if not snapshot_dt:
            return DeadStockItemsResponse(items=[], total=0)

    sales_start = snapshot_dt - timedelta(days=180)

    # 180일 판매 서브쿼리 (점포 필터 반영)
    sales_180_query = db.query(
        Sales.store_id.label("store_id"),
        Sales.prod_id.label("prod_id"),
        func.sum(Sales.qty).label("qty180"),
    ).filter(
        func.date(Sales.sale_dt) >= sales_start,
        func.date(Sales.sale_dt) <= snapshot_dt,
    )
    if store_id:
        sales_180_query = sales_180_query.filter(Sales.store_id == store_id)

    sales_180_subq = sales_180_query.group_by(Sales.store_id, Sales.prod_id).subquery()

    # 전체 기간 기준 마지막 판매일 서브쿼리
    last_sale_query = db.query(
        Sales.store_id.label("store_id"),
        Sales.prod_id.label("prod_id"),
        func.max(func.date(Sales.sale_dt)).label("last_sale_all"),
    ).filter(func.date(Sales.sale_dt) <= snapshot_dt)
    if store_id:
        last_sale_query = last_sale_query.filter(Sales.store_id == store_id)
    last_sale_subq = last_sale_query.group_by(Sales.store_id, Sales.prod_id).subquery()

    # Dead Stock 후보 기본 쿼리
    base_query = (
        db.query(
            InventoryStatus.store_id,
            InventoryStatus.prod_id,
            InventoryStatus.prod_nm,
            InventoryStatus.fl_qty,
            InventoryStatus.br_qty,
            Product.category,
            Product.origin_price,
            Store.store_nm,
            func.coalesce(sales_180_subq.c.qty180, 0).label("qty180"),
            last_sale_subq.c.last_sale_all,
        )
        .join(Product, Product.prod_id == InventoryStatus.prod_id, isouter=True)
        .join(Store, Store.store_id == InventoryStatus.store_id, isouter=True)
        .outerjoin(
            sales_180_subq,
            (sales_180_subq.c.store_id == InventoryStatus.store_id)
            & (sales_180_subq.c.prod_id == InventoryStatus.prod_id),
        )
        .outerjoin(
            last_sale_subq,
            (last_sale_subq.c.store_id == InventoryStatus.store_id)
            & (last_sale_subq.c.prod_id == InventoryStatus.prod_id),
        )
        .filter(InventoryStatus.snapshot_dt == snapshot_dt)
    )
    if store_id:
        base_query = base_query.filter(InventoryStatus.store_id == store_id)

    # Dead Stock 조건 적용: 재고 > 0, 최근 180일 판매 0
    # (판매 0은 SQL에서, 재고 > 0 은 파이썬에서 한 번 더 체크)
    base_query = base_query.filter(func.coalesce(sales_180_subq.c.qty180, 0) == 0)

    # 전체 개수
    total = base_query.count()

    # 페이지 데이터
    offset = (page - 1) * page_size
    rows = (
        base_query.order_by(InventoryStatus.store_id, InventoryStatus.prod_id)
        .offset(offset)
        .limit(page_size)
        .all()
    )

    items: List[DeadStockListItem] = []
    for row in rows:
        total_qty = int((row.fl_qty or 0) + (row.br_qty or 0))
        if total_qty <= 0:
            continue

        price = float(row.origin_price or 0)
        amount = price * total_qty

        if row.last_sale_all:
            days_without = (snapshot_dt - row.last_sale_all).days
        else:
            days_without = 365

        items.append(
            DeadStockListItem(
                prodId=row.prod_id,
                prodNm=row.prod_nm,
                storeId=row.store_id,
                storeNm=row.store_nm,
                stock=total_qty,
                daysWithoutSale=days_without,
                lastSaleDate=row.last_sale_all,
                amount=amount,
                category=row.category,
            )
        )

    return DeadStockItemsResponse(items=items, total=total)

