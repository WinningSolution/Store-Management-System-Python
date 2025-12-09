from typing import Optional, List, Dict

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.customer_segments import (
    RegionSegmentMetricsResponse,
    RegionSegmentMetricsItem,
    RegionSegmentTrendResponse,
    RegionSegmentTrendItem,
    RegionSegmentTopCategoriesResponse,
    RegionSegmentTopCategoryItem,
    RegionSegmentTopProductsResponse,
    RegionSegmentTopProductItem,
    CustomerSegmentOptionsResponse,
    CustomerSegmentMasterResponse,
    CustomerSegmentMasterItem,
    CustomerSegmentLogResponse,
    CustomerSegmentLogItem,
)


router = APIRouter(prefix="/customer/segments", tags=["customer-segments"])


@router.get("/log", response_model=CustomerSegmentLogResponse)
def get_customer_segment_log(
    db: Session = Depends(get_db),
    segment_id: Optional[str] = Query(
        None, description="변경 후 세그먼트 ID (필터용, 예: F01 등)"
    ),
    customer_id: Optional[str] = Query(
        None, description="고객 ID (필터용, 특정 고객 이력만 조회)"
    ),
):
    """
    고객 세그먼트 이동 이력 조회

    - CUSTOMER_SEGMENT_LOG 기준
    - 각 row 는 특정 시점에 '어느 세그먼트로 이동했는지'를 나타냄
    - fromSegment 는 직전 세그먼트를 조회해서 구성 (없으면 None)
    """

    base_sql = """
        SELECT
            curr.CUSTOMER_ID AS customer_id,
            cs_from.SEGMENT_NM AS from_segment,
            cs_to.SEGMENT_NM   AS to_segment,
            curr.START_DT      AS changed_date,
            curr.SOURCE        AS reason
        FROM CUSTOMER_SEGMENT_LOG curr
        LEFT JOIN CUSTOMER_SEGMENT_LOG prev
            ON prev.CUSTOMER_ID = curr.CUSTOMER_ID
           AND prev.END_DT = curr.START_DT
        LEFT JOIN CUSTOMER_SEGMENT cs_to
            ON cs_to.SEGMENT_ID = curr.SEGMENT_ID
        LEFT JOIN CUSTOMER_SEGMENT cs_from
            ON cs_from.SEGMENT_ID = prev.SEGMENT_ID
        WHERE 1=1
    """

    where_clauses: List[str] = []
    params: Dict[str, object] = {}

    if segment_id:
        where_clauses.append("curr.SEGMENT_ID = :segment_id")
        params["segment_id"] = segment_id

    if customer_id:
        where_clauses.append("curr.CUSTOMER_ID = :customer_id")
        params["customer_id"] = customer_id

    if where_clauses:
        base_sql += " AND " + " AND ".join(where_clauses)

    base_sql += """
        ORDER BY curr.START_DT DESC, curr.CUSTOMER_ID
        LIMIT 500
    """

    rows = db.execute(text(base_sql), params).mappings().all()

    items: List[CustomerSegmentLogItem] = []
    for row in rows:
        items.append(
            CustomerSegmentLogItem(
                customerId=row["customer_id"],
                customerName=None,
                fromSegment=row.get("from_segment"),
                toSegment=row.get("to_segment") or "",
                changedDate=row["changed_date"],
                reason=row.get("reason"),
            )
        )

    return CustomerSegmentLogResponse(items=items)


@router.get("/options", response_model=CustomerSegmentOptionsResponse)
def get_customer_segment_options(db: Session = Depends(get_db)):
    """
    활성화된 고객 세그먼트 목록 조회 (드롭다운용)
    """
    sql = """
        SELECT SEGMENT_NM
        FROM CUSTOMER_SEGMENT
        WHERE ACTIVE_FLAG = 'Y'
        ORDER BY SEGMENT_ID
    """
    rows = db.execute(text(sql)).mappings().all()
    names = [row["SEGMENT_NM"] for row in rows if row.get("SEGMENT_NM")]
    return CustomerSegmentOptionsResponse(items=names)


