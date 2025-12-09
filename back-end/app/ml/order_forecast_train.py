import os
from datetime import datetime, timedelta

import joblib
import numpy as np
import pandas as pd
import sqlalchemy as sa
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split


# -----------------------------
# 1. DB 연결 설정
# -----------------------------
DB_USER = os.getenv("DB_USER", "db_admin")
DB_PASSWORD = os.getenv("DB_PASSWORD", "1234")
DB_HOST = os.getenv("DB_HOST", "3.39.73.108")
DB_PORT = os.getenv("DB_PORT", "3307")
DB_NAME = os.getenv("DB_NAME", "winning_solution")

ENGINE_URL = (
    f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    "?charset=utf8mb4"
)


def load_mart() -> pd.DataFrame:
    """
    INVENTORY_STATUS / SALES / INVENTORY_HISTORY / PRODUCT 를 직접 조인/서브쿼리로 사용해
    학습용 데이터프레임을 생성한다.

    - BASE_DATE: INVENTORY_STATUS.SNAPSHOT_DT
    - 피처:
        - INVENTORY_QTY (FL_QTY + BR_QTY)
        - SALES_L7D / L14D / L30D / L180D (과거 판매 수량)
        - IN_QTY_L7D / OUT_QTY_L7D / NET_MOVE_L7D
        - IN_QTY_L30D / OUT_QTY_L30D / NET_MOVE_L30D
        - SEASON / PROD_LINE / CATEGORY
        - DOW, IS_WEEKEND
    - 타깃:
        - TARGET_ORDER_QTY = BASE_DATE 이후 7일간 판매 수량 합계
    """
    engine = sa.create_engine(ENGINE_URL)

    # 학습 기간: INVENTORY_STATUS 최신 snapshot_dt 기준 최근 N일
    train_days = int(os.getenv("TRAIN_DAYS", "90"))
    with engine.connect() as conn:
        row = conn.execute(
            sa.text("SELECT MAX(SNAPSHOT_DT) AS max_dt FROM INVENTORY_STATUS")
        ).mappings().first()
    max_snapshot = row["max_dt"] if row and row["max_dt"] else None
    if not max_snapshot:
        raise RuntimeError("INVENTORY_STATUS 에 snapshot 데이터가 없습니다.")

    train_start = max_snapshot - timedelta(days=train_days)

    query = sa.text(
        """
    SELECT
      inv.STORE_ID,
      inv.PROD_ID,
      inv.SNAPSHOT_DT AS BASE_DATE,
      (inv.FL_QTY + inv.BR_QTY) AS INVENTORY_QTY,

      -- 최근 7일 / 14일 / 30일 판매량 (BASE_DATE 이전 기준)
      (
        SELECT COALESCE(SUM(s.QTY), 0)
        FROM SALES s
        WHERE s.STORE_ID = inv.STORE_ID
          AND s.PROD_ID = inv.PROD_ID
          AND DATE(s.SALE_DT) >= DATE_SUB(inv.SNAPSHOT_DT, INTERVAL 7 DAY)
          AND DATE(s.SALE_DT) <  inv.SNAPSHOT_DT
      ) AS SALES_L7D,
      (
        SELECT COALESCE(SUM(s.QTY), 0)
        FROM SALES s
        WHERE s.STORE_ID = inv.STORE_ID
          AND s.PROD_ID = inv.PROD_ID
          AND DATE(s.SALE_DT) >= DATE_SUB(inv.SNAPSHOT_DT, INTERVAL 14 DAY)
          AND DATE(s.SALE_DT) <  inv.SNAPSHOT_DT
      ) AS SALES_L14D,
      (
        SELECT COALESCE(SUM(s.QTY), 0)
        FROM SALES s
        WHERE s.STORE_ID = inv.STORE_ID
          AND s.PROD_ID = inv.PROD_ID
          AND DATE(s.SALE_DT) >= DATE_SUB(inv.SNAPSHOT_DT, INTERVAL 30 DAY)
          AND DATE(s.SALE_DT) <  inv.SNAPSHOT_DT
      ) AS SALES_L30D,

      -- 최근 7일 입출고 (InventoryHistory 기준, 양수=입고/반품, 음수=판매 등)
      (
        SELECT COALESCE(SUM(CASE WHEN ih.QTY > 0 THEN ih.QTY ELSE 0 END), 0)
        FROM INVENTORY_HISTORY ih
        WHERE ih.STORE_ID = inv.STORE_ID
          AND ih.PROD_ID = inv.PROD_ID
          AND ih.MOVE_DT >= DATE_SUB(inv.SNAPSHOT_DT, INTERVAL 7 DAY)
          AND ih.MOVE_DT <  inv.SNAPSHOT_DT
      ) AS IN_QTY_L7D,
      (
        SELECT COALESCE(SUM(CASE WHEN ih.QTY < 0 THEN -ih.QTY ELSE 0 END), 0)
        FROM INVENTORY_HISTORY ih
        WHERE ih.STORE_ID = inv.STORE_ID
          AND ih.PROD_ID = inv.PROD_ID
          AND ih.MOVE_DT >= DATE_SUB(inv.SNAPSHOT_DT, INTERVAL 7 DAY)
          AND ih.MOVE_DT <  inv.SNAPSHOT_DT
      ) AS OUT_QTY_L7D,
      (
        SELECT COALESCE(SUM(ih.QTY), 0)
        FROM INVENTORY_HISTORY ih
        WHERE ih.STORE_ID = inv.STORE_ID
          AND ih.PROD_ID = inv.PROD_ID
          AND ih.MOVE_DT >= DATE_SUB(inv.SNAPSHOT_DT, INTERVAL 7 DAY)
          AND ih.MOVE_DT <  inv.SNAPSHOT_DT
      ) AS NET_MOVE_L7D,

      -- 최근 30일 입출고
      (
        SELECT COALESCE(SUM(CASE WHEN ih.QTY > 0 THEN ih.QTY ELSE 0 END), 0)
        FROM INVENTORY_HISTORY ih
        WHERE ih.STORE_ID = inv.STORE_ID
          AND ih.PROD_ID = inv.PROD_ID
          AND ih.MOVE_DT >= DATE_SUB(inv.SNAPSHOT_DT, INTERVAL 30 DAY)
          AND ih.MOVE_DT <  inv.SNAPSHOT_DT
      ) AS IN_QTY_L30D,
      (
        SELECT COALESCE(SUM(CASE WHEN ih.QTY < 0 THEN -ih.QTY ELSE 0 END), 0)
        FROM INVENTORY_HISTORY ih
        WHERE ih.STORE_ID = inv.STORE_ID
          AND ih.PROD_ID = inv.PROD_ID
          AND ih.MOVE_DT >= DATE_SUB(inv.SNAPSHOT_DT, INTERVAL 30 DAY)
          AND ih.MOVE_DT <  inv.SNAPSHOT_DT
      ) AS OUT_QTY_L30D,
      (
        SELECT COALESCE(SUM(ih.QTY), 0)
        FROM INVENTORY_HISTORY ih
        WHERE ih.STORE_ID = inv.STORE_ID
          AND ih.PROD_ID = inv.PROD_ID
          AND ih.MOVE_DT >= DATE_SUB(inv.SNAPSHOT_DT, INTERVAL 30 DAY)
          AND ih.MOVE_DT <  inv.SNAPSHOT_DT
      ) AS NET_MOVE_L30D,

      -- 상품 특성
      p.SEASON,
      p.PROD_LINE,
      p.CATEGORY,

      -- 요일 / 주말 여부
      DAYOFWEEK(inv.SNAPSHOT_DT) AS DOW,
      CASE
        WHEN DAYOFWEEK(inv.SNAPSHOT_DT) IN (1, 7) THEN 1
        ELSE 0
      END AS IS_WEEKEND,

      -- 최근 180일 판매 수량 (실험용 피처)
      (
        SELECT COALESCE(SUM(s.QTY), 0)
        FROM SALES s
        WHERE s.STORE_ID = inv.STORE_ID
          AND s.PROD_ID = inv.PROD_ID
          AND DATE(s.SALE_DT) >= DATE_SUB(inv.SNAPSHOT_DT, INTERVAL 180 DAY)
          AND DATE(s.SALE_DT) <  inv.SNAPSHOT_DT
      ) AS SALES_L180D,

      -- 타깃: 향후 7일 판매 수량
      (
        SELECT COALESCE(SUM(s.QTY), 0)
        FROM SALES s
        WHERE s.STORE_ID = inv.STORE_ID
          AND s.PROD_ID = inv.PROD_ID
          AND DATE(s.SALE_DT) >  inv.SNAPSHOT_DT
          AND DATE(s.SALE_DT) <= DATE_ADD(inv.SNAPSHOT_DT, INTERVAL 7 DAY)
      ) AS TARGET_ORDER_QTY

    FROM INVENTORY_STATUS inv
    LEFT JOIN PRODUCT p ON p.PROD_ID = inv.PROD_ID
    WHERE inv.SNAPSHOT_DT BETWEEN :train_start AND :train_end
    """
    )

    df = pd.read_sql(
        query,
        engine,
        params={"train_start": train_start, "train_end": max_snapshot},
    )

    if df.empty:
        raise RuntimeError("학습용 데이터가 비어 있습니다. 쿼리 조건을 확인하세요.")

    return df


