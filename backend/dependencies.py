from typing import Annotated, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from services.supabase_service import SupabaseService, get_supabase_service
from utils.jwt import decode_access_token

security = HTTPBearer(auto_error=False)


def get_db() -> SupabaseService:
    return get_supabase_service()


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[SupabaseService, Depends(get_db)],
) -> dict[str, Any]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )
    try:
        payload = decode_access_token(credentials.credentials)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc

    user = db.find_user_by_id(payload["id"])
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db._public_user(user)


def require_teacher(user: Annotated[dict[str, Any], Depends(get_current_user)]) -> dict[str, Any]:
    if user["role"] != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher access required")
    return user


def require_student(user: Annotated[dict[str, Any], Depends(get_current_user)]) -> dict[str, Any]:
    if user["role"] != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student access required")
    return user