@router.get("/master", response_model=CustomerSegmentMasterResponse)
def get_customer_segment_master(db: Session = Depends(get_db)):
    """
    고객 세그먼트 마스터 목록 조회 (세그먼트 관리 화면용)
    """
    sql = """
        SELECT
            cs.SEGMENT_ID,
            cs.SEGMENT_NM,
            cs.SEGMENT_TYPE,
            cs.DESCRIPTION,
            cs.ACTIVE_FLAG,
            COALESCE(cnt.cnt, 0) AS customer_count
        FROM CUSTOMER_SEGMENT cs
        LEFT JOIN (
            SELECT
                SEGMENT_ID,
                COUNT(DISTINCT CUSTOMER_ID) AS cnt
            FROM CUSTOMER_SEGMENT_LOG
            WHERE END_DT IS NULL
            GROUP BY SEGMENT_ID
        ) cnt ON cs.SEGMENT_ID = cnt.SEGMENT_ID
        ORDER BY cs.SEGMENT_ID
    """
    rows = db.execute(text(sql)).mappings().all()

    items: List[CustomerSegmentMasterItem] = []
    for row in rows:
        items.append(
            CustomerSegmentMasterItem(
                segmentId=row["SEGMENT_ID"],
                segmentName=row["SEGMENT_NM"],
                segmentType=row.get("SEGMENT_TYPE") or "",
                description=row.get("DESCRIPTION"),
                customerCount=int(row.get("customer_count") or 0),
                isActive=(str(row.get("ACTIVE_FLAG") or "N") == "Y"),
            )
        )

    return CustomerSegmentMasterResponse(items=items)


REGION_CASE_SQL = """
    CASE 
        WHEN st.STORE_NM LIKE '서울%%'  OR st.STORE_NM LIKE '경기%%' 
          OR st.STORE_NM LIKE '인천%%' OR st.STORE_NM LIKE '강원%%' THEN '수도권+강원권'
        WHEN st.STORE_NM LIKE '충북%%' OR st.STORE_NM LIKE '충남%%' 
          OR st.STORE_NM LIKE '대전%%' THEN '충청권'
        WHEN st.STORE_NM LIKE '광주%%' OR st.STORE_NM LIKE '전북%%' 
          OR st.STORE_NM LIKE '전남%%' OR st.STORE_NM LIKE '제주%%' THEN '호남+제주권'
        WHEN st.STORE_NM LIKE '부산%%' OR st.STORE_NM LIKE '대구%%' 
          OR st.STORE_NM LIKE '울산%%' OR st.STORE_NM LIKE '경북%%' 
          OR st.STORE_NM LIKE '경남%%' THEN '영남권'
        ELSE '기타'
    END
"""


