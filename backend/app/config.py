import os


class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data/annotation.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "poc-secret-key-2024")
    JWT_EXPIRE_HOURS: int = 24
    UPLOAD_DIR: str = "/app/data/uploads"
    MODEL_DIR: str = "/app/models"


settings = Settings()
