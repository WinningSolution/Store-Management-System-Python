UNIQLO Store Management API v2
================================

이 디렉토리는 Winning Solution 프로젝트의 새로운 FastAPI 백엔드(v2)입니다.

목표
----
- 요구사항정의서, DDL, 데이터 계약서 v1을 기준으로 한 **정합성 높은 API 서버** 구현
- 기존 `back-end` 폴더는 유지하고, 이곳에서 **정리된 구조**로 재구현

구성 개요
---------
- `app/main.py`        : FastAPI 앱 엔트리포인트
- `app/config.py`      : 환경변수/설정 (DB 접속, CORS 등)
- `app/database.py`    : SQLAlchemy 세션/엔진
- `app/models/`        : MySQL DDL 기반 SQLAlchemy 모델
- `app/schemas/`       : 데이터 계약서 기반 Pydantic 스키마
- `app/routers/`       : 도메인별 라우터 (employees, inventory, sales, schedule, dashboard, customer 등)

로컬 실행 (예정)
----------------
1. 파이썬 가상환경 생성 및 진입
2. `pip install -r requirements.txt`
3. `uvicorn app.main:app --reload --port 8001`

프론트엔드는 `UNIQLO Store Management UI`에서
`VITE_API_BASE_URL=http://localhost:8001/api/v1`로 연동할 수 있습니다.