# -----------------------------
# 2. 피처 엔지니어링
# -----------------------------
def prepare_features(df: pd.DataFrame):
    """모델 학습용 X, y, feature_cols 생성."""
    # 범주형 -> one-hot 인코딩
    df_enc = pd.get_dummies(
        df,
        columns=["SEASON", "PROD_LINE", "CATEGORY"],
        dummy_na=True,
    )

    # 사용할 기본 피처들
    base_cols = [
        "INVENTORY_QTY",
        "SALES_L7D",
        "SALES_L14D",
        "SALES_L30D",
        "SALES_L180D",
        "IN_QTY_L7D",
        "OUT_QTY_L7D",
        "NET_MOVE_L7D",
        "IN_QTY_L30D",
        "OUT_QTY_L30D",
        "NET_MOVE_L30D",
        "DOW",
        "IS_WEEKEND",
    ]

    # one-hot으로 생긴 컬럼들 추가
    cat_cols = [
        c
        for c in df_enc.columns
        if c.startswith("SEASON_")
        or c.startswith("PROD_LINE_")
        or c.startswith("CATEGORY_")
    ]

    feature_cols = base_cols + cat_cols

    # 결측값(NaN) -> 0 으로 단순 대체 (첫 버전)
    X = df_enc[feature_cols].fillna(0)
    y = df_enc["TARGET_ORDER_QTY"].astype(float)

    return X, y, feature_cols


