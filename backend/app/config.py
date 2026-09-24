import os
from typing import Union
from pydantic import field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "TubeVault API"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    
    # File & Download limits
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", 500))
    TEMP_DIR: str = os.getenv("TEMP_DIR", os.path.join(os.path.dirname(__file__), "..", "downloads"))
    MAX_CONCURRENT_DOWNLOADS: int = int(os.getenv("MAX_CONCURRENT_DOWNLOADS", 5))
    FILE_TTL_MINUTES: int = int(os.getenv("FILE_TTL_MINUTES", 15))
    
    # Security & CORS
    ALLOWED_ORIGINS: Union[list[str], str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173"
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v):
        if isinstance(v, str):
            if v.strip() == "*":
                return ["*"]
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    RATE_LIMIT_REQUESTS_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_REQUESTS_PER_MINUTE", 30))
    
    # Allowed domains for SSRF protection
    ALLOWED_DOMAINS: Union[list[str], str] = [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "music.youtube.com",
        "youtu.be",
        "instagram.com",
        "www.instagram.com",
        "m.instagram.com",
        "ddinstagram.com"
    ]

    @field_validator("ALLOWED_DOMAINS", mode="before")
    @classmethod
    def parse_allowed_domains(cls, v):
        if isinstance(v, str):
            return [domain.strip() for domain in v.split(",") if domain.strip()]
        return v

    model_config = {
        "env_file": ".env",
        "extra": "ignore"
    }

settings = Settings()

# Ensure temp downloads directory exists
os.makedirs(settings.TEMP_DIR, exist_ok=True)
