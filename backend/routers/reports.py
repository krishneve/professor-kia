from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from dependencies import get_current_user, get_db
from services.supabase_service import SupabaseService

router = APIRouter(prefix="/reports", tags=["reports"])


class CreateReportRequest(BaseModel):
    student_id: str | None = None
    student_name: str | None = None
    viva_session_id: str | None = None
    viva_title: str | None = None
    score: float | None = None
    report_json: dict[str, Any] = Field(default_factory=dict)


@router.get("")
def list_reports(
    user: Annotated[dict[str, Any], Depends(get_current_user)],
    db: Annotated[SupabaseService, Depends(get_db)],
) -> list[dict[str, Any]]:
    return db.get_reports()


@router.post("")
def create_report(
    body: CreateReportRequest,
    user: Annotated[dict[str, Any], Depends(get_current_user)],
    db: Annotated[SupabaseService, Depends(get_db)],
) -> dict[str, Any]:
    student = db.get_student_by_user_id(user["id"])
    report = {
        "id": f"rep-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        "student_id": body.student_id or (student["student_id"] if student else user["id"]),
        "student_name": body.student_name or user["full_name"],
        "viva_session_id": body.viva_session_id or "viva-1",
        "viva_title": body.viva_title or "Oral Examination",
        "score": body.score if body.score is not None else 85,
        "report_json": body.report_json,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return db.create_report(report)
