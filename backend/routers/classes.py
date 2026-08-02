import random
from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from dependencies import get_current_user, get_db, require_student, require_teacher
from services.supabase_service import SupabaseService

router = APIRouter(prefix="/classes", tags=["classes"])


class CreateClassRequest(BaseModel):
    class_name: str
    semester: str
    department: str


class JoinClassRequest(BaseModel):
    class_code: str


@router.get("")
def list_classes(
    user: Annotated[dict[str, Any], Depends(get_current_user)],
    db: Annotated[SupabaseService, Depends(get_db)],
) -> list[dict[str, Any]]:
    classes = db.get_classes()
    if user["role"] == "student":
        student = db.get_student_by_user_id(user["id"])
        if not student:
            return []
        enrollments = [e for e in db.get_enrollments() if e["student_id"] == student["student_id"]]
        enrolled_ids = {e["class_id"] for e in enrollments}
        return [c for c in classes if c["id"] in enrolled_ids]
    return classes


@router.post("")
def create_class(
    body: CreateClassRequest,
    user: Annotated[dict[str, Any], Depends(require_teacher)],
    db: Annotated[SupabaseService, Depends(get_db)],
) -> dict[str, Any]:
    teacher = db.get_teacher_by_user_id(user["id"])
    code_prefix = (body.department[:2].upper() if body.department else "CS") or "CS"
    class_code = f"{code_prefix}{random.randint(1000, 9999)}"

    new_class = {
        "id": f"cls-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        "class_name": body.class_name,
        "class_code": class_code,
        "semester": body.semester,
        "department": body.department,
        "teacher_id": teacher["teacher_id"] if teacher else user["id"],
        "teacher_name": user["full_name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return db.create_class(new_class)


@router.post("/join")
def join_class(
    body: JoinClassRequest,
    user: Annotated[dict[str, Any], Depends(require_student)],
    db: Annotated[SupabaseService, Depends(get_db)],
) -> dict[str, Any]:
    target_class = db.get_class_by_code(body.class_code)
    if not target_class:
        raise HTTPException(status_code=404, detail="Class not found. Please check the class code.")

    student = db.get_student_by_user_id(user["id"])
    if not student:
        raise HTTPException(status_code=400, detail="Student record not found")

    db.enroll_student_in_class(student["student_id"], target_class["id"])
    return {"message": "Successfully joined class", "class": target_class}
