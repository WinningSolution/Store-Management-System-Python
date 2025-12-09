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
)


app = FastAPI(title="Winning Solution Store Management API")

# CORS 설정: 로컬 프론트엔드에서 호출 가능하도록 허용
origins = [
    "http://localhost",
    "http://127.0.0.1",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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

# 라우터 등록
app.include_router(api_v1_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}


