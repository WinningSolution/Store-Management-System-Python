from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    dashboard,
    employee,
    schedule,
    vacation,
    sales,
    store,
    inventory,
    order_forecast,
    customer_segments,
    customer_retention,
    customer,
)


app = FastAPI(title="Winning Solution Store Management API")

app.add_middleware(
    CORSMiddleware,
    # 개발 환경에서는 모든 Origin 허용 (로컬 프론트엔드 CORS 오류 방지)
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# API v1 라우터 그룹
api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(dashboard.router)
api_v1_router.include_router(employee.router)
api_v1_router.include_router(schedule.router)
api_v1_router.include_router(vacation.router)
api_v1_router.include_router(sales.router)
api_v1_router.include_router(store.router)
api_v1_router.include_router(inventory.router)
api_v1_router.include_router(order_forecast.router)
api_v1_router.include_router(customer_segments.router)
api_v1_router.include_router(customer_retention.router)
api_v1_router.include_router(customer.router)

# 라우터 등록
app.include_router(api_v1_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}


