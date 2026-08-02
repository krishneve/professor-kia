from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "../.env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "KIA - Knowledge Intelligence Assessor API"
    debug: bool = False
    api_prefix: str = "/api"

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    jwt_secret: str = "kia_secret_key_gemma_2026"
    jwt_algorithm: str = "HS256"
    jwt_expire_days: int = 7

    gemma_api_key: str = ""
    gemini_api_key: str = ""
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key and self.supabase_anon_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
