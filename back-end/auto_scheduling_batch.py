"""
auto_scheduling_batch.py
------------------------

젠킨스/배치 담당자가 자동 스케줄링 워크플로우를 이해하고,
향후 DB 저장(/scheduling/apply) 기능이 구현되었을 때 사용할 수 있는 예시 스크립트입니다.

현재 레포 상태:
  - /scheduling/auto-generate   : 존재 (SCHEDULE_RESULT 템플릿 생성)
  - /scheduling/result          : 존재 (메모리 상에서 배정 결과 계산, DB에는 미저장)
  - /scheduling/apply           : 아직 미구현 (ATTEND 에 실제 저장하는 단계)

따라서 이 스크립트는 "아키텍처/워크플로우 예시" 용도로만 추가되어 있으며,
/scheduling/apply 엔드포인트가 구현되기 전까지는 2단계에서 실패(404 등)할 수 있습니다.

사용 방식(예정):
  1) FastAPI 서버가 실행 중이어야 합니다.
  2) python auto_scheduling_batch.py
"""

from __future__ import annotations

import datetime
from typing import Iterable

import requests


API_BASE = "http://localhost:8000/api/v1"  # FastAPI 서버 주소 (환경에 맞게 수정)


def get_next_monday(base_date: datetime.date | None = None) -> datetime.date:
  """기준일 기준 다음 주 월요일을 계산한다."""
  if base_date is None:
    base_date = datetime.date.today()
  weekday = base_date.weekday()  # 0=Mon..6=Sun
  days_to_next_monday = (7 - weekday) % 7
  if days_to_next_monday == 0:
    days_to_next_monday = 7
  return base_date + datetime.timedelta(days=days_to_next_monday)


def auto_schedule_for_store(store_id: str, week_start: datetime.date) -> None:
  """단일 점포에 대해 자동 스케줄링 워크플로우를 수행한다.

  1) /scheduling/auto-generate  호출 → SCHEDULE_RESULT 템플릿 생성
  2) /scheduling/apply          호출 → ATTEND 에 실제 스케줄 저장 (추후 구현 예정)
  """

  week_start_str = week_start.strftime("%Y-%m-%d")

  # 1) 필요 인원 템플릿 생성
  resp = requests.post(
    f"{API_BASE}/scheduling/auto-generate",
    json={
      "storeId": store_id,
      "weekStartDt": week_start_str,
      "strategy": "full",
    },
    timeout=30,
  )
  resp.raise_for_status()
  print(f"[INFO] auto-generate 완료: store={store_id}, week_start={week_start_str}")

  # 2) 확정 스케줄 저장 (ATTEND)
  resp2 = requests.post(
    f"{API_BASE}/scheduling/apply",
    json={
      "storeId": store_id,
      "weekStartDt": week_start_str,
    },
    timeout=60,
  )
  resp2.raise_for_status()
  print(f"[OK] apply 완료: store={store_id}, week_start={week_start_str}")


def main(target_stores: Iterable[str] | None = None) -> None:
  """여러 점포에 대해 일괄 자동 스케줄링을 수행한다."""

  # 대상 점포 리스트 예시 (실제 운영 시에는 DB/설정 파일에서 읽어오는 구조 권장)
  if target_stores is None:
    target_stores = ["S001", "S002"]

  # 기준: 다음 주 월요일
  next_monday = get_next_monday()
  print(f"[INFO] Target week start: {next_monday}")

  for store_id in target_stores:
    try:
      auto_schedule_for_store(store_id, next_monday)
    except Exception as e:  # pylint: disable=broad-except
      # Jenkins 로그에서 확인할 수 있도록 에러 출력
      print(f"[ERROR] {store_id} 처리 중 오류 발생: {e}")


if __name__ == "__main__":
  main()


