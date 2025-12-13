import csv
from datetime import datetime

from sqlalchemy import text

from app.database import engine

"""
DISCOUNT.csv → MySQL DISCOUNT 테이블 적재 스크립트

- DATA/더미데이터 생성 py 파일/discount.py 에서 생성한 DISCOUNT.csv 를
  백엔드 DB의 DISCOUNT 테이블로 밀어 넣기 위한 단순 배치 스크립트입니다.
- EVENT_ID / PROD_ID 는 CSV 값 그대로 사용하고, 날짜 컬럼은 파싱해서 넣습니다.
"""

# 로컬 개발 PC 기준 CSV 경로 (사용자 환경에 맞게 필요 시 수정)
CSV_PATH = r"C:\Users\HBS\Desktop\DATA\DISCOUNT.csv"


def parse_date(dt_str: str) -> datetime:
  # discount.py 는 STR_DT / END_DT 를 YYYY-MM-DD 형식으로 저장
  return datetime.strptime(dt_str, "%Y-%m-%d")


def parse_datetime(dt_str: str) -> datetime:
  # REG_DT 형식: %Y-%m-%d %H:%M:%S
  return datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")


def main():
  print("[INFO] DISCOUNT.csv → DB 적재 시작")
  conn = engine.connect()
  trans = conn.begin()
  try:
    print("[INFO] TRUNCATE TABLE DISCOUNT ...")
    conn.execute(text("TRUNCATE TABLE `DISCOUNT`"))

    inserted = 0
    batch_size = 1000

    insert_sql = text(
      """
      INSERT INTO `DISCOUNT` (
        `EVENT_ID`,
        `EVENT_TYPE`,
        `EVENT_NM`,
        `PROD_ID`,
        `STR_DT`,
        `END_DT`,
        `DIS_PRICE`,
        `REG_DT`
      ) VALUES (
        :EVENT_ID,
        :EVENT_TYPE,
        :EVENT_NM,
        :PROD_ID,
        :STR_DT,
        :END_DT,
        :DIS_PRICE,
        :REG_DT
      )
      """
    )

    with open(CSV_PATH, "r", encoding="utf-8") as f:
      reader = csv.DictReader(f)
      batch = []
      for row in reader:
        try:
          params = {
            "EVENT_ID": int(row["EVENT_ID"]),
            "EVENT_TYPE": row["EVENT_TYPE"],
            "EVENT_NM": row["EVENT_NM"],
            "PROD_ID": row["PROD_ID"],
            "STR_DT": parse_date(row["STR_DT"]),
            "END_DT": parse_date(row["END_DT"]),
            "DIS_PRICE": float(row["DIS_PRICE"]),
            "REG_DT": parse_datetime(row["REG_DT"]),
          }
        except Exception as e:  # 잘못된 행은 건너뜀
          print(f"[WARN] 잘못된 DISCOUNT 행 건너뜀: {e} / row={row}")
          continue

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
    print(f"[OK] DISCOUNT 적재 완료 (총 {inserted}행)")
  except Exception as e:
    trans.rollback()
    print(f"[ERROR] DISCOUNT 적재 중 오류: {e}")
    raise
  finally:
    conn.close()


if __name__ == "__main__":
  main()



