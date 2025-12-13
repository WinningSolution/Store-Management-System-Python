import csv
from datetime import datetime

from sqlalchemy import text

from app.database import engine

"""
EMP.csv → EMP 테이블 적재 스크립트

- CSV 경로 (로컬 개발 PC 기준):
  * C:\\Users\\HBS\\Desktop\\DATA\\EMP.csv

- 동작:
  1) 스케줄·근태 관련 자식 테이블(존재하는 경우)부터 비운다.
     - ATTEND_LOG
     - ATTEND
     - SCHEDULE_INGREDIENT
     - SCHEDULE_RESULT
  2) EMP 테이블을 비운다.
  3) EMP.csv 를 읽어 재적재한다.

주의:
- 이 스크립트 실행 후에는 ATTEND / ATTEND_LOG / SCHEDULE_INGREDIENT / SCHEDULE_RESULT
  데이터도 함께 삭제되므로, 이후 더미데이터 생성 스크립트로 다시 채워야 한다.
"""


EMP_CSV = r"C:\Users\HBS\Desktop\DATA\EMP.csv"


def clear_child_tables(conn) -> None:
    """EMP 를 참조할 수 있는 자식 테이블들을 먼저 비운다."""
    # 존재하지 않는 테이블일 수도 있으므로, 에러는 무시하고 진행
    child_tables = [
        "ATTEND_LOG",
        "ATTEND",
        "SCHEDULE_INGREDIENT",
        "SCHEDULE_RESULT",
    ]
    for tbl in child_tables:
        try:
            print(f"[INFO] DELETE FROM {tbl} ...")
            conn.execute(text(f"DELETE FROM `{tbl}`"))
        except Exception as e:  # noqa: BLE001
            print(f"[WARN] {tbl} 삭제 중 오류 (무시하고 계속): {e}")


def load_emp() -> None:
    conn = engine.connect()
    trans = conn.begin()
    try:
        clear_child_tables(conn)

        print("[INFO] DELETE FROM EMP ...")
        conn.execute(text("DELETE FROM `EMP`"))

        insert_sql = text(
            """
            INSERT INTO `EMP` (
                `STORE_ID`,
                `EMP_ID`,
                `EMP_NM`,
                `HIRE_DT`,
                `WORK_STATUS`,
                `SCH_STATUS`,
                `GRADE`
            ) VALUES (
                :STORE_ID,
                :EMP_ID,
                :EMP_NM,
                :HIRE_DT,
                :WORK_STATUS,
                :SCH_STATUS,
                :GRADE
            )
            """
        )

        inserted = 0
        batch_size = 5000
        batch: list[dict] = []

        with open(EMP_CSV, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                store_id = (row.get("STORE_ID") or "").strip()
                emp_id = (row.get("EMP_ID") or "").strip()
                emp_nm = (row.get("EMP_NM") or "").strip()
                if not store_id or not emp_id or not emp_nm:
                    continue

                hire_str = (row.get("HIRE_DT") or "").strip()
                try:
                    hire_dt = (
                        datetime.strptime(hire_str, "%Y-%m-%d").date()
                        if hire_str
                        else None
                    )
                except ValueError:
                    hire_dt = None

                params = {
                    "STORE_ID": store_id,
                    "EMP_ID": emp_id,
                    "EMP_NM": emp_nm,
                    "HIRE_DT": hire_dt,
                    "WORK_STATUS": (row.get("WORK_STATUS") or "").strip() or "재직",
                    "SCH_STATUS": (row.get("SCH_STATUS") or "").strip() or "무관",
                    "GRADE": (row.get("GRADE") or "").strip() or "스태프",
                }
                batch.append(params)

                if len(batch) >= batch_size:
                    conn.execute(insert_sql, batch)
                    inserted += len(batch)
                    print(f"[INFO] EMP inserted {inserted} rows ...")
                    batch.clear()

        if batch:
            conn.execute(insert_sql, batch)
            inserted += len(batch)

        trans.commit()
        print(f"[OK] EMP 적재 완료 (총 {inserted}행)")
    except Exception as e:  # noqa: BLE001
        trans.rollback()
        print(f"[ERROR] EMP 적재 중 오류: {e}")
        raise
    finally:
        conn.close()


def main() -> None:
    print("[INFO] EMP CSV → DB 적재 시작")
    load_emp()
    print("[INFO] EMP CSV → DB 적재 종료")


if __name__ == "__main__":
    main()


