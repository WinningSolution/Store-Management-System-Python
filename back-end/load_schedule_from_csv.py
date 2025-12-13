import csv
from datetime import datetime, date, time

from sqlalchemy import text

from app.database import engine

"""
SCHEDULE_INGREDIENT.csv / SCHEDULE_RESULT.csv / ATTEND.csv / ATTEND_LOG.csv → DB 적재 스크립트

- CSV 경로 (로컬 개발 PC 기준):
  * C:\\Users\\HBS\\Desktop\\DATA\\SCHEDULE_INGREDIENT.csv
  * C:\\Users\\HBS\\Desktop\\DATA\\SCHEDULE_RESULT.csv
  * C:\\Users\\HBS\\Desktop\\DATA\\ATTEND.csv
  * C:\\Users\\HBS\\Desktop\\DATA\\ATTEND_LOG.csv

- 동작:
  1) FK 순서를 고려해 자식 테이블부터 비운다.
     - ATTEND_LOG
     - ATTEND
     - SCHEDULE_INGREDIENT
     - SCHEDULE_RESULT
  2) 위 순서의 역순으로 CSV를 읽어 INSERT 한다.
"""


INGREDIENT_CSV = r"C:\Users\HBS\Desktop\DATA\SCHEDULE_INGREDIENT.csv"
RESULT_CSV = r"C:\Users\HBS\Desktop\DATA\SCHEDULE_RESULT.csv"
ATTEND_CSV = r"C:\Users\HBS\Desktop\DATA\ATTEND.csv"
ATTEND_LOG_CSV = r"C:\Users\HBS\Desktop\DATA\ATTEND_LOG.csv"


def clear_tables(conn) -> None:
    """자식 테이블부터 순서대로 비운다."""
    tables = [
        "ATTEND_LOG",
        "ATTEND",
        "SCHEDULE_INGREDIENT",
        "SCHEDULE_RESULT",
    ]
    for tbl in tables:
        try:
            print(f"[INFO] DELETE FROM {tbl} ...")
            conn.execute(text(f"DELETE FROM `{tbl}`"))
        except Exception as e:  # noqa: BLE001
            print(f"[WARN] {tbl} 삭제 중 오류 (무시하고 계속): {e}")


