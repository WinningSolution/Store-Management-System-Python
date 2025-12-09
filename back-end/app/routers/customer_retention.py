from typing import Optional, List, Dict

from fastapi import APIRouter, Query, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.customer_retention import (
    RetentionTrendResponse,
    RetentionTrendItem,
    CohortRetentionResponse,
    CohortRetentionItem,
)


router = APIRouter(prefix="/customer/retention", tags=["customer-retention"])


def _fetch_cohort_rows(
    db: Session,
    start_month: Optional[int],
    end_month: Optional[int],
    store_id: Optional[str] = None,
) -> List[Dict[str, object]]:
    """
    SALES 테이블 기준 코호트 리텐션 계산용 기초 데이터 조회

    - first_yyyymm: 고객별 최초 구매 연월(코호트)
    - period: 최초 구매 월 대비 경과 개월수 (0=M+0, 1=M+1, ...)
    - retained_customers: 해당 period 에 재구매한 고객 수
    - cohort_size: 코호트에 속한 전체 고객 수
    """

    params: Dict[str, object] = {}

    # 점포가 지정된 경우:
    # - 코호트: "해당 점포에서 브랜드 첫 구매가 발생한 고객" (전국 최초 구매월이 이 점포에서 일어난 경우)
    # - 리텐션: 이후 구매는 점포 구분 없이 전체 구매 기준으로 계산
    if store_id:
        params["store_id"] = store_id

        sql = """
            SELECT
                t.first_yyyymm,
                t.period,
                t.retained_customers,
                cs.cohort_size
            FROM (
                SELECT
                    bf.global_first_yyyymm AS first_yyyymm,
                    (
                        (sa.SALE_YYYYMM DIV 100) * 12
                        + (sa.SALE_YYYYMM % 100)
                        - (bf.global_first_yyyymm DIV 100) * 12
                        - (bf.global_first_yyyymm % 100)
                    ) AS period,
                    COUNT(DISTINCT sa.CUSTOMER_ID) AS retained_customers
                FROM (
                    SELECT
                        s.CUSTOMER_ID,
                        MIN(s.SALE_YYYYMM) AS global_first_yyyymm
                    FROM SALES s
                    WHERE s.SALE_STATUS = '정상'
                      AND s.CUSTOMER_ID IS NOT NULL
                    GROUP BY s.CUSTOMER_ID
                ) bf
                JOIN SALES sf
                  ON sf.CUSTOMER_ID = bf.CUSTOMER_ID
                 AND sf.SALE_YYYYMM = bf.global_first_yyyymm
                 AND sf.STORE_ID = :store_id
                JOIN SALES sa
                  ON sa.CUSTOMER_ID = bf.CUSTOMER_ID
                 AND sa.SALE_STATUS = '정상'
                GROUP BY bf.global_first_yyyymm, period
                HAVING period BETWEEN 0 AND 5
            ) t
            JOIN (
                SELECT
                    bf.global_first_yyyymm AS first_yyyymm,
                    COUNT(DISTINCT bf.CUSTOMER_ID) AS cohort_size
                FROM (
                    SELECT
                        s.CUSTOMER_ID,
                        MIN(s.SALE_YYYYMM) AS global_first_yyyymm
                    FROM SALES s
                    WHERE s.SALE_STATUS = '정상'
                      AND s.CUSTOMER_ID IS NOT NULL
                    GROUP BY s.CUSTOMER_ID
                ) bf
                JOIN SALES sf
                  ON sf.CUSTOMER_ID = bf.CUSTOMER_ID
                 AND sf.SALE_YYYYMM = bf.global_first_yyyymm
                 AND sf.STORE_ID = :store_id
                GROUP BY bf.global_first_yyyymm
            ) cs
              ON t.first_yyyymm = cs.first_yyyymm
            WHERE 1=1
        """

        where_extra: List[str] = []
        if start_month is not None:
            where_extra.append("t.first_yyyymm >= :start_yyyymm")
            params["start_yyyymm"] = start_month
        if end_month is not None:
            where_extra.append("t.first_yyyymm <= :end_yyyymm")
            params["end_yyyymm"] = end_month

        if where_extra:
            sql += " AND " + " AND ".join(where_extra)

        rows = db.execute(text(sql), params).mappings().all()
        return rows

    # 점포 미지정: 기존 전국 기준 로직 (최초 구매월/재구매 모두 전체 기준)
    store_filter_sales = ""
    store_filter_first = ""

    sql = f"""
        SELECT
            t.first_yyyymm,
            t.period,
            t.retained_customers,
            cs.cohort_size
        FROM (
            SELECT
                fp.first_yyyymm,
                (
                    (sa.SALE_YYYYMM DIV 100) * 12 + (sa.SALE_YYYYMM % 100)
                    - (fp.first_yyyymm DIV 100) * 12 - (fp.first_yyyymm % 100)
                ) AS period,
                COUNT(DISTINCT sa.CUSTOMER_ID) AS retained_customers
            FROM SALES sa
            JOIN (
                SELECT
                    CUSTOMER_ID,
                    MIN(SALE_YYYYMM) AS first_yyyymm
                FROM SALES
                WHERE SALE_STATUS = '정상'
                  AND CUSTOMER_ID IS NOT NULL
                  {store_filter_first}
                GROUP BY CUSTOMER_ID
            ) fp
              ON sa.CUSTOMER_ID = fp.CUSTOMER_ID
            WHERE sa.SALE_STATUS = '정상'
              AND sa.CUSTOMER_ID IS NOT NULL
              {store_filter_sales}
            GROUP BY fp.first_yyyymm, period
            HAVING period BETWEEN 0 AND 5
        ) t
        JOIN (
            SELECT
                first_yyyymm,
                COUNT(*) AS cohort_size
            FROM (
                SELECT
                    CUSTOMER_ID,
                    MIN(SALE_YYYYMM) AS first_yyyymm
                FROM SALES
                WHERE SALE_STATUS = '정상'
                  AND CUSTOMER_ID IS NOT NULL
                  {store_filter_first}
                GROUP BY CUSTOMER_ID
            ) fp2
            GROUP BY first_yyyymm
        ) cs
          ON t.first_yyyymm = cs.first_yyyymm
        WHERE 1=1
    """
    where_extra: List[str] = []

    if start_month is not None:
        where_extra.append("t.first_yyyymm >= :start_yyyymm")
        params["start_yyyymm"] = start_month
    if end_month is not None:
        where_extra.append("t.first_yyyymm <= :end_yyyymm")
        params["end_yyyymm"] = end_month

    if where_extra:
        sql += " AND " + " AND ".join(where_extra)

    rows = db.execute(text(sql), params).mappings().all()
    return rows


