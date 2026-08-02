from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from dependencies import get_current_user, get_db, require_teacher
from services.supabase_service import SupabaseService

router = APIRouter(prefix="/subjects", tags=["subjects"])


class CreateSubjectRequest(BaseModel):
    subject_name: str
    subject_code: str
    class_id: str


class UpdateSubjectRequest(BaseModel):
    subject_name: str | None = None
    subject_code: str | None = None


@router.get("")
def list_subjects(
    user: Annotated[dict[str, Any], Depends(get_current_user)],
    db: Annotated[SupabaseService, Depends(get_db)],
    class_id: str | None = Query(default=None),
) -> list[dict[str, Any]]:
    subjects = db.get_subjects()
    if class_id:
        subjects = [s for s in subjects if s["class_id"] == class_id]

    if user["role"] == "student":
        student = db.get_student_by_user_id(user["id"])
        if not student:
            return []
        enrollments = [e for e in db.get_enrollments() if e["student_id"] == student["student_id"]]
        class_ids = {e["class_id"] for e in enrollments}
        subjects = [s for s in subjects if s["class_id"] in class_ids]

    return subjects


@router.post("")
def create_subject(
    body: CreateSubjectRequest,
    user: Annotated[dict[str, Any], Depends(require_teacher)],
    db: Annotated[SupabaseService, Depends(get_db)],
) -> dict[str, Any]:
    target_class = db.get_class_by_id(body.class_id)
    if not target_class:
        raise HTTPException(status_code=404, detail="Selected class does not exist")

    subject = {
        "id": f"sbj-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        "subject_name": body.subject_name,
        "subject_code": body.subject_code,
        "class_id": body.class_id,
        "class_name": target_class["class_name"],
        "teacher_name": user["full_name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return db.create_subject(subject)


@router.put("/{subject_id}")
def update_subject(
    subject_id: str,
    body: UpdateSubjectRequest,
    user: Annotated[dict[str, Any], Depends(require_teacher)],
    db: Annotated[SupabaseService, Depends(get_db)],
) -> dict[str, Any]:
    update = body.model_dump(exclude_none=True)
    updated = db.update_subject(subject_id, update)
    if not updated:
        raise HTTPException(status_code=404, detail="Subject not found")
    return updated


@router.delete("/{subject_id}")
def delete_subject(
    subject_id: str,
    user: Annotated[dict[str, Any], Depends(require_teacher)],
    db: Annotated[SupabaseService, Depends(get_db)],
) -> dict[str, bool]:
    db.delete_subject(subject_id)
    return {"success": True}


@router.get("/{subject_id}/students")
def list_subject_students(
    subject_id: str,
    user: Annotated[dict[str, Any], Depends(get_current_user)],
    db: Annotated[SupabaseService, Depends(get_db)],
) -> list[dict[str, Any]]:
    subjects = db.get_subjects()
    subject = next((s for s in subjects if s["id"] == subject_id), None)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    students = db.get_students_for_class(subject["class_id"])
    result = []
    for std in students:
        user_row = db.find_user_by_id(std["user_id"])
        result.append(
            {
                "student_id": std["student_id"],
                "full_name": (user_row or {}).get("full_name") or std.get("full_name") or "Student",
                "email": (user_row or {}).get("email") or std.get("email") or "",
                "joined_at": std["user_id"],
            }
        )
    return result


@router.get("/{subject_id}/materials")
def list_materials(
    subject_id: str,
    user: Annotated[dict[str, Any], Depends(get_current_user)],
    db: Annotated[SupabaseService, Depends(get_db)],
) -> list[dict[str, Any]]:
    return db.get_study_materials(subject_id)


@router.get("/{subject_id}/knowledge-base")
def get_knowledge_base(
    subject_id: str,
    user: Annotated[dict[str, Any], Depends(get_current_user)],
    db: Annotated[SupabaseService, Depends(get_db)],
) -> dict[str, Any]:
    return db.get_knowledge_base(subject_id)


@router.get("/{subject_id}/blueprints")
def list_blueprints(
    subject_id: str,
    user: Annotated[dict[str, Any], Depends(get_current_user)],
    db: Annotated[SupabaseService, Depends(get_db)],
) -> list[dict[str, Any]]:
    return db.get_blueprints(subject_id)
