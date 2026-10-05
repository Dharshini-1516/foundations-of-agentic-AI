from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str = "placify-super-secret-jwt-key-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    DATABASE_URL: str = "sqlite:///./placify.db"
    CHROMA_PERSIST_DIR: str = "./chroma_db"
    ENVIRONMENT: str = "development"

    model_config = {"env_file": ".env", "extra": "ignore"}

settings = Settings()
