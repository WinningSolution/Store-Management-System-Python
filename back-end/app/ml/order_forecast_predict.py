import os
import glob
from datetime import datetime, date
from typing import Optional, Tuple, List

import joblib
import numpy as np
import pandas as pd
import sqlalchemy as sa
from sqlalchemy.engine import Engine


# -----------------------------
# 1. DB 연결 설정 (train 스크립트와 동일)
# -----------------------------
DB_USER = os.getenv("DB_USER", "root")  # 기본값 변경
DB_PASSWORD = os.getenv("DB_PASSWORD", "1234")  # 기본값 변경
DB_HOST = os.getenv("DB_HOST", "mysql8")  # 기본값 변경 (컨테이너 이름)
DB_PORT = int(os.getenv("DB_PORT", "3306"))  # 기본값 변경 (내부 포트)
DB_NAME = os.getenv("DB_NAME", "winning_solution")  # 기본값 변경

ENGINE_URL = (
    f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    "?charset=utf8mb4"
)


def get_engine() -> Engine:
    return sa.create_engine(ENGINE_URL)


# -----------------------------
# 2. 최신 모델 로드
# -----------------------------
def load_latest_model() -> Tuple[object, List[str]]:
    """
    models 디렉토리에서 가장 최근에 저장된 order_forecast_v1_*.pkl 로드.
    반환: (model, feature_cols)
    """
    models_dir = os.path.join(os.path.dirname(__file__), "..", "models")
    pattern = os.path.join(models_dir, "order_forecast_v1_*.pkl")
    files = sorted(glob.glob(pattern))
    if not files:
        raise RuntimeError("저장된 주문 예측 모델(order_forecast_v1_*.pkl)을 찾을 수 없습니다.")

    latest_path = files[-1]
    print(f"[predict] 최신 모델 로딩: {latest_path}")
    bundle = joblib.load(latest_path)
    model = bundle["model"]
    feature_cols = bundle["features"]
    return model, feature_cols


# -----------------------------
# 3. 예측 대상 마트 로딩
# -----------------------------
def resolve_base_date(engine: Engine, base_date: Optional[str]) -> date:
    """
    base_date 가 None 이면 MART_ORDER_FORECAST_90D_LITE 의 최대 BASE_DATE 사용.
    문자열이 들어오면 YYYY-MM-DD 로 파싱.
    """
    if base_date:
        return datetime.strptime(base_date, "%Y-%m-%d").date()

    query = "SELECT MAX(BASE_DATE) AS max_dt FROM MART_ORDER_FORECAST_90D_LITE"
    with engine.connect() as conn:
        row = conn.execute(sa.text(query)).mappings().first()
    if not row or not row["max_dt"]:
        raise RuntimeError("MART_ORDER_FORECAST_90D_LITE 에서 BASE_DATE 를 찾을 수 없습니다.")
    return row["max_dt"]


def load_mart_for_date(
    engine: Engine,
    base_date: Optional[str] = None,
    store_id: Optional[str] = None,
) -> pd.DataFrame:
    """
    특정 BASE_DATE(와 선택적 STORE_ID)에 대한 MART_ORDER_FORECAST_90D_LITE 를 로드.
    train 스크립트와 동일하게 SALES_L180D 를 서브쿼리로 계산.
    """
    resolved_base = resolve_base_date(engine, base_date)
    print(f"[predict] 예측 기준일(BASE_DATE): {resolved_base}")

    params = {"base_date": resolved_base}
    where_clauses = ["m.BASE_DATE = :base_date"]

    if store_id:
        where_clauses.append("m.STORE_ID = :store_id")
        params["store_id"] = store_id

    where_sql = " AND ".join(where_clauses)

    query = f"""
    SELECT
      m.STORE_ID,
      m.PROD_ID,
      m.BASE_DATE,
      m.INVENTORY_QTY,
      m.SALES_L7D,
      m.SALES_L14D,
      m.SALES_L30D,
      m.IN_QTY_L7D,
      m.OUT_QTY_L7D,
      m.NET_MOVE_L7D,
      m.IN_QTY_L30D,
      m.OUT_QTY_L30D,
      m.NET_MOVE_L30D,
      m.SEASON,
      m.PROD_LINE,
      m.CATEGORY,
      m.DOW,
      m.IS_WEEKEND,
      (
        SELECT COALESCE(SUM(s.QTY), 0)
        FROM SALES s
        WHERE s.store_id = m.STORE_ID
          AND s.prod_id = m.PROD_ID
          AND DATE(s.sale_dt) >= DATE_SUB(m.BASE_DATE, INTERVAL 180 DAY)
          AND DATE(s.sale_dt) <  m.BASE_DATE
      ) AS SALES_L180D
    FROM MART_ORDER_FORECAST_90D_LITE m
    WHERE {where_sql}
    """
    df = pd.read_sql(sa.text(query), engine, params=params)
    if df.empty:
        print("[predict] 예측 대상 행이 없습니다.")
    else:
        print(f"[predict] 예측 대상 로우 수: {len(df):,}")
    return df


# -----------------------------
# 4. 피처 준비 (inference 용)
# -----------------------------
def prepare_features_for_inference(df: pd.DataFrame, feature_cols: List[str]) -> pd.DataFrame:
    """
    train 시점과 동일한 방식으로 one-hot 인코딩을 적용하고,
    저장된 feature_cols 순서에 맞게 컬럼을 맞춤.
    """
    if df.empty:
        return pd.DataFrame(columns=feature_cols)

    df_enc = pd.get_dummies(
        df,
        columns=["SEASON", "PROD_LINE", "CATEGORY"],
        dummy_na=True,
    )

    # 누락된 피처 컬럼은 0으로 채우고, 불필요한 컬럼은 무시
    for col in feature_cols:
        if col not in df_enc.columns:
            df_enc[col] = 0

    X = df_enc[feature_cols].fillna(0)
    return X