# -----------------------------
# 3. 모델 학습 & 평가
# -----------------------------
def train_model(X, y):
    """
    RandomForest 기반 베이스라인 모델 학습.
    시간 순서 보존을 위해 shuffle=False 로 train/val 분리.
    """
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, shuffle=False
    )

    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=10,
        random_state=42,
        n_jobs=-1,
    )

    model.fit(X_train, y_train)

    pred = model.predict(X_val)

    # 기본 회귀 지표
    mae = mean_absolute_error(y_val, pred)
    # 일부 scikit-learn 버전에서는 squared 인자를 지원하지 않으므로 RMSE는 수동 계산
    mse = mean_squared_error(y_val, pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_val, pred)

    # 실제 판매량이 0보다 큰 경우에만 MAPE 계산
    mask = y_val > 0
    if mask.any():
        mape_pos = np.mean(
            np.abs((y_val[mask] - pred[mask]) / y_val[mask])
        ) * 100
    else:
        mape_pos = np.nan

    return model, mae, rmse, r2, mape_pos


# -----------------------------
# 4. 피처 중요도 분석 유틸
# -----------------------------
def print_feature_importances(model, feature_cols, top_n: int = 30):
    """
    RandomForest feature_importances_ 기반 피처 중요도 분석을 콘솔에 출력.

    - 개별 피처 상위 N개 중요도
    - SEASON / PROD_LINE / CATEGORY 계열 원-핫 피처는 그룹 합계로도 요약
    """
    importances = model.feature_importances_
    fi = pd.Series(importances, index=feature_cols).sort_values(ascending=False)

    print("\n=== [개별 피처 중요도 Top {0}개] ===".format(top_n))
    for name, val in fi.head(top_n).items():
        print(f"{name:30s} : {val:.4f}")

    # 그룹 요약: 기본 수치 피처 vs 카테고리형 피처
    def sum_prefix(prefix: str) -> float:
        mask = fi.index.str.startswith(prefix)
        return float(fi[mask].sum())

    group_summary = {
        "BASE_INVENTORY_QTY": float(fi.get("INVENTORY_QTY", 0.0)),
        "BASE_SALES_L7D": float(fi.get("SALES_L7D", 0.0)),
        "BASE_SALES_L14D": float(fi.get("SALES_L14D", 0.0)),
        "BASE_SALES_L30D": float(fi.get("SALES_L30D", 0.0)),
        "BASE_SALES_L180D": float(fi.get("SALES_L180D", 0.0)),
        "BASE_IN_OUT_L7D": float(
            fi.get("IN_QTY_L7D", 0.0)
            + fi.get("OUT_QTY_L7D", 0.0)
            + fi.get("NET_MOVE_L7D", 0.0)
        ),
        "BASE_IN_OUT_L30D": float(
            fi.get("IN_QTY_L30D", 0.0)
            + fi.get("OUT_QTY_L30D", 0.0)
            + fi.get("NET_MOVE_L30D", 0.0)
        ),
        "BASE_CALENDAR": float(fi.get("DOW", 0.0) + fi.get("IS_WEEKEND", 0.0)),
        "SEASON_*": sum_prefix("SEASON_"),
        "PROD_LINE_*": sum_prefix("PROD_LINE_"),
        "CATEGORY_*": sum_prefix("CATEGORY_"),
    }

    print("\n=== [피처 그룹별 중요도 합계] ===")
    for name, val in group_summary.items():
        print(f"{name:20s} : {val:.4f}")


