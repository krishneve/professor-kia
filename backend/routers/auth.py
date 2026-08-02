from datetime import datetime, timezone
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from dependencies import get_current_user, get_db
from services.supabase_service import SupabaseService
from utils.jwt import create_access_token
from utils.password import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: Literal["teacher", "student"]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/register")
def register(body: RegisterRequest, db: Annotated[SupabaseService, Depends(get_db)]) -> dict[str, Any]:
    if db.find_user_by_email(body.email):
        raise HTTPException(status_code=400, detail="User with this email already exists")

    now = datetime.now(timezone.utc).isoformat()
    user_id = f"usr-{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    user = {
        "id": user_id,
        "full_name": body.full_name,
        "email": body.email,
        "role": body.role,
        "created_at": now,
    }
    password_hash = hash_password(body.password)
    public_user = db.create_user(user, password_hash)

    if body.role == "teacher":
        db.create_teacher(
            {
                "teacher_id": f"tch-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                "user_id": user_id,
                "full_name": body.full_name,
                "email": body.email,
            }
        )
    else:
        db.create_student(
            {
                "student_id": f"std-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                "user_id": user_id,
                "full_name": body.full_name,
                "email": body.email,
            }
        )

    token = create_access_token(
        {"id": public_user["id"], "email": public_user["email"], "role": public_user["role"], "full_name": public_user["full_name"]}
    )
    return {"user": public_user, "token": token}


@router.post("/login")
def login(body: LoginRequest, db: Annotated[SupabaseService, Depends(get_db)]) -> dict[str, Any]:
    user_row = db.find_user_by_email(body.email)
    if not user_row:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    password_hash = user_row.get("password_hash")
    if not password_hash or not verify_password(body.password, password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    public_user = db._public_user(user_row)
    token = create_access_token(
        {"id": public_user["id"], "email": public_user["email"], "role": public_user["role"], "full_name": public_user["full_name"]}
    )
    return {"user": public_user, "token": token}


@router.get("/me")
def me(
    user: Annotated[dict[str, Any], Depends(get_current_user)],
) -> dict[str, Any]:
    return {"user": user}
