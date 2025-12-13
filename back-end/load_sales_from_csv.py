import csv
from datetime import datetime

from collections import OrderedDict

from sqlalchemy import text

from app.database import engine

"""
SALES.csv → MySQL SALES 테이블 적재 스크립트 (ORM 모델 사용 X, 순수 INSERT)

주의:
  - DB의 `SALE_YYYYMM` 컬럼은 GENERATED 컬럼이므로, INSERT 시 값을 넣지 않는다.
  - TOTAL_AMT 역시 GENERATED 이므로 포함하지 않는다.
  - CSV 경로는 로컬 개발 PC 기준으로 설정.
"""

# 로컬 개발 PC 기준 CSV 경로 (필요시 사용자 환경에 맞게 조정)
CSV_PATH = r"C:\Users\HBS\Desktop\DATA\SALES.csv"


def parse_sale_dt(dt_str: str) -> datetime:
    return datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")


def main():
    print("[INFO] SALES.csv → DB 적재 시작")
    conn = engine.connect()
    trans = conn.begin()
    try:
        print("[INFO] TRUNCATE TABLE SALES ...")
        conn.execute(text("TRUNCATE TABLE `SALES`"))

        inserted = 0
        batch_size = 5000

        insert_sql = text(
            """
            INSERT INTO `SALES` (
                `STORE_ID`,
                `SALE_DT`,
                `PROD_ID`,
                `SALE_ID`,
                `PROD_NM`,
                `UNIT_PRICE`,
                `QTY`,
                `PAY_TYPE`,
                `CARD_NO`,
                `ORDER_ID`,
                `SALE_STATUS`,
                `EVENT_ID`,
                `CUSTOMER_ID`,
                `CHANNEL`,
                `ACQ_SOURCE`,
                `REFERRER_ID`,
                `CREATED_AT`
            ) VALUES (
                :STORE_ID,
                :SALE_DT,
                :PROD_ID,
                :SALE_ID,
                :PROD_NM,
                :UNIT_PRICE,
                :QTY,
                :PAY_TYPE,
                :CARD_NO,
                :ORDER_ID,
                :SALE_STATUS,
                :EVENT_ID,
                :CUSTOMER_ID,
                :CHANNEL,
                :ACQ_SOURCE,
                :REFERRER_ID,
                :CREATED_AT
            )
            """
        )

        # 1) CSV를 (STORE_ID, SALE_DT, PROD_ID) 단위로 집계해서
        #    PRIMARY KEY 중복을 방지한다.
        aggregated: OrderedDict[tuple, dict] = OrderedDict()

        with open(CSV_PATH, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                key = (row["STORE_ID"], row["SALE_DT"], row["PROD_ID"])
                qty = int(row["QTY"])

                if key not in aggregated:
                    sale_dt = parse_sale_dt(row["SALE_DT"])
                    aggregated[key] = {
                        "STORE_ID": row["STORE_ID"],
                        "SALE_DT": sale_dt,
                        "PROD_ID": row["PROD_ID"],
                        "SALE_ID": row["SALE_ID"],
                        "PROD_NM": row["PROD_NM"],
                        "UNIT_PRICE": float(row["UNIT_PRICE"]),
                        "QTY": qty,
                        "PAY_TYPE": row["PAY_TYPE"],
                        "CARD_NO": row["CARD_NO"],
                        "ORDER_ID": row["ORDER_ID"],
                        "SALE_STATUS": row["SALE_STATUS"] or "정상",
                        "EVENT_ID": int(row["EVENT_ID"]) if row["EVENT_ID"] else None,
                        "CUSTOMER_ID": row["CUSTOMER_ID"],
                        "CHANNEL": row["CHANNEL"],
                        "ACQ_SOURCE": row["ACQ_SOURCE"],
                        "REFERRER_ID": row["REFERRER_ID"],
                        "CREATED_AT": sale_dt,
                    }
                else:
                    aggregated[key]["QTY"] += qty

        print(f"[INFO] 집계 후 레코드 수: {len(aggregated)}")

        # 2) 집계된 결과를 배치 단위로 INSERT
        batch = []
        for params in aggregated.values():
            batch.append(params)
            if len(batch) >= batch_size:
                conn.execute(insert_sql, batch)
                inserted += len(batch)
                print(f"[INFO] inserted {inserted} rows ...")
                batch.clear()

        if batch:
            conn.execute(insert_sql, batch)
            inserted += len(batch)

        trans.commit()
        print(f"[OK] SALES 적재 완료 (총 {inserted}행)")
    except Exception as e:
        trans.rollback()
        print(f"[ERROR] SALES 적재 중 오류: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()



