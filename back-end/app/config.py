from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # 기본값은 현재 사용 중인 DB 접속 정보와 동일하게 설정
    DB_USER: str = "db_admin"
    DB_PASSWORD: str = "1234"
    DB_HOST: str = "3.39.73.108"
    DB_PORT: int = 3307
    DB_NAME: str = "winning_solution"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()