@router.get("/region-metrics", response_model=RegionSegmentMetricsResponse)
def get_region_segment_metrics(
    region: Optional[str] = Query(None, description="권역 필터 (수도권+강원권 / 충청권 / 호남+제주권 / 영남권)"),
    segment: Optional[str] = Query(None, description="세그먼트명(SEGMENT_NM) 필터"),
    start_month: Optional[int] = Query(
        None, description="조회 시작 연월 (YYYYMM). 미지정 시 전체 기간"
    ),
    end_month: Optional[int] = Query(
        None, description="조회 종료 연월 (YYYYMM). 미지정 시 전체 기간"
    ),
    db: Session = Depends(get_db),
):
    """
    권역·세그먼트별 고객 수, 구매건수, 매출, 수량 및 1인당 평균 지표 집계
    """

    base_sql = f"""
        SELECT
            {REGION_CASE_SQL} AS region,
            cs.SEGMENT_NM AS segment,
            COUNT(DISTINCT sa.CUSTOMER_ID) AS customer_count,
            COUNT(DISTINCT sa.SALE_ID)     AS purchase_count,
            SUM(sa.TOTAL_AMT)              AS total_amount,
            SUM(sa.QTY)                    AS total_qty,
            AVG(sa.TOTAL_AMT)              AS avg_amount_per_txn
        FROM SALES sa
        INNER JOIN STORE st ON sa.STORE_ID = st.STORE_ID
        INNER JOIN CUSTOMER_SEGMENT_LOG csl ON sa.CUSTOMER_ID = csl.CUSTOMER_ID
        INNER JOIN CUSTOMER_SEGMENT cs      ON csl.SEGMENT_ID = cs.SEGMENT_ID
        WHERE sa.SALE_STATUS = '정상'
          AND cs.ACTIVE_FLAG = 'Y'
    """

    where_clauses = []
    params: Dict[str, object] = {}

    if start_month is not None:
        where_clauses.append("sa.SALE_YYYYMM >= :start_yyyymm")
        params["start_yyyymm"] = start_month
    if end_month is not None:
        where_clauses.append("sa.SALE_YYYYMM <= :end_yyyymm")
        params["end_yyyymm"] = end_month
    if segment:
        where_clauses.append("cs.SEGMENT_NM = :segment_nm")
        params["segment_nm"] = segment

    if where_clauses:
        base_sql += " AND " + " AND ".join(where_clauses)

    base_sql += """
        GROUP BY region, cs.SEGMENT_NM
    """

    rows = db.execute(text(base_sql), params).mappings().all()

    # region 파라미터는 SELECT 레벨 alias 이므로 Python 쪽에서 필터링
    if region:
        rows = [row for row in rows if row["region"] == region]

    items: List[RegionSegmentMetricsItem] = []
    for row in rows:
        customer_count = int(row.get("customer_count") or 0)
        purchase_count = int(row.get("purchase_count") or 0)
        total_amount = int(row.get("total_amount") or 0)
        total_qty = int(row.get("total_qty") or 0)
        avg_per_txn = float(row.get("avg_amount_per_txn") or 0.0)

        if customer_count > 0:
            avg_amount_per_customer = total_amount / customer_count
            avg_purchase_count = purchase_count / customer_count
            avg_qty_per_customer = total_qty / customer_count
        else:
            avg_amount_per_customer = 0.0
            avg_purchase_count = 0.0
            avg_qty_per_customer = 0.0

        items.append(
            RegionSegmentMetricsItem(
                region=row["region"],
                segment=row["segment"],
                customerCount=customer_count,
                purchaseCount=purchase_count,
                totalAmount=total_amount,
                totalQty=total_qty,
                avgAmountPerTxn=avg_per_txn,
                avgAmountPerCustomer=avg_amount_per_customer,
                avgPurchaseCount=avg_purchase_count,
                avgQtyPerCustomer=avg_qty_per_customer,
            )
        )

    return RegionSegmentMetricsResponse(items=items)


@router.get("/region-trend", response_model=RegionSegmentTrendResponse)
def get_region_segment_trend(
    region: Optional[str] = Query(None, description="권역 필터"),
    segment: Optional[str] = Query(None, description="세그먼트명(SEGMENT_NM) 필터"),
    start_month: Optional[int] = Query(
        None, description="조회 시작 연월 (YYYYMM). 미지정 시 전체 기간"
    ),
    end_month: Optional[int] = Query(
        None, description="조회 종료 연월 (YYYYMM). 미지정 시 전체 기간"
    ),
    db: Session = Depends(get_db),
):
    """
    권역·세그먼트별 월별 매출/건수/고객수/수량 추이
    """

    base_sql = f"""
        SELECT
            {REGION_CASE_SQL} AS region,
            cs.SEGMENT_NM AS segment,
            sa.SALE_YYYYMM AS yyyymm,
            COUNT(DISTINCT sa.CUSTOMER_ID) AS customer_count,
            COUNT(DISTINCT sa.SALE_ID)     AS purchase_count,
            SUM(sa.TOTAL_AMT)              AS total_amount,
            SUM(sa.QTY)                    AS total_qty
        FROM SALES sa
        INNER JOIN STORE st ON sa.STORE_ID = st.STORE_ID
        INNER JOIN CUSTOMER_SEGMENT_LOG csl ON sa.CUSTOMER_ID = csl.CUSTOMER_ID
        INNER JOIN CUSTOMER_SEGMENT cs      ON csl.SEGMENT_ID = cs.SEGMENT_ID
        WHERE sa.SALE_STATUS = '정상'
          AND cs.ACTIVE_FLAG = 'Y'
    """

    where_clauses = []
    params: Dict[str, object] = {}

    if start_month is not None:
        where_clauses.append("sa.SALE_YYYYMM >= :start_yyyymm")
        params["start_yyyymm"] = start_month
    if end_month is not None:
        where_clauses.append("sa.SALE_YYYYMM <= :end_yyyymm")
        params["end_yyyymm"] = end_month
    if segment:
        where_clauses.append("cs.SEGMENT_NM = :segment_nm")
        params["segment_nm"] = segment

    if where_clauses:
        base_sql += " AND " + " AND ".join(where_clauses)

    base_sql += """
        GROUP BY region, cs.SEGMENT_NM, sa.SALE_YYYYMM
        ORDER BY sa.SALE_YYYYMM
    """

    rows = db.execute(text(base_sql), params).mappings().all()

    if region:
        rows = [row for row in rows if row["region"] == region]

    items: List[RegionSegmentTrendItem] = []
    for row in rows:
        yyyymm = str(row["yyyymm"])
        if len(yyyymm) == 6:
            month = f"{yyyymm[0:4]}-{yyyymm[4:6]}"
        else:
            month = yyyymm

        items.append(
            RegionSegmentTrendItem(
                month=month,
                region=row["region"],
                segment=row["segment"],
                sales=int(row.get("total_amount") or 0),
                orders=int(row.get("purchase_count") or 0),
                customers=int(row.get("customer_count") or 0),
                qty=int(row.get("total_qty") or 0),
            )
        )

    return RegionSegmentTrendResponse(items=items)


