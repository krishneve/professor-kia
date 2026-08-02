from typing import Annotated, Any

from fastapi import APIRouter, Depends

from config import get_settings
from dependencies import get_db
from services.supabase_service import SupabaseService

router = APIRouter(tags=["health"])


@router.get("/health")
def health(db: Annotated[SupabaseService | None, Depends(_optional_db)] = None) -> dict[str, Any]:
    settings = get_settings()
    supabase_connected = False
    if db is not None:
        supabase_connected = db.ping()

    return {
        "status": "ok",
        "service": settings.app_name,
        "backend": "fastapi",
        "supabase_configured": settings.supabase_configured,
        "supabase_connected": supabase_connected,
        "hasApiKey": bool(settings.gemma_api_key),
    }


def _optional_db() -> SupabaseService | None:
    settings = get_settings()
    if not settings.supabase_configured:
        return None
    try:
        return get_db_impl()
    except Exception:
        return None


def get_db_impl() -> SupabaseService:
    from services.supabase_service import get_supabase_service

    return get_supabase_service()