def load_schedule_ingredient(conn) -> int:
    insert_sql = text(
        """
        INSERT INTO `SCHEDULE_INGREDIENT` (
            `EMP_ID`,
            `DAYNAME`,
            `WORK_TYPE`,
            `STATUS`
        ) VALUES (
            :EMP_ID,
            :DAYNAME,
            :WORK_TYPE,
            :STATUS
        )
        """
    )

    inserted = 0
    batch_size = 5000
    batch: list[dict] = []

    with open(INGREDIENT_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            emp_id = (row.get("EMP_ID") or "").strip()
            dayname = (row.get("DAYNAME") or "").strip()
            work_type = (row.get("WORK_TYPE") or "").strip()
            if not emp_id or not dayname or not work_type:
                continue
            try:
                status = int(row.get("STATUS", "0"))
            except ValueError:
                status = 0

            params = {
                "EMP_ID": emp_id,
                "DAYNAME": dayname,
                "WORK_TYPE": work_type,
                "STATUS": status,
            }
            batch.append(params)

            if len(batch) >= batch_size:
                conn.execute(insert_sql, batch)
                inserted += len(batch)
                print(f"[INFO] SCHEDULE_INGREDIENT inserted {inserted} rows ...")
                batch.clear()

    if batch:
        conn.execute(insert_sql, batch)
        inserted += len(batch)

    return inserted


def load_schedule_result(conn) -> int:
    insert_sql = text(
        """
        INSERT INTO `SCHEDULE_RESULT` (
            `WEEK_START_DT`,
            `DAYNAME`,
            `WORK_TYPE`,
            `REQUIRED_CNT`
        ) VALUES (
            :WEEK_START_DT,
            :DAYNAME,
            :WORK_TYPE,
            :REQUIRED_CNT
        )
        """
    )

    inserted = 0
    batch_size = 5000
    batch: list[dict] = []

    with open(RESULT_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            week_start_str = (row.get("WEEK_START_DT") or "").strip()
            dayname = (row.get("DAYNAME") or "").strip()
            work_type = (row.get("WORK_TYPE") or "").strip()
            if not week_start_str or not dayname or not work_type:
                continue
            try:
                week_start_dt = datetime.strptime(week_start_str, "%Y-%m-%d").date()
            except ValueError:
                continue
            try:
                required_cnt = int(row.get("REQUIRED_CNT", "0"))
            except ValueError:
                required_cnt = 0

            params = {
                "WEEK_START_DT": week_start_dt,
                "DAYNAME": dayname,
                "WORK_TYPE": work_type,
                "REQUIRED_CNT": required_cnt,
            }
            batch.append(params)

            if len(batch) >= batch_size:
                conn.execute(insert_sql, batch)
                inserted += len(batch)
                print(f"[INFO] SCHEDULE_RESULT inserted {inserted} rows ...")
                batch.clear()

    if batch:
        conn.execute(insert_sql, batch)
        inserted += len(batch)

    return inserted


def load_attend(conn) -> int:
    insert_sql = text(
        """
        INSERT INTO `ATTEND` (
            `STORE_ID`,
            `EMP_ID`,
            `WORK_DT`,
            `SHIFT_START_PLAN`,
            `CLOCK_IN_TS`,
            `SHIFT_END_PLAN`,
            `CLOCK_OUT_TS`,
            `LATE_FLAG`,
            `EARLY_FLAG`
        ) VALUES (
            :STORE_ID,
            :EMP_ID,
            :WORK_DT,
            :SHIFT_START_PLAN,
            :CLOCK_IN_TS,
            :SHIFT_END_PLAN,
            :CLOCK_OUT_TS,
            :LATE_FLAG,
            :EARLY_FLAG
        )
        """
    )

    inserted = 0
    batch_size = 5000
    batch: list[dict] = []

    with open(ATTEND_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            store_id = (row.get("STORE_ID") or "").strip()
            emp_id = (row.get("EMP_ID") or "").strip()
            work_dt_str = (row.get("WORK_DT") or "").strip()
            if not store_id or not emp_id or not work_dt_str:
                continue
            try:
                work_dt = datetime.strptime(work_dt_str, "%Y-%m-%d").date()
            except ValueError:
                continue

            shift_start_str = (row.get("SHIFT_START_PLAN") or "").strip()
            shift_end_str = (row.get("SHIFT_END_PLAN") or "").strip()
            clock_in_str = (row.get("CLOCK_IN_TS") or "").strip()
            clock_out_str = (row.get("CLOCK_OUT_TS") or "").strip()

            try:
                shift_start = (
                    datetime.strptime(shift_start_str, "%H:%M:%S").time()
                    if shift_start_str
                    else None
                )
            except ValueError:
                shift_start = None

            try:
                shift_end = (
                    datetime.strptime(shift_end_str, "%H:%M:%S").time()
                    if shift_end_str
                    else None
                )
            except ValueError:
                shift_end = None

            try:
                clock_in_ts = (
                    datetime.strptime(clock_in_str, "%Y-%m-%d %H:%M:%S")
                    if clock_in_str
                    else None
                )
            except ValueError:
                clock_in_ts = None

            try:
                clock_out_ts = (
                    datetime.strptime(clock_out_str, "%Y-%m-%d %H:%M:%S")
                    if clock_out_str
                    else None
                )
            except ValueError:
                clock_out_ts = None

            params = {
                "STORE_ID": store_id,
                "EMP_ID": emp_id,
                "WORK_DT": work_dt,
                "SHIFT_START_PLAN": shift_start,
                "CLOCK_IN_TS": clock_in_ts,
                "SHIFT_END_PLAN": shift_end,
                "CLOCK_OUT_TS": clock_out_ts,
                "LATE_FLAG": (row.get("LATE_FLAG") or "").strip() or "N",
                "EARLY_FLAG": (row.get("EARLY_FLAG") or "").strip() or "N",
            }
            batch.append(params)

            if len(batch) >= batch_size:
                conn.execute(insert_sql, batch)
                inserted += len(batch)
                print(f"[INFO] ATTEND inserted {inserted} rows ...")
                batch.clear()

    if batch:
        conn.execute(insert_sql, batch)
        inserted += len(batch)

    return inserted


def load_attend_log(conn) -> int:
    insert_sql = text(
        """
        INSERT INTO `ATTEND_LOG` (
            `STORE_ID`,
            `EMP_ID`,
            `WORK_DT`,
            `WORK_TYPE`
        ) VALUES (
            :STORE_ID,
            :EMP_ID,
            :WORK_DT,
            :WORK_TYPE
        )
        """
    )

    inserted = 0
    batch_size = 5000
    batch: list[dict] = []

    with open(ATTEND_LOG_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            store_id = (row.get("STORE_ID") or "").strip()
            emp_id = (row.get("EMP_ID") or "").strip()
            work_dt_str = (row.get("WORK_DT") or "").strip()
            work_type = (row.get("WORK_TYPE") or "").strip()
            if not store_id or not emp_id or not work_dt_str or not work_type:
                continue
            try:
                work_dt = datetime.strptime(work_dt_str, "%Y-%m-%d").date()
            except ValueError:
                continue

            params = {
                "STORE_ID": store_id,
                "EMP_ID": emp_id,
                "WORK_DT": work_dt,
                "WORK_TYPE": work_type,
            }
            batch.append(params)

            if len(batch) >= batch_size:
                conn.execute(insert_sql, batch)
                inserted += len(batch)
                print(f"[INFO] ATTEND_LOG inserted {inserted} rows ...")
                batch.clear()

    if batch:
        conn.execute(insert_sql, batch)
        inserted += len(batch)

    return inserted


def main() -> None:
    print("[INFO] SCHEDULE_INGREDIENT / SCHEDULE_RESULT / ATTEND / ATTEND_LOG CSV → DB 적재 시작")
    conn = engine.connect()
    trans = conn.begin()
    try:
        clear_tables(conn)

        result_cnt = load_schedule_result(conn)
        print(f"[OK] SCHEDULE_RESULT 적재 완료 (총 {result_cnt}행)")

        ing_cnt = load_schedule_ingredient(conn)
        print(f"[OK] SCHEDULE_INGREDIENT 적재 완료 (총 {ing_cnt}행)")

        attend_cnt = load_attend(conn)
        print(f"[OK] ATTEND 적재 완료 (총 {attend_cnt}행)")

        log_cnt = load_attend_log(conn)
        print(f"[OK] ATTEND_LOG 적재 완료 (총 {log_cnt}행)")

        trans.commit()
        print("[INFO] 스케줄/근태 CSV → DB 적재 종료")
    except Exception as e:  # noqa: BLE001
        trans.rollback()
        print(f"[ERROR] 스케줄/근태 적재 중 오류: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()