# -----------------------------
# 5. 우선순위 및 설명 텍스트 계산
# -----------------------------
def compute_priority_and_explain(
    row: pd.Series,
    pred_qty: float,
) -> Tuple[str, str, int]:
    """
    예측 결과를 바탕으로 추천 발주량, 우선순위, 설명 텍스트를 계산.
    - RECOMMEND_QTY = max(ceil(pred_7d) - curr_stock, 0)
    - 우선순위 예시:
        - 추천 발주량 <= 0        -> '보통'
        - 현재 재고 0 또는 2일 이하 -> '긴급'
        - 그 외 추천 발주량 > 0   -> '높음'
    """
    curr_stock = int(row["INVENTORY_QTY"] or 0)
    # 일단 7일 예측을 올림 처리해서 장 단위로 맞춤
    pred_7d = float(pred_qty)
    pred_ceil = int(np.ceil(pred_7d))

    recommend_qty = max(pred_ceil - curr_stock, 0)

    # 최근 7일 판매량(우선순위 계산용)
    last7 = int(row.get("SALES_L7D") or 0)
    daily_avg = last7 / 7.0 if last7 > 0 else 0.0

    # 우선순위 계산
    if recommend_qty <= 0:
        priority = "보통"
    else:
        # 일평균 판매 기준으로 현재 재고가 며칠분인지
        if daily_avg > 0:
            days_cover = curr_stock / daily_avg
        else:
            days_cover = float("inf")

        if curr_stock == 0 or days_cover <= 2:
            priority = "긴급"
        else:
            priority = "높음"

    # 설명 텍스트 (간단 템플릿) - 최근 7일 판매 이력 언급은 제거
    explain = f"다음 7일 예측 {pred_7d:.1f}장, 현재 재고 {curr_stock}장"

    return priority, explain, recommend_qty


# -----------------------------
# 6. 예측 실행 & MART_ORDER_FORECAST_RESULT 적재
# -----------------------------
def run_forecast_and_upsert(
    base_date: Optional[str] = None,
    store_id: Optional[str] = None,
) -> None:
    engine = get_engine()
    model, feature_cols = load_latest_model()

    df_raw = load_mart_for_date(engine, base_date=base_date, store_id=store_id)
    if df_raw.empty:
        print("[predict] 적재할 예측 대상이 없어 종료합니다.")
        return

    X = prepare_features_for_inference(df_raw, feature_cols)
    print(f"[predict] 피처 행렬 크기: {X.shape}")

    preds = model.predict(X)

    # INSERT ... ON DUPLICATE KEY UPDATE 로 적재
    insert_sql = sa.text(
        """
        INSERT INTO MART_ORDER_FORECAST_RESULT (
          STORE_ID,
          PROD_ID,
          BASE_DATE,
          PRED_7D_QTY,
          CURR_STOCK,
          RECOMMEND_QTY,
          PRIORITY,
          EXPLAIN_TEXT,
          CREATED_AT
        ) VALUES (
          :store_id,
          :prod_id,
          :base_date,
          :pred_7d_qty,
          :curr_stock,
          :recommend_qty,
          :priority,
          :explain_text,
          NOW()
        )
        ON DUPLICATE KEY UPDATE
          PRED_7D_QTY   = VALUES(PRED_7D_QTY),
          CURR_STOCK    = VALUES(CURR_STOCK),
          RECOMMEND_QTY = VALUES(RECOMMEND_QTY),
          PRIORITY      = VALUES(PRIORITY),
          EXPLAIN_TEXT  = VALUES(EXPLAIN_TEXT),
          CREATED_AT    = VALUES(CREATED_AT)
        """
    )

    params_list = []
    for i, row in df_raw.iterrows():
        pred = float(preds[i])
        priority, explain, recommend_qty = compute_priority_and_explain(row, pred)

        params_list.append(
            {
                "store_id": row["STORE_ID"],
                "prod_id": row["PROD_ID"],
                "base_date": row["BASE_DATE"],
                "pred_7d_qty": pred,
                "curr_stock": int(row["INVENTORY_QTY"] or 0),
                "recommend_qty": int(recommend_qty),
                "priority": priority,
                "explain_text": explain[:255] if explain else None,
            }
        )

    print(f"[predict] 적재 대상 행 수: {len(params_list):,}")

    with engine.begin() as conn:
        conn.execute(insert_sql, params_list)

    print("[predict] MART_ORDER_FORECAST_RESULT 적재 완료")


# -----------------------------
# 7. CLI 진입점
# -----------------------------
def main():
    """
    예시 실행:
      python app/ml/order_forecast_predict.py               # 최신 BASE_DATE 전체 점포
      python app/ml/order_forecast_predict.py 2025-09-30    # 특정 BASE_DATE 전체 점포
      python app/ml/order_forecast_predict.py 2025-09-30 S001  # 특정 BASE_DATE + 점포
    """
    import sys

    base_date = None
    store_id = None

    if len(sys.argv) >= 2:
        base_date = sys.argv[1]
    if len(sys.argv) >= 3:
        store_id = sys.argv[2]

    run_forecast_and_upsert(base_date=base_date, store_id=store_id)


if __name__ == "__main__":
    main()