@router.get("/top-categories", response_model=RegionSegmentTopCategoriesResponse)
def get_region_segment_top_categories(
    region: Optional[str] = Query(None, description="권역 필터"),
    segment: Optional[str] = Query(None, description="세그먼트명(SEGMENT_NM) 필터"),
    top_n: int = Query(3, ge=1, le=10, description="권역·세그먼트별 상위 카테고리 개수"),
    start_month: Optional[int] = Query(
        None, description="조회 시작 연월 (YYYYMM). 미지정 시 전체 기간"
    ),
    end_month: Optional[int] = Query(
        None, description="조회 종료 연월 (YYYYMM). 미지정 시 전체 기간"
    ),
    db: Session = Depends(get_db),
):
    """
    권역·세그먼트별 카테고리 매출 상위 N개
    """

    base_sql = f"""
        SELECT
            {REGION_CASE_SQL} AS region,
            cs.SEGMENT_NM AS segment,
            p.CATEGORY AS category,
            SUM(sa.TOTAL_AMT) AS total_amount
        FROM SALES sa
        INNER JOIN STORE st ON sa.STORE_ID = st.STORE_ID
        INNER JOIN CUSTOMER_SEGMENT_LOG csl ON sa.CUSTOMER_ID = csl.CUSTOMER_ID
        INNER JOIN CUSTOMER_SEGMENT cs      ON csl.SEGMENT_ID = cs.SEGMENT_ID
        INNER JOIN PRODUCT p                ON sa.PROD_ID = p.PROD_ID
        WHERE sa.SALE_STATUS = '정상'
          AND cs.ACTIVE_FLAG = 'Y'
          AND p.CATEGORY IS NOT NULL
    """

    where_clauses = []
    params: Dict[str, object] = {}

    if start_month is not None:
        where_clauses.append("sa.SALE_YYYYMM >= :start_yyyymm")
        params["start_yyyymm"] = start_month
    if end_month is not None:
        where_clauses.append("sa.SALE_YYYYMM <= :end_yyyymm")
        params["end_yyyymm"] = end_month
    if segment:
        where_clauses.append("cs.SEGMENT_NM = :segment_nm")
        params["segment_nm"] = segment

    if where_clauses:
        base_sql += " AND " + " AND ".join(where_clauses)

    base_sql += """
        GROUP BY region, cs.SEGMENT_NM, p.CATEGORY
    """

    rows = db.execute(text(base_sql), params).mappings().all()

    if region:
        rows = [row for row in rows if row["region"] == region]

    # region+segment 별로 그룹핑 후 상위 N개 및 share 계산
    grouped: Dict[str, List[dict]] = {}
    for row in rows:
        key = f"{row['region']}|{row['segment']}"
        grouped.setdefault(key, []).append(row)

    items: List[RegionSegmentTopCategoryItem] = []
    for key, values in grouped.items():
        total_sales = sum(int(v.get("total_amount") or 0) for v in values)
        # 매출 기준 내림차순 정렬
        sorted_vals = sorted(
            values, key=lambda v: int(v.get("total_amount") or 0), reverse=True
        )
        for rank, v in enumerate(sorted_vals[:top_n], start=1):
            sales = int(v.get("total_amount") or 0)
            share = float(sales / total_sales) if total_sales > 0 else 0.0
            items.append(
                RegionSegmentTopCategoryItem(
                    region=v["region"],
                    segment=v["segment"],
                    rank=rank,
                    category=v["category"],
                    sales=sales,
                    share=share,
                )
            )

    return RegionSegmentTopCategoriesResponse(items=items)


