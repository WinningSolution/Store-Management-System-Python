# 🏪 UNIQLO Store Management System

매장 관리 시스템으로, 직원 관리, 재고 관리, 판매 분석, 고객 세그멘테이션, 주문 예측 등 매장 운영에 필요한 다양한 기능을 제공합니다.

## 📋 목차

- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [시작하기](#시작하기)
- [API 문서](#api-문서)
- [배포](#배포)
- [개발 가이드](#개발-가이드)

## ✨ 주요 기능

### 📊 대시보드
- 실시간 매장 운영 현황 대시보드
- 주요 지표 및 통계 시각화

### 👥 직원 관리
- 직원 정보 관리
- 근무 스케줄 관리
- 휴가 신청 및 승인

### 📦 재고 관리
- 상품 재고 현황 조회
- 재고 입출고 관리
- 재고 부족 알림

### 💰 판매 관리
- 판매 데이터 조회 및 분석
- 판매 통계 및 트렌드 분석

### 🏬 매장 관리
- 매장 정보 관리
- 매장별 운영 현황 조회

### 🤖 주문 예측 (Machine Learning)
- 머신러닝 기반 주문량 예측
- 재고 최적화를 위한 수요 예측

### 👤 고객 관리
- 고객 세그멘테이션
- 고객 유지율 분석
- 고객 정보 관리

### 🛍️ 상품 관리
- 상품 정보 관리
- 상품 카테고리 관리

## 🛠 기술 스택

### Backend
- **Framework**: FastAPI 0.110.0
- **Language**: Python 3.10
- **ORM**: SQLAlchemy 2.0.23
- **Database**: MySQL 8.0
- **Validation**: Pydantic 2.6.3

### Frontend
- **Framework**: React 18.3.1
- **Build Tool**: Vite 6.3.5
- **Language**: TypeScript
- **UI Library**: Radix UI
- **Styling**: Tailwind CSS
- **Charts**: Recharts 2.15.2
- **Maps**: React Leaflet 4.2.1

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx
- **CI/CD**: Jenkins

## 📁 프로젝트 구조

```
store-system/
├── back-end/              # FastAPI 백엔드
│   ├── app/
│   │   ├── main.py       # FastAPI 앱 엔트리포인트
│   │   ├── config.py     # 환경변수 설정
│   │   ├── database.py   # 데이터베이스 연결
│   │   ├── models/       # SQLAlchemy 모델
│   │   ├── schemas/      # Pydantic 스키마
│   │   ├── routers/      # API 라우터
│   │   └── ml/           # 머신러닝 모델
│   ├── requirements.txt  # Python 의존성
│   └── Dockerfile        # 백엔드 Docker 이미지
│
├── front-end/            # React 프론트엔드
│   ├── src/
│   │   ├── components/   # React 컴포넌트
│   │   ├── services/     # API 서비스
│   │   └── lib/          # 유틸리티
│   ├── package.json      # Node.js 의존성
│   └── Dockerfile        # 프론트엔드 Docker 이미지
│
├── nginx/                # Nginx 설정
│   └── nginx.conf        # 리버스 프록시 설정
│
├── jenkins/              # CI/CD 설정
│   └── Jenkinsfile       # Jenkins 파이프라인
│
└── docker-compose.yml    # Docker Compose 설정
```

## 🚀 시작하기

### 사전 요구사항

- Docker & Docker Compose
- Git

### 설치 및 실행

1. **저장소 클론**
```bash
git clone https://github.com/WinningSolution/Store-Management-System-Python.git
cd Store-Management-System-Python
```

2. **환경 변수 설정 (선택사항)**

백엔드 환경 변수 설정이 필요한 경우 `back-end/.env` 파일을 생성하세요:
```env
DB_USER=root
DB_PASSWORD=1234
DB_HOST=mysql8
DB_PORT=3306
DB_NAME=winning_solution
```

3. **Docker Compose로 실행**
```bash
docker compose up -d --build
```

4. **서비스 접속**
- 프론트엔드: http://localhost
- 백엔드 API: http://localhost/api/v1
- API 헬스 체크: http://localhost/api/v1/health

### 로컬 개발 환경

#### Backend 개발

```bash
cd back-end

# 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
uvicorn app.main:app --reload --port 8000
```

#### Frontend 개발

```bash
cd front-end

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

프론트엔드 개발 시 백엔드 API를 연결하려면 `.env` 파일에 다음을 추가하세요:
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## 📚 API 문서

FastAPI가 제공하는 자동 API 문서:
- Swagger UI: http://localhost/api/v1/docs
- ReDoc: http://localhost/api/v1/redoc

### 주요 API 엔드포인트

- `GET /api/v1/dashboard/*` - 대시보드 데이터
- `GET /api/v1/employees/*` - 직원 관리
- `GET /api/v1/schedules/*` - 스케줄 관리
- `GET /api/v1/sales/*` - 판매 데이터
- `GET /api/v1/inventory/*` - 재고 관리
- `GET /api/v1/order-forecast/*` - 주문 예측
- `GET /api/v1/customers/*` - 고객 관리
- `GET /api/v1/products/*` - 상품 관리

## 🚢 배포

### Jenkins를 통한 자동 배포

프로젝트는 Jenkins를 사용한 CI/CD 파이프라인을 포함하고 있습니다.

1. **Jenkins 설정**
   - Jenkins 서버에 프로젝트 등록
   - GitHub Webhook 설정 (선택사항)

2. **자동 배포 트리거**
   - GitHub에 Push 시 자동으로 빌드 및 배포
   - 또는 Jenkins에서 수동으로 파이프라인 실행

3. **배포 프로세스**
   - Git 저장소에서 최신 코드 가져오기
   - Docker 이미지 빌드
   - 컨테이너 재시작
   - 헬스 체크 수행

### 수동 배포

```bash
# 기존 컨테이너 중지 및 제거
docker compose down

# 이미지 재빌드
docker compose build --no-cache

# 컨테이너 시작
docker compose up -d

# 로그 확인
docker compose logs -f
```

## 👨‍💻 개발 가이드

### 코드 스타일

- **Backend**: Python PEP 8 스타일 가이드 준수
- **Frontend**: ESLint 및 Prettier 설정 권장

### 데이터베이스 마이그레이션

데이터베이스 스키마 변경 시:
1. `app/models/` 디렉토리의 모델 파일 수정
2. SQLAlchemy를 통해 자동으로 반영되거나 수동 마이그레이션 수행

### CSV 데이터 로드

백엔드 디렉토리에 다양한 CSV 데이터 로드 스크립트가 포함되어 있습니다:
- `load_emp_from_csv.py` - 직원 데이터
- `load_inventory_from_csv.py` - 재고 데이터
- `load_sales_from_csv.py` - 판매 데이터
- `load_schedule_from_csv.py` - 스케줄 데이터
- `load_customer_segment_from_csv.py` - 고객 세그먼트 데이터
- `load_discount_from_csv.py` - 할인 데이터

## 📝 라이선스

이 프로젝트는 Winning Solution 팀의 프로젝트입니다.

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 문의

프로젝트 관련 문의사항이 있으시면 이슈를 등록해주세요.

---

Made with ❤️ by Winning Solution Team

