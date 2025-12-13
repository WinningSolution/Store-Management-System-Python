import csv
from datetime import datetime

from sqlalchemy import text

from app.database import engine

"""
CUSTOMER_SEGMENT.csv / CUSTOMER_SEGMENT_LOG.csv → DB 적재 스크립트

- CSV 경로는 로컬 개발 PC 기준:
  * C:\\Users\\HBS\\Desktop\\DATA\\CUSTOMER_SEGMENT.csv
  * C:\\Users\\HBS\\Desktop\\DATA\\CUSTOMER_SEGMENT_LOG.csv

- 동작:
  1) TRUNCATE TABLE CUSTOMER_SEGMENT / CUSTOMER_SEGMENT_LOG
  2) CSV를 읽어 INSERT
"""


SEGMENT_CSV = r"C:\Users\HBS\Desktop\DATA\CUSTOMER_SEGMENT.csv"
SEGMENT_LOG_CSV = r"C:\Users\HBS\Desktop\DATA\CUSTOMER_SEGMENT_LOG.csv"


def load_customer_segment() -> None:
    conn = engine.connect()
    trans = conn.begin()
    try:
        # FK 제약 순서:
        # 1) 자식 테이블(CUSTOMER_SEGMENT_LOG) 먼저 비우고
        # 2) 부모 테이블(CUSTOMER_SEGMENT)을 비운다.
        print("[INFO] DELETE FROM CUSTOMER_SEGMENT_LOG ...")
        conn.execute(text("DELETE FROM `CUSTOMER_SEGMENT_LOG`"))

        print("[INFO] DELETE FROM CUSTOMER_SEGMENT ...")
        conn.execute(text("DELETE FROM `CUSTOMER_SEGMENT`"))

        insert_sql = text(
            """
            INSERT INTO `CUSTOMER_SEGMENT` (
                `SEGMENT_ID`,
                `SEGMENT_NM`,
                `SEGMENT_TYPE`,
                `DESCRIPTION`,
                `ACTIVE_FLAG`
            ) VALUES (
                :SEGMENT_ID,
                :SEGMENT_NM,
                :SEGMENT_TYPE,
                :DESCRIPTION,
                :ACTIVE_FLAG
            )
            """
        )

        batch = []
        batch_size = 5000
        inserted = 0

        with open(SEGMENT_CSV, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                params = {
                    "SEGMENT_ID": (row.get("SEGMENT_ID") or "").strip(),
                    "SEGMENT_NM": (row.get("SEGMENT_NM") or "").strip(),
                    "SEGMENT_TYPE": (row.get("SEGMENT_TYPE") or "").strip(),
                    "DESCRIPTION": (row.get("DESCRIPTION") or "").strip(),
                    "ACTIVE_FLAG": (row.get("ACTIVE_FLAG") or "").strip() or "Y",
                }
                if not params["SEGMENT_ID"]:
                    continue
                batch.append(params)

                if len(batch) >= batch_size:
                    conn.execute(insert_sql, batch)
                    inserted += len(batch)
                    print(f"[INFO] CUSTOMER_SEGMENT inserted {inserted} rows ...")
                    batch.clear()

        if batch:
            conn.execute(insert_sql, batch)
            inserted += len(batch)

        trans.commit()
        print(f"[OK] CUSTOMER_SEGMENT 적재 완료 (총 {inserted}행)")
    except Exception as e:  # noqa: BLE001
        trans.rollback()
        print(f"[ERROR] CUSTOMER_SEGMENT 적재 중 오류: {e}")
        raise
    finally:
        conn.close()


def load_customer_segment_log() -> None:
    conn = engine.connect()
    trans = conn.begin()
    try:
        print("[INFO] TRUNCATE TABLE CUSTOMER_SEGMENT_LOG ...")
        conn.execute(text("TRUNCATE TABLE `CUSTOMER_SEGMENT_LOG`"))

        insert_sql = text(
            """
            INSERT INTO `CUSTOMER_SEGMENT_LOG` (
                `CUSTOMER_ID`,
                `SEGMENT_ID`,
                `START_DT`,
                `END_DT`,
                `SOURCE`
            ) VALUES (
                :CUSTOMER_ID,
                :SEGMENT_ID,
                :START_DT,
                :END_DT,
                :SOURCE
            )
            """
        )

        batch = []
        batch_size = 5000
        inserted = 0

        with open(SEGMENT_LOG_CSV, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                cid = (row.get("CUSTOMER_ID") or "").strip()
                seg_id = (row.get("SEGMENT_ID") or "").strip()
                if not cid or not seg_id:
                    continue

                start_str = (row.get("START_DT") or "").strip()
                end_str = (row.get("END_DT") or "").strip()

                try:
                    start_dt = (
                        datetime.strptime(start_str, "%Y-%m-%d").date()
                        if start_str
                        else None
                    )
                except ValueError:
                    # 날짜 파싱 실패 시 스킵
                    continue

                try:
                    end_dt = (
                        datetime.strptime(end_str, "%Y-%m-%d").date()
                        if end_str
                        else None
                    )
                except ValueError:
                    end_dt = None

                params = {
                    "CUSTOMER_ID": cid,
                    "SEGMENT_ID": seg_id,
                    "START_DT": start_dt,
                    "END_DT": end_dt,
                    "SOURCE": (row.get("SOURCE") or "").strip() or "fm_kmeans_k4",
                }

                batch.append(params)

                if len(batch) >= batch_size:
                    conn.execute(insert_sql, batch)
                    inserted += len(batch)
                    print(f"[INFO] CUSTOMER_SEGMENT_LOG inserted {inserted} rows ...")
                    batch.clear()

        if batch:
            conn.execute(insert_sql, batch)
            inserted += len(batch)

        trans.commit()
        print(f"[OK] CUSTOMER_SEGMENT_LOG 적재 완료 (총 {inserted}행)")
    except Exception as e:  # noqa: BLE001
        trans.rollback()
        print(f"[ERROR] CUSTOMER_SEGMENT_LOG 적재 중 오류: {e}")
        raise
    finally:
        conn.close()


def main() -> None:
    print("[INFO] CUSTOMER_SEGMENT / CUSTOMER_SEGMENT_LOG CSV → DB 적재 시작")
    load_customer_segment()
    load_customer_segment_log()
    print("[INFO] CUSTOMER_SEGMENT / CUSTOMER_SEGMENT_LOG CSV → DB 적재 종료")


if __name__ == "__main__":
    main()


