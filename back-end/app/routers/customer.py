from datetime import date, datetime
from typing import Optional, Dict, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.customer import (
    CustomerListResponse,
    CustomerListItem,
    CustomerDetailResponse,
    CustomerDetailRfm,
    CustomerDetailPurchaseItem,
)


router = APIRouter(tags=["customers"])


@router.get("/customers", response_model=CustomerListResponse)
def get_customers(
    db: Session = Depends(get_db),
    store_id: Optional[str] = Query(
        None, description="점포 ID. 지정 시 해당 점포에서 구매 이력이 있는 고객만 조회"
    ),
    gender: Optional[str] = Query(None, description="고객 성별 필터 (예: 남 / 여)"),
    age_group: Optional[str] = Query(None, description="연령대 필터 (예: 20대, 30대)"),
    region: Optional[str] = Query(None, description="고객 거주 지역명 필터 (예: 서울)"),
    segment: Optional[str] = Query(
        None, description="고객 세그먼트명(SEGMENT_NM) 필터 (예: F01 · 우량고객)"
    ),
    start_signup_dt: Optional[date] = Query(
        None, description="가입 시작일 (YYYY-MM-DD)"
    ),
    end_signup_dt: Optional[date] = Query(
        None, description="가입 종료일 (YYYY-MM-DD)"
    ),
    start_last_purchase_dt: Optional[date] = Query(
        None, description="최근구매 시작일 (YYYY-MM-DD)"
    ),
    end_last_purchase_dt: Optional[date] = Query(
        None, description="최근구매 종료일 (YYYY-MM-DD)"
    ),
    signup_channel: Optional[str] = Query(
        None, description="가입 채널 필터 (예: 오프라인 / 온라인)"
    ),
    min_total_amount: Optional[int] = Query(
        None, description="총구매액 하한 (원 단위)", ge=0
    ),
    max_total_amount: Optional[int] = Query(
        None, description="총구매액 상한 (원 단위)", ge=0
    ),
    min_purchase_count: Optional[int] = Query(
        None, description="구매횟수 하한", ge=0
    ),
    max_purchase_count: Optional[int] = Query(
        None, description="구매횟수 상한", ge=0
    ),
    sort: Optional[str] = Query(
        "last_purchase_desc",
        description=(
            "정렬 기준: "
            "last_purchase_desc | last_purchase_asc | "
            "amount_desc | amount_asc | "
            "count_desc | count_asc | "
            "signup_desc | signup_asc"
        ),
    ),
    keyword: Optional[str] = Query(
        None, description="고객 ID 부분 검색 (대소문자 구분 없음)"
    ),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    """
    고객 목록 조회

    - store_id 미지정 시: 전체 고객 기준 글로벌 지표
    - store_id 지정 시: 해당 점포에서 한 번이라도 구매한 고객만 조회
    """

    offset = (page - 1) * page_size

    # 점포별 조회인 경우에는 INNER JOIN, 전체 조회는 LEFT JOIN 으로 처리
    where_clauses = []
    params: Dict[str, object] = {}

    if store_id:
        join_clause = """
        INNER JOIN SALES sa
            ON sa.CUSTOMER_ID = c.CUSTOMER_ID
           AND sa.SALE_STATUS = '정상'
           AND sa.STORE_ID = :store_id
        """
        params["store_id"] = store_id
    else:
        join_clause = """
        LEFT JOIN SALES sa
            ON sa.CUSTOMER_ID = c.CUSTOMER_ID
           AND sa.SALE_STATUS = '정상'
        """

    # CUSTOMER_SEGMENT_LOG 에 여러 이력이 있을 수 있으므로,
    # 고객별로 START_DT 가장 최신(최근)인 세그먼트만 선택해서 조인
    base_from = f"""
        FROM CUSTOMER c
        {join_clause}
        LEFT JOIN (
            SELECT csl1.CUSTOMER_ID, csl1.SEGMENT_ID
            FROM CUSTOMER_SEGMENT_LOG csl1
            INNER JOIN (
                SELECT CUSTOMER_ID, MAX(START_DT) AS max_start_dt
                FROM CUSTOMER_SEGMENT_LOG
                GROUP BY CUSTOMER_ID
            ) latest
              ON csl1.CUSTOMER_ID = latest.CUSTOMER_ID
             AND csl1.START_DT = latest.max_start_dt
        ) csl
            ON csl.CUSTOMER_ID = c.CUSTOMER_ID
        LEFT JOIN CUSTOMER_SEGMENT cs
            ON cs.SEGMENT_ID = csl.SEGMENT_ID
        WHERE 1=1
    """

    if gender:
        where_clauses.append("c.GENDER = :gender")
        params["gender"] = gender

    if age_group:
        where_clauses.append("c.AGE_GROUP = :age_group")
        params["age_group"] = age_group

    if region:
        # '서울' 처럼 앞부분만 넘어와도 매칭될 수 있도록 prefix 매칭
        where_clauses.append("c.REGION LIKE :region_prefix")
        params["region_prefix"] = f"{region}%"

    if segment:
        where_clauses.append("cs.SEGMENT_NM = :segment_nm")
        params["segment_nm"] = segment

    if start_signup_dt:
        where_clauses.append("c.SIGNUP_DT >= :start_signup_dt")
        params["start_signup_dt"] = start_signup_dt

    if end_signup_dt:
        where_clauses.append("c.SIGNUP_DT <= :end_signup_dt")
        params["end_signup_dt"] = end_signup_dt

    if start_last_purchase_dt:
        where_clauses.append("sa.SALE_DT >= :start_last_purchase_dt")
        params["start_last_purchase_dt"] = start_last_purchase_dt

    if end_last_purchase_dt:
        where_clauses.append("sa.SALE_DT <= :end_last_purchase_dt")
        params["end_last_purchase_dt"] = end_last_purchase_dt

    if signup_channel:
        where_clauses.append("c.SIGNUP_CHANNEL = :signup_channel")
        params["signup_channel"] = signup_channel

    if keyword:
        where_clauses.append("LOWER(c.CUSTOMER_ID) LIKE :keyword")
        params["keyword"] = f"%{keyword.lower()}%"

    if where_clauses:
        base_from += " AND " + " AND ".join(where_clauses)

    group_by = """
        GROUP BY
            c.CUSTOMER_ID,
            c.GENDER,
            c.AGE_GROUP,
            c.REGION,
            c.SIGNUP_DT,
            c.SIGNUP_CHANNEL,
            cs.SEGMENT_NM
    """

    # 집계 값 기반 필터 (총구매액, 구매횟수)는 HAVING 절로 처리
    having_clauses: List[str] = []
    if min_total_amount is not None:
        having_clauses.append(
            "COALESCE(SUM(sa.TOTAL_AMT), 0) >= :min_total_amount"
        )
        params["min_total_amount"] = min_total_amount
    if max_total_amount is not None:
        having_clauses.append(
            "COALESCE(SUM(sa.TOTAL_AMT), 0) <= :max_total_amount"
        )
        params["max_total_amount"] = max_total_amount

    if min_purchase_count is not None:
        having_clauses.append(
            "COALESCE(COUNT(DISTINCT sa.SALE_ID), 0) >= :min_purchase_count"
        )
        params["min_purchase_count"] = min_purchase_count
    if max_purchase_count is not None:
        having_clauses.append(
            "COALESCE(COUNT(DISTINCT sa.SALE_ID), 0) <= :max_purchase_count"
        )
        params["max_purchase_count"] = max_purchase_count

    having_sql = ""
    if having_clauses:
        having_sql = " HAVING " + " AND ".join(having_clauses)

    # 총 건수 계산
    count_sql = f"""
        SELECT COUNT(*) AS cnt
        FROM (
            SELECT c.CUSTOMER_ID
            {base_from}
            {group_by}
            {having_sql}
        ) t
    """
    total_row = db.execute(text(count_sql), params).mappings().first()
    total = int(total_row["cnt"]) if total_row and total_row["cnt"] is not None else 0

    # 실제 데이터 조회
    if sort == "amount_desc":
        order_by_sql = """
        ORDER BY
            total_amount DESC,
            c.CUSTOMER_ID
        """
    elif sort == "amount_asc":
        order_by_sql = """
        ORDER BY
            total_amount ASC,
            c.CUSTOMER_ID
        """
    elif sort == "count_desc":
        order_by_sql = """
        ORDER BY
            purchase_count DESC,
            c.CUSTOMER_ID
        """
    elif sort == "count_asc":
        order_by_sql = """
        ORDER BY
            purchase_count ASC,
            c.CUSTOMER_ID
        """
    elif sort == "signup_desc":
        order_by_sql = """
        ORDER BY
            c.SIGNUP_DT DESC,
            c.CUSTOMER_ID
        """
    elif sort == "signup_asc":
        order_by_sql = """
        ORDER BY
            c.SIGNUP_DT ASC,
            c.CUSTOMER_ID
        """
    else:
        # 기본: 최근 구매일 내림차순, 없는 고객은 뒤로
        if sort == "last_purchase_asc":
            order_by_sql = """
            ORDER BY
                last_purchase_dt IS NULL ASC,
                last_purchase_dt ASC,
                c.CUSTOMER_ID
            """
        else:
            order_by_sql = """
            ORDER BY
                last_purchase_dt IS NULL ASC,
                last_purchase_dt DESC,
                c.CUSTOMER_ID
            """

    data_sql = f"""
        SELECT
            c.CUSTOMER_ID      AS customer_id,
            c.GENDER           AS gender,
            c.AGE_GROUP        AS age_group,
            c.REGION           AS region,
            c.SIGNUP_DT        AS signup_dt,
            c.SIGNUP_CHANNEL   AS signup_channel,
            cs.SEGMENT_NM      AS segment_nm,
            MAX(sa.SALE_DT)    AS last_purchase_dt,
            COALESCE(SUM(sa.TOTAL_AMT), 0)          AS total_amount,
            COALESCE(COUNT(DISTINCT sa.SALE_ID), 0) AS purchase_count
        {base_from}
        {group_by}
        {having_sql}
        {order_by_sql}
        LIMIT :limit OFFSET :offset
    """

    params_with_paging = dict(params)
    params_with_paging["limit"] = page_size
    params_with_paging["offset"] = offset

    rows = db.execute(text(data_sql), params_with_paging).mappings().all()

    items = []
    for row in rows:
        last_purchase = row.get("last_purchase_dt")
        # 날짜 컬럼이 datetime 으로 들어오는 경우 date 로 변환
        if last_purchase is not None and hasattr(last_purchase, "date"):
            last_purchase = last_purchase.date()

        items.append(
            CustomerListItem(
                customerId=row["customer_id"],
                gender=row.get("gender"),
                ageGroup=row.get("age_group"),
                region=row.get("region"),
                signupDt=row["signup_dt"],
                signupChannel=row.get("signup_channel"),
                lastPurchaseDt=last_purchase,
                totalAmount=int(row.get("total_amount") or 0),
                purchaseCount=int(row.get("purchase_count") or 0),
                segment=row.get("segment_nm"),
            )
        )

    return CustomerListResponse(
        items=items,
        total=total,
        page=page,
        pageSize=page_size,
    )


@router.get("/customers/{customer_id}", response_model=CustomerDetailResponse)
def get_customer_detail(customer_id: str, db: Session = Depends(get_db)):
    """
    단일 고객 상세 조회

    - CUSTOMER 기본 정보
    - 최신 세그먼트
    - 총 구매액/구매횟수/최근구매일
    - 단순 RFM 점수
    - 최근 주문 이력 (SALE_ID 단위 상위 5건)
    """

    # 기본 프로필 + 집계 정보
    profile_sql = """
        SELECT
            c.CUSTOMER_ID      AS customer_id,
            c.GENDER           AS gender,
            c.AGE_GROUP        AS age_group,
            c.REGION           AS region,
            c.SIGNUP_DT        AS signup_dt,
            c.SIGNUP_CHANNEL   AS signup_channel,
            cs.SEGMENT_NM      AS segment_nm,
            COALESCE(SUM(sa.TOTAL_AMT), 0)          AS total_amount,
            COALESCE(COUNT(DISTINCT sa.SALE_ID), 0) AS purchase_count,
            MAX(sa.SALE_DT)                         AS last_purchase_dt
        FROM CUSTOMER c
        LEFT JOIN SALES sa
            ON sa.CUSTOMER_ID = c.CUSTOMER_ID
           AND sa.SALE_STATUS = '정상'
        LEFT JOIN (
            SELECT csl1.CUSTOMER_ID, csl1.SEGMENT_ID
            FROM CUSTOMER_SEGMENT_LOG csl1
            INNER JOIN (
                SELECT CUSTOMER_ID, MAX(START_DT) AS max_start_dt
                FROM CUSTOMER_SEGMENT_LOG
                GROUP BY CUSTOMER_ID
            ) latest
              ON csl1.CUSTOMER_ID = latest.CUSTOMER_ID
             AND csl1.START_DT = latest.max_start_dt
        ) csl
            ON csl.CUSTOMER_ID = c.CUSTOMER_ID
        LEFT JOIN CUSTOMER_SEGMENT cs
            ON cs.SEGMENT_ID = csl.SEGMENT_ID
        WHERE c.CUSTOMER_ID = :customer_id
        GROUP BY
            c.CUSTOMER_ID,
            c.GENDER,
            c.AGE_GROUP,
            c.REGION,
            c.SIGNUP_DT,
            c.SIGNUP_CHANNEL,
            cs.SEGMENT_NM
    """

    profile_row = db.execute(
        text(profile_sql), {"customer_id": customer_id}
    ).mappings().first()

    if not profile_row:
        # 존재하지 않는 고객인 경우 404 대신 빈 기본 구조 반환
        # (프론트에서 에러 메시지 처리 대신 안전하게 렌더링 가능하도록)
        empty_rfm = CustomerDetailRfm(recency=0, frequency=0, monetary=0)
        return CustomerDetailResponse(
            customerId=customer_id,
            gender=None,
            ageGroup=None,
            region=None,
            signupDt=date.today(),
            signupChannel=None,
            segment=None,
            totalAmount=0,
            purchaseCount=0,
            lastPurchaseDt=None,
            rfm=empty_rfm,
            recentPurchases=[],
        )

    total_amount = int(profile_row.get("total_amount") or 0)
    purchase_count = int(profile_row.get("purchase_count") or 0)
    last_purchase_dt = profile_row.get("last_purchase_dt")

    # RFM 점수 계산 (간단 버전)
    # Recency: 최근 구매일 기준으로 1~5 점 (가까울수록 높게)
    recency_score = 0
    if isinstance(last_purchase_dt, datetime):
        days_diff = (datetime.utcnow().date() - last_purchase_dt.date()).days
        if days_diff <= 30:
            recency_score = 5
        elif days_diff <= 60:
            recency_score = 4
        elif days_diff <= 90:
            recency_score = 3
        elif days_diff <= 180:
            recency_score = 2
        else:
            recency_score = 1

    # Frequency: 구매 횟수 기준 1~10 점 (최대 10점)
    if purchase_count <= 0:
        frequency_score = 0
    else:
        frequency_score = min(purchase_count, 10)

    # Monetary: 총 구매액 그대로 사용
    monetary_score = total_amount

    rfm = CustomerDetailRfm(
        recency=recency_score,
        frequency=frequency_score,
        monetary=monetary_score,
    )

    # 최근 주문 이력 (SALE_ID 단위 상위 5건)
    purchases_sql = """
        SELECT
            sa.SALE_DT   AS sale_dt,
            sa.SALE_ID   AS sale_id,
            SUM(sa.TOTAL_AMT) AS amount,
            MIN(sa.PROD_NM)   AS any_prod_nm,
            COUNT(DISTINCT sa.PROD_ID) AS prod_cnt
        FROM SALES sa
        WHERE sa.CUSTOMER_ID = :customer_id
          AND sa.SALE_STATUS = '정상'
        GROUP BY sa.SALE_ID, sa.SALE_DT
        ORDER BY sa.SALE_DT DESC
        LIMIT 5
    """

    purchase_rows = db.execute(
        text(purchases_sql), {"customer_id": customer_id}
    ).mappings().all()

    recent_purchases: List[CustomerDetailPurchaseItem] = []
    for row in purchase_rows:
        prod_cnt = int(row.get("prod_cnt") or 0)
        prod_nm = row.get("any_prod_nm") or ""
        if prod_cnt <= 1:
            desc = prod_nm
        else:
            desc = f"{prod_nm} 외 {prod_cnt - 1}건"

        recent_purchases.append(
            CustomerDetailPurchaseItem(
                saleDt=row["sale_dt"],
                saleId=row["sale_id"],
                amount=int(row.get("amount") or 0),
                products=desc,
            )
        )

    return CustomerDetailResponse(
        customerId=profile_row["customer_id"],
        gender=profile_row.get("gender"),
        ageGroup=profile_row.get("age_group"),
        region=profile_row.get("region"),
        signupDt=profile_row["signup_dt"],
        signupChannel=profile_row.get("signup_channel"),
        segment=profile_row.get("segment_nm"),
        totalAmount=total_amount,
        purchaseCount=purchase_count,
        lastPurchaseDt=last_purchase_dt.date() if last_purchase_dt else None,
        rfm=rfm,
        recentPurchases=recent_purchases,
    )


