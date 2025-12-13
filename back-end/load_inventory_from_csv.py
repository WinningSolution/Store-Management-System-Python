import csv
from datetime import datetime

from sqlalchemy import text

from app.database import engine

"""
INVENTORY_HISTORY.csv / INVENTORY_STATUS.csv → DB 적재 스크립트

- CSV 경로는 로컬 개발 PC 기준:
  * C:\\Users\\HBS\\Desktop\\DATA\\INVENTORY_HISTORY.csv
  * C:\\Users\\HBS\\Desktop\\DATA\\INVENTORY_STATUS.csv

- 동작:
  1) TRUNCATE TABLE INVENTORY_HISTORY / INVENTORY_STATUS
  2) CSV를 읽어 INSERT
     * MOVE_YYYYMM / SNAPSHOT_YYYYMM 은 날짜 기준으로 계산
"""

INV_HIST_CSV = r"C:\Users\HBS\Desktop\DATA\INVENTORY_HISTORY.csv"
INV_STAT_CSV = r"C:\Users\HBS\Desktop\DATA\INVENTORY_STATUS.csv"


def load_inventory_history():
    conn = engine.connect()
    trans = conn.begin()
    try:
        print("[INFO] TRUNCATE TABLE INVENTORY_HISTORY ...")
        conn.execute(text("TRUNCATE TABLE `INVENTORY_HISTORY`"))

        insert_sql = text(
            """
            INSERT INTO `INVENTORY_HISTORY` (
                `STORE_ID`,
                `PROD_ID`,
                `MOVE_DT`,
                `PROD_NM`,
                `SEASON`,
                `QTY`,
                `LOCATION`,
                `MOVE_TYPE`
            ) VALUES (
                :STORE_ID,
                :PROD_ID,
                :MOVE_DT,
                :PROD_NM,
                :SEASON,
                :QTY,
                :LOCATION,
                :MOVE_TYPE
            )
            """
        )

        inserted = 0
        batch_size = 5000

        # PRIMARY KEY 가 (MOVE_YYYYMM, STORE_ID, PROD_ID, MOVE_DT)이므로
        # 같은 (STORE_ID, PROD_ID, MOVE_DT) 가 여러 번 나오면 QTY를 합산해서 한 건으로 집계한다.
        aggregated = {}

        with open(INV_HIST_CSV, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                move_dt = datetime.strptime(row["MOVE_DT"], "%Y-%m-%d %H:%M:%S")
                key = (row["STORE_ID"], row["PROD_ID"], move_dt)
                qty = int(row["QTY"])

                if key not in aggregated:
                    aggregated[key] = {
                        "STORE_ID": row["STORE_ID"],
                        "PROD_ID": row["PROD_ID"],
                        "MOVE_DT": move_dt,
                        "PROD_NM": row["PROD_NM"],
                        "SEASON": row["SEASON"],
                        "QTY": qty,
                        "LOCATION": row["LOCATION"],
                        "MOVE_TYPE": row["MOVE_TYPE"],
                    }
                else:
                    aggregated[key]["QTY"] += qty
                    aggregated[key]["LOCATION"] = row["LOCATION"]
                    aggregated[key]["MOVE_TYPE"] = row["MOVE_TYPE"]

        print(f"[INFO] INVENTORY_HISTORY 집계 후 레코드 수: {len(aggregated)}")

        batch = []
        for params in aggregated.values():
            batch.append(params)
            if len(batch) >= batch_size:
                conn.execute(insert_sql, batch)
                inserted += len(batch)
                print(f"[INFO] INVENTORY_HISTORY inserted {inserted} rows ...")
                batch.clear()

        if batch:
            conn.execute(insert_sql, batch)
            inserted += len(batch)

        trans.commit()
        print(f"[OK] INVENTORY_HISTORY 적재 완료 (총 {inserted}행)")
    except Exception as e:
        trans.rollback()
        print(f"[ERROR] INVENTORY_HISTORY 적재 중 오류: {e}")
        raise
    finally:
        conn.close()


def load_inventory_status():
    conn = engine.connect()
    trans = conn.begin()
    try:
        print("[INFO] TRUNCATE TABLE INVENTORY_STATUS ...")
        conn.execute(text("TRUNCATE TABLE `INVENTORY_STATUS`"))

        insert_sql = text(
            """
            INSERT INTO `INVENTORY_STATUS` (
                `SNAPSHOT_YYYYMM`,
                `STORE_ID`,
                `PROD_ID`,
                `SNAPSHOT_DT`,
                `PROD_NM`,
                `SEASON`,
                `FL_QTY`,
                `BR_QTY`
            ) VALUES (
                :SNAPSHOT_YYYYMM,
                :STORE_ID,
                :PROD_ID,
                :SNAPSHOT_DT,
                :PROD_NM,
                :SEASON,
                :FL_QTY,
                :BR_QTY
            )
            """
        )

        inserted = 0
        batch = []
        batch_size = 5000

        with open(INV_STAT_CSV, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                snap_dt = datetime.strptime(row["SNAPSHOT_DT"], "%Y-%m-%d")
                snap_yyyymm = int(snap_dt.strftime("%Y%m"))
                params = {
                    "SNAPSHOT_YYYYMM": snap_yyyymm,
                    "STORE_ID": row["STORE_ID"],
                    "PROD_ID": row["PROD_ID"],
                    "SNAPSHOT_DT": snap_dt,
                    "PROD_NM": row["PROD_NM"],
                    "SEASON": row["SEASON"],
                    "FL_QTY": int(row["FL_QTY"]),
                    "BR_QTY": int(row["BR_QTY"]),
                }
                batch.append(params)

                if len(batch) >= batch_size:
                    conn.execute(insert_sql, batch)
                    inserted += len(batch)
                    print(f"[INFO] INVENTORY_STATUS inserted {inserted} rows ...")
                    batch.clear()

        if batch:
            conn.execute(insert_sql, batch)
            inserted += len(batch)

        trans.commit()
        print(f"[OK] INVENTORY_STATUS 적재 완료 (총 {inserted}행)")
    except Exception as e:
        trans.rollback()
        print(f"[ERROR] INVENTORY_STATUS 적재 중 오류: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    load_inventory_history()
    load_inventory_status()