@router.get("/top-products", response_model=RegionSegmentTopProductsResponse)
def get_region_segment_top_products(
    region: Optional[str] = Query(None, description="권역 필터"),
    segment: Optional[str] = Query(None, description="세그먼트명(SEGMENT_NM) 필터"),
    top_n: int = Query(5, ge=1, le=50, description="세그먼트별 상위 상품 개수"),
    start_month: Optional[int] = Query(
        None, description="조회 시작 연월 (YYYYMM). 미지정 시 전체 기간"
    ),
    end_month: Optional[int] = Query(
        None, description="조회 종료 연월 (YYYYMM). 미지정 시 전체 기간"
    ),
    db: Session = Depends(get_db),
):
    """
    권역·세그먼트별 상품 매출 상위 N개
    """

    base_sql = f"""
        SELECT
            {REGION_CASE_SQL} AS region,
            cs.SEGMENT_NM AS segment,
            sa.PROD_ID AS prod_id,
            sa.PROD_NM AS prod_nm,
            SUM(sa.TOTAL_AMT) AS total_amount,
            SUM(sa.QTY)       AS total_qty
        FROM SALES sa
        INNER JOIN STORE st ON sa.STORE_ID = st.STORE_ID
        INNER JOIN CUSTOMER_SEGMENT_LOG csl ON sa.CUSTOMER_ID = csl.CUSTOMER_ID
        INNER JOIN CUSTOMER_SEGMENT cs      ON csl.SEGMENT_ID = cs.SEGMENT_ID
        WHERE sa.SALE_STATUS = '정상'
          AND cs.ACTIVE_FLAG = 'Y'
    """

    where_clauses = []
    params: Dict[str, object] = {}

    if start_month is not None:
        where_clauses.append("sa.SALE_YYYYMM >= :start_yyyymm")
        params["start_yyyymm"] = start_month
    if end_month is not None:
        where_clauses.append("sa.SALE_YYYYMM <= :end_yyyymm")
        params["end_yyyymm"] = end_month
    if segment:
        where_clauses.append("cs.SEGMENT_NM = :segment_nm")
        params["segment_nm"] = segment

    if where_clauses:
        base_sql += " AND " + " AND ".join(where_clauses)

    base_sql += """
        GROUP BY region, cs.SEGMENT_NM, sa.PROD_ID, sa.PROD_NM
    """

    rows = db.execute(text(base_sql), params).mappings().all()

    if region:
        rows = [row for row in rows if row["region"] == region]

    grouped: Dict[str, List[dict]] = {}
    for row in rows:
        key = f"{row['region']}|{row['segment']}"
        grouped.setdefault(key, []).append(row)

    items: List[RegionSegmentTopProductItem] = []
    for key, values in grouped.items():
        # 세그먼트 내 매출 기준 상위 top_n
        sorted_vals = sorted(
            values, key=lambda v: int(v.get("total_amount") or 0), reverse=True
        )
        for rank, v in enumerate(sorted_vals[:top_n], start=1):
            items.append(
                RegionSegmentTopProductItem(
                    region=v["region"],
                    segment=v["segment"],
                    rank=rank,
                    prodId=v["prod_id"],
                    prodNm=v.get("prod_nm"),
                    category=None,
                    sales=int(v.get("total_amount") or 0),
                    qty=int(v.get("total_qty") or 0),
                )
            )

    return RegionSegmentTopProductsResponse(items=items)