@router.get("/trend", response_model=RetentionTrendResponse)
def get_retention_trend(
    start_month: Optional[int] = Query(
        None, description="코호트 시작 연월 하한 (YYYYMM). 미지정 시 전체 기간"
    ),
    end_month: Optional[int] = Query(
        None, description="코호트 시작 연월 상한 (YYYYMM). 미지정 시 전체 기간"
    ),
    store_id: Optional[str] = Query(
        None, description="점포 ID (단일 점포 기준 리텐션 추이). 미지정 시 전체 점포"
    ),
    db: Session = Depends(get_db),
):
    """
    전체 고객 기준 코호트 리텐션 평균 추이

    - 코호트: 고객별 최초 구매 월(SALE_YYYYMM)
    - period 0: 최초 구매 월, 1: +1개월, ...
    - retentionRate: 각 period 별 (재구매 고객 수 합계 / 코호트 고객 수 합계)
    """

    rows = _fetch_cohort_rows(
        db,
        start_month=start_month,
        end_month=end_month,
        store_id=store_id,
    )

    # period 별로 합산 후 평균 리텐션 계산
    agg: Dict[int, Dict[str, float]] = {}
    for row in rows:
        period = int(row["period"])
        retained = float(row["retained_customers"] or 0)
        cohort_size = float(row["cohort_size"] or 0)
        if cohort_size <= 0:
            continue
        d = agg.setdefault(period, {"retained": 0.0, "cohort": 0.0})
        d["retained"] += retained
        d["cohort"] += cohort_size

    items: List[RetentionTrendItem] = []
    for period, vals in sorted(agg.items(), key=lambda x: x[0]):
        if vals["cohort"] <= 0:
            continue
        rate = vals["retained"] / vals["cohort"]
        month_label = f"M+{period}"
        items.append(
            RetentionTrendItem(
                month=month_label,
                segment="전체",  # 현재는 전체 고객 기준. 추후 세그먼트별로 확장 가능
                retentionRate=rate,
            )
        )

    return RetentionTrendResponse(items=items)


@router.get("/cohort", response_model=CohortRetentionResponse)
def get_cohort_retention(
    start_month: Optional[int] = Query(
        None, description="코호트 시작 연월 하한 (YYYYMM). 미지정 시 전체 기간"
    ),
    end_month: Optional[int] = Query(
        None, description="코호트 시작 연월 상한 (YYYYMM). 미지정 시 전체 기간"
    ),
    store_id: Optional[str] = Query(
        None, description="점포 ID (단일 점포 기준 코호트 리텐션). 미지정 시 전체 점포"
    ),
    db: Session = Depends(get_db),
):
    """
    코호트별 월별 리텐션 히트맵 데이터

    - startMonth: 코호트 시작 월 (YYYY-MM)
    - period: 0=M+0, 1=M+1, ...
    - retention: 0~1 스케일의 리텐션율
    """

    rows = _fetch_cohort_rows(
        db,
        start_month=start_month,
        end_month=end_month,
        store_id=store_id,
    )

    items: List[CohortRetentionItem] = []
    for row in rows:
        first_yyyymm = int(row["first_yyyymm"])
        period = int(row["period"])
        retained = float(row["retained_customers"] or 0)
        cohort_size = float(row["cohort_size"] or 0)
        if cohort_size <= 0:
            continue

        y = first_yyyymm // 100
        m = first_yyyymm % 100
        start_month_str = f"{y:04d}-{m:02d}"

        retention = retained / cohort_size

        items.append(
            CohortRetentionItem(
                startMonth=start_month_str,
                period=period,
                retention=retention,
            )
        )

    return CohortRetentionResponse(items=items)


