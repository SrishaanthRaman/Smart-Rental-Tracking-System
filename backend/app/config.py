import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://user:password@localhost:5432/smart_rental"
    )
    MODEL_PATH: str = "models/maintenance_model.pkl"
    # Add other config vars

settings = Settings()