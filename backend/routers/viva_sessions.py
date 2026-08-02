from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from dependencies import get_current_user, get_db, require_teacher
from services.supabase_service import SupabaseService

router = APIRouter(prefix="/viva-sessions", tags=["viva-sessions"])


class CreateVivaSessionRequest(BaseModel):
    subject_id: str
    title: str
    scheduled_date: str


class UpdateVivaSessionRequest(BaseModel):
    subject_id: str | None = None
    title: str | None = None
    scheduled_date: str | None = None
    status: str | None = None


@router.get("")
def list_viva_sessions(
    user: Annotated[dict[str, Any], Depends(get_current_user)],
    db: Annotated[SupabaseService, Depends(get_db)],
) -> list[dict[str, Any]]:
    return db.get_viva_sessions()


@router.post("")
def create_viva_session(
    body: CreateVivaSessionRequest,
    user: Annotated[dict[str, Any], Depends(require_teacher)],
    db: Annotated[SupabaseService, Depends(get_db)],
) -> dict[str, Any]:
    subjects = db.get_subjects()
    subject = next((s for s in subjects if s["id"] == body.subject_id), None)

    viva = {
        "id": f"viva-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        "subject_id": body.subject_id,
        "subject_name": subject["subject_name"] if subject else "General Subject",
        "title": body.title,
        "status": "scheduled",
        "scheduled_date": body.scheduled_date,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return db.create_viva_session(viva)


@router.put("/{viva_id}")
def update_viva_session(
    viva_id: str,
    body: UpdateVivaSessionRequest,
    user: Annotated[dict[str, Any], Depends(get_current_user)],
    db: Annotated[SupabaseService, Depends(get_db)],
) -> dict[str, Any]:
    update = body.model_dump(exclude_none=True)
    updated = db.update_viva_session(viva_id, update)
    if not updated:
        raise HTTPException(status_code=404, detail="Viva session not found")
    return updated


@router.delete("/{viva_id}")
def delete_viva_session(
    viva_id: str,
    user: Annotated[dict[str, Any], Depends(require_teacher)],
    db: Annotated[SupabaseService, Depends(get_db)],
) -> dict[str, Any]:
    db.delete_viva_session(viva_id)
    return {"success": True, "message": "Viva session deleted"}


@router.post("/{viva_id}/duplicate")
def duplicate_viva_session(
    viva_id: str,
    user: Annotated[dict[str, Any], Depends(require_teacher)],
    db: Annotated[SupabaseService, Depends(get_db)],
) -> dict[str, Any]:
    sessions = db.get_viva_sessions()
    existing = next((v for v in sessions if v["id"] == viva_id), None)
    if not existing:
        raise HTTPException(status_code=404, detail="Viva session not found")

    duplicated = {
        **existing,
        "id": f"viva-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        "title": f"{existing['title']} (Copy)",
        "status": "scheduled",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    duplicated.pop("blueprint_id", None)
    return db.create_viva_session(duplicated)
