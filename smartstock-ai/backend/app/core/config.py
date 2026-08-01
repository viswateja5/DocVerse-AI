from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "SmartStock AI"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    
    # Redis for caching and rate limiting
    REDIS_URL: str = "redis://localhost:6379"

    # Database & Auth
    DATABASE_URL: str = "sqlite+aiosqlite:///./smartstock.db"
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7" # Default for dev, override in prod
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Paths (useful for ML models)
    BASE_DIR: str = "/Users/mac/.gemini/antigravity-ide/scratch/smartstock-ai"
    MODEL_PATH: str = f"{BASE_DIR}/backend/reports/ml_models/best_forecaster.joblib"
    DATA_PATH: str = f"{BASE_DIR}/data/processed/train_processed.csv"
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