# -----------------------------
# 5. 메인 함수: 전체 흐름
# -----------------------------
def main():
    print("1) MART_ORDER_FORECAST 로딩 중...")
    df = load_mart()
    print(f"   - 로우 수: {len(df):,}")
    # BASE_DATE 타입이 pandas Timestamp 일 수도, python date 일 수도 있으므로 안전하게 문자열로 출력
    base_min = df["BASE_DATE"].min()
    base_max = df["BASE_DATE"].max()
    print(f"   - 기간: {base_min} ~ {base_max}")

    print("2) 피처 준비 중...")
    X, y, feature_cols = prepare_features(df)
    print(f"   - 피처 수: {X.shape[1]}개")

    print("3) 모델 학습 중 (RandomForest)...")
    model, mae, rmse, r2, mape_pos = train_model(X, y)
    print(f"   - MAE : {mae:.3f}")
    print(f"   - RMSE: {rmse:.3f}")
    print(f"   - R^2 : {r2:.3f}")
    if not np.isnan(mape_pos):
        print(f"   - MAPE(y>0에서만): {mape_pos:.2f}%")

    # 피처 중요도 분석 출력
    print_feature_importances(model, feature_cols, top_n=30)

    # 모델 저장 경로
    models_dir = os.path.join(os.path.dirname(__file__), "..", "models")
    os.makedirs(models_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_path = os.path.join(models_dir, f"order_forecast_v1_{timestamp}.pkl")

    joblib.dump({"model": model, "features": feature_cols}, model_path)
    print(f"4) 모델 저장 완료: {model_path}")


if __name__ == "__main__":
    main()