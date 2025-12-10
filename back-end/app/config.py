from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # 환경변수에서 가져오고, 없으면 docker-compose.yml의 기본값 사용
    DB_USER: str = "root"  # docker-compose.yml과 일치
    DB_PASSWORD: str = "1234"  # docker-compose.yml과 일치
    DB_HOST: str = "mysql8"  # docker-compose.yml의 컨테이너 이름과 일치
    DB_PORT: int = 3306  # 컨테이너 내부 포트
    DB_NAME: str = "winning_solution"  # docker-compose.yml과 일치

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()


