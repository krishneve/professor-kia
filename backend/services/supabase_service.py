from functools import lru_cache
from typing import Any, Optional
import json
from datetime import datetime, timezone

from supabase import Client, create_client

from config import get_settings


class SupabaseService:
    def __init__(self, client: Client):
        self.client = client

    def ping(self) -> bool:
        try:
            self.client.table("users").select("id").limit(1).execute()
            return True
        except Exception:
            return False

    # ---- Users ----

    def find_user_by_email(self, email: str) -> dict[str, Any] | None:
        result = (
            self.client.table("users")
            .select("*")
            .ilike("email", email)
            .limit(1)
            .execute()
        )
        rows = result.data or []
        return rows[0] if rows else None

    def find_user_by_id(self, user_id: str) -> dict[str, Any] | None:
        result = self.client.table("users").select("*").eq("id", user_id).limit(1).execute()
        rows = result.data or []
        return rows[0] if rows else None

    def create_user(self, user: dict[str, Any], password_hash: str) -> dict[str, Any]:
        row = {
            "id": user["id"],
            "full_name": user["full_name"],
            "email": user["email"],
            "role": user["role"],
            "password_hash": password_hash,
            "created_at": user.get("created_at"),
        }
        self.client.table("users").insert(row).execute()
        return self._public_user(row)

    def get_user_password_hash(self, user_id: str) -> str | None:
        user = self.find_user_by_id(user_id)
        return user.get("password_hash") if user else None

    @staticmethod
    def _public_user(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row["id"],
            "full_name": row["full_name"],
            "email": row["email"],
            "role": row["role"],
            "created_at": row["created_at"],
        }

    # ---- Teachers / Students ----

    def create_teacher(self, teacher: dict[str, Any]) -> dict[str, Any]:
        self.client.table("teachers").insert(teacher).execute()
        return teacher

    def create_student(self, student: dict[str, Any]) -> dict[str, Any]:
        self.client.table("students").insert(student).execute()
        return student

    def get_teacher_by_user_id(self, user_id: str) -> dict[str, Any] | None:
        result = self.client.table("teachers").select("*").eq("user_id", user_id).limit(1).execute()
        rows = result.data or []
        return rows[0] if rows else None

    def get_student_by_user_id(self, user_id: str) -> dict[str, Any] | None:
        result = self.client.table("students").select("*").eq("user_id", user_id).limit(1).execute()
        rows = result.data or []
        return rows[0] if rows else None

    def get_students_for_class(self, class_id: str) -> list[dict[str, Any]]:
        enrollments = self.get_enrollments_for_class(class_id)
        student_ids = [e["student_id"] for e in enrollments]
        if not student_ids:
            return []
        result = self.client.table("students").select("*").in_("student_id", student_ids).execute()
        return result.data or []

    # ---- Classes ----

    def get_classes(self) -> list[dict[str, Any]]:
        result = self.client.table("classes").select("*").order("created_at").execute()
        classes = result.data or []
        enrollments = self.get_enrollments()
        for cls in classes:
            cls["student_count"] = sum(1 for e in enrollments if e["class_id"] == cls["id"])
        return classes

    def get_class_by_id(self, class_id: str) -> dict[str, Any] | None:
        for cls in self.get_classes():
            if cls["id"] == class_id:
                return cls
        return None

    def get_class_by_code(self, class_code: str) -> dict[str, Any] | None:
        result = (
            self.client.table("classes")
            .select("*")
            .ilike("class_code", class_code.strip())
            .limit(1)
            .execute()
        )
        rows = result.data or []
        if not rows:
            return None
        cls = rows[0]
        enrollments = self.get_enrollments_for_class(cls["id"])
        cls["student_count"] = len(enrollments)
        return cls

    def create_class(self, new_class: dict[str, Any]) -> dict[str, Any]:
        self.client.table("classes").insert(new_class).execute()
        new_class["student_count"] = 0
        return new_class

    # ---- Subjects ----

    def get_subjects(self) -> list[dict[str, Any]]:
        result = self.client.table("subjects").select("*").order("created_at").execute()
        return result.data or []

    def create_subject(self, subject: dict[str, Any]) -> dict[str, Any]:
        self.client.table("subjects").insert(subject).execute()
        return subject

    def update_subject(self, subject_id: str, update: dict[str, Any]) -> dict[str, Any] | None:
        existing = self.client.table("subjects").select("*").eq("id", subject_id).limit(1).execute()
        if not existing.data:
            return None
        merged = {**existing.data[0], **update}
        self.client.table("subjects").update(update).eq("id", subject_id).execute()
        return merged

    def delete_subject(self, subject_id: str) -> None:
        self.client.table("subjects").delete().eq("id", subject_id).execute()

    # ---- Enrollments ----

    def get_enrollments(self) -> list[dict[str, Any]]:
        result = self.client.table("enrollments").select("*").execute()
        return result.data or []

    def get_enrollments_for_class(self, class_id: str) -> list[dict[str, Any]]:
        result = self.client.table("enrollments").select("*").eq("class_id", class_id).execute()
        return result.data or []

    def enroll_student_in_class(self, student_id: str, class_id: str) -> dict[str, Any]:
        existing = (
            self.client.table("enrollments")
            .select("*")
            .eq("student_id", student_id)
            .eq("class_id", class_id)
            .limit(1)
            .execute()
        )
        if existing.data:
            return existing.data[0]

        from datetime import datetime, timezone

        enrollment = {
            "id": f"enr-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
            "student_id": student_id,
            "class_id": class_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self.client.table("enrollments").insert(enrollment).execute()
        self.client.table("students").update({"class_id": class_id}).eq("student_id", student_id).execute()
        return enrollment

    # ---- Viva sessions ----

    def get_viva_sessions(self) -> list[dict[str, Any]]:
        result = self.client.table("viva_sessions").select("*").order("created_at").execute()
        return result.data or []

    def create_viva_session(self, viva: dict[str, Any]) -> dict[str, Any]:
        self.client.table("viva_sessions").insert(viva).execute()
        return viva

    def update_viva_session(self, viva_id: str, update: dict[str, Any]) -> dict[str, Any] | None:
        existing = self.client.table("viva_sessions").select("*").eq("id", viva_id).limit(1).execute()
        if not existing.data:
            return None
        self.client.table("viva_sessions").update(update).eq("id", viva_id).execute()
        return {**existing.data[0], **update}

    def delete_viva_session(self, viva_id: str) -> None:
        self.client.table("viva_sessions").delete().eq("id", viva_id).execute()

    # ---- Reports ----

    def get_reports(self) -> list[dict[str, Any]]:
        result = self.client.table("reports").select("*").order("created_at").execute()
        return result.data or []

    def create_report(self, report: dict[str, Any]) -> dict[str, Any]:
        self.client.table("reports").insert(report).execute()
        return report

    # ---- Knowledge Units / Chunks ----

    def create_chunks(self, subject_id: str, material_id: str, chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Store document chunks in the knowledge_units table"""
        chunk_objects = []
        for chunk in chunks:
            chunk_obj = {
                "id": f"chunk-{int(datetime.now(timezone.utc).timestamp() * 1000)}-{len(chunk_objects)}",
                "subject_id": subject_id,
                "material_id": material_id,
                "document_title": chunk.get("documentTitle", ""),
                "page_number": chunk.get("pageNumber", 1),
                "heading": chunk.get("heading", ""),
                "chunk_content": chunk.get("chunkContent", ""),
                "chunk_index": chunk.get("chunkIndex", 0),
                "metadata": json.dumps(chunk.get("metadata", {})),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            chunk_objects.append(chunk_obj)
        
        if chunk_objects:
            self.client.table("knowledge_units").insert(chunk_objects).execute()
        
        return [self._map_chunk(ch) for ch in chunk_objects]

    def get_chunks_by_subject(self, subject_id: str) -> list[dict[str, Any]]:
        """Retrieve all chunks for a given subject"""
        result = (
            self.client.table("knowledge_units")
            .select("*")
            .eq("subject_id", subject_id)
            .order("chunk_index")
            .execute()
        )
        return [self._map_chunk(row) for row in (result.data or [])]

    def get_chunks_by_material(self, material_id: str) -> list[dict[str, Any]]:
        """Retrieve all chunks for a specific study material"""
        result = (
            self.client.table("knowledge_units")
            .select("*")
            .eq("material_id", material_id)
            .order("chunk_index")
            .execute()
        )
        return [self._map_chunk(row) for row in (result.data or [])]

    def search_chunks_by_keywords(self, subject_id: str, keywords: list[str]) -> list[dict[str, Any]]:
        """Search chunks containing any of the keywords (simple text search)"""
        if not keywords:
            return []
        
        # Supabase simple text search using ilike for each keyword
        all_results = []
        seen_ids = set()
        
        for keyword in keywords:
            result = (
                self.client.table("knowledge_units")
                .select("*")
                .eq("subject_id", subject_id)
                .ilike("chunk_content", f"%{keyword}%")
                .limit(20)
                .execute()
            )
            for row in result.data or []:
                if row["id"] not in seen_ids:
                    seen_ids.add(row["id"])
                    all_results.append(self._map_chunk(row))
        
        return all_results

    # ---- Conversation History ----

    def create_conversation_turn(self, viva_session_id: str, turn_data: dict[str, Any]) -> dict[str, Any]:
        """Store a single turn of viva conversation"""
        turn_obj = {
            "id": f"turn-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
            "viva_session_id": viva_session_id,
            "turn_number": turn_data.get("turnNumber", 0),
            "question": turn_data.get("question", ""),
            "candidate_answer": turn_data.get("candidateAnswer", ""),
            "topic_tested": turn_data.get("topicTested", ""),
            "ai_thinking_reasoning": turn_data.get("aiThinkingReasoning", ""),
            "strategy": turn_data.get("strategy", ""),
            "evaluation": json.dumps(turn_data.get("evaluation", {})),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        
        self.client.table("conversation_history").insert(turn_obj).execute()
        return self._map_conversation_turn(turn_obj)

    def get_conversation_history(self, viva_session_id: str) -> list[dict[str, Any]]:
        """Get all conversation turns for a viva session"""
        result = (
            self.client.table("conversation_history")
            .select("*")
            .eq("viva_session_id", viva_session_id)
            .order("turn_number")
            .execute()
        )
        return [self._map_conversation_turn(row) for row in (result.data or [])]

    # ---- Study materials (Supabase Storage + PostgreSQL) ----

    def get_study_materials(self, subject_id: str) -> list[dict[str, Any]]:
        result = (
            self.client.table("study_materials")
            .select("*")
            .eq("subject_id", subject_id)
            .order("upload_date")
            .execute()
        )
        rows = result.data or []
        return [self._map_study_material(row) for row in rows]

    def get_knowledge_base(self, subject_id: str) -> dict[str, Any]:
        result = (
            self.client.table("knowledge_bases")
            .select("*")
            .eq("subject_id", subject_id)
            .limit(1)
            .execute()
        )
        if result.data:
            return self._map_knowledge_base(result.data[0])

        materials = self.get_study_materials_raw(subject_id)
        return {
            "id": f"kb-{subject_id}",
            "subjectId": subject_id,
            "materialIds": [m["id"] for m in materials],
            "totalDocuments": len(materials),
            "totalChunks": sum(m.get("total_chunks") or 0 for m in materials),
            "totalPages": sum(m.get("total_pages") or 0 for m in materials),
            "aiStatus": "ready" if materials else "pending",
            "lastIndexed": None,
        }

    def get_study_materials_raw(self, subject_id: str) -> list[dict[str, Any]]:
        result = (
            self.client.table("study_materials")
            .select("*")
            .eq("subject_id", subject_id)
            .execute()
        )
        return result.data or []

    def get_blueprints(self, subject_id: str) -> list[dict[str, Any]]:
        result = (
            self.client.table("examination_blueprints")
            .select("*")
            .eq("subject_id", subject_id)
            .order("generated_at")
            .execute()
        )
        return [self._map_blueprint(row) for row in (result.data or [])]

    # ---- Supabase Storage Methods ----

    def upload_file_to_storage(self, bucket_name: str, file_path: str, file_bytes: bytes, 
                              content_type: str = "application/octet-stream") -> dict[str, Any]:
        """Upload a file to Supabase Storage"""
        try:
            result = self.client.storage.from_(bucket_name).upload(
                file_path,
                file_bytes,
                {"content-type": content_type}
            )
            return {"success": True, "path": file_path, "result": result}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def create_study_material_with_storage(self, material_data: dict[str, Any], 
                                          file_bytes: Optional[bytes] = None) -> dict[str, Any]:
        """Create a study material record with file upload to Supabase Storage"""
        # First upload to storage if file_bytes provided
        storage_path = ""
        if file_bytes and material_data.get("fileName"):
            bucket_name = "study-materials"
            file_name = material_data["fileName"]
            storage_path = f"{material_data['subjectId']}/{material_data['id']}/{file_name}"
            
            upload_result = self.upload_file_to_storage(
                bucket_name, storage_path, file_bytes, 
                self._get_content_type(material_data.get("fileType", ""))
            )
            
            if not upload_result["success"]:
                raise RuntimeError(f"Failed to upload to Supabase Storage: {upload_result.get('error')}")
        
        # Create database record
        db_record = {
            "id": material_data["id"],
            "subject_id": material_data["subjectId"],
            "file_name": material_data["fileName"],
            "file_type": material_data["fileType"],
            "file_size": material_data["fileSize"],
            "upload_date": datetime.now(timezone.utc).isoformat(),
            "storage_path": storage_path,
            "processed_path": material_data.get("processedPath", ""),
            "processing_status": material_data.get("processingStatus", "pending"),
            "total_pages": material_data.get("totalPages"),
            "total_chunks": material_data.get("totalChunks"),
        }
        
        self.client.table("study_materials").insert(db_record).execute()
        return self._map_study_material(db_record)

    def update_knowledge_base_stats(self, subject_id: str) -> dict[str, Any]:
        """Update knowledge base statistics based on current study materials and chunks"""
        materials = self.get_study_materials_raw(subject_id)
        total_chunks = 0
        
        # Count chunks from knowledge_units table
        chunks_result = (
            self.client.table("knowledge_units")
            .select("id", count="exact")
            .eq("subject_id", subject_id)
            .execute()
        )
        if hasattr(chunks_result, 'count'):
            total_chunks = chunks_result.count or 0
        
        kb_data = {
            "subject_id": subject_id,
            "material_ids": [m["id"] for m in materials],
            "total_documents": len(materials),
            "total_chunks": total_chunks,
            "total_pages": sum(m.get("total_pages") or 0 for m in materials),
            "ai_status": "ready" if materials else "pending",
            "last_indexed": datetime.now(timezone.utc).isoformat(),
        }
        
        # Check if KB exists
        existing = self.client.table("knowledge_bases").select("*").eq("subject_id", subject_id).execute()
        if existing.data:
            self.client.table("knowledge_bases").update(kb_data).eq("subject_id", subject_id).execute()
            kb_data["id"] = existing.data[0]["id"]
        else:
            kb_data["id"] = f"kb-{subject_id}"
            self.client.table("knowledge_bases").insert(kb_data).execute()
        
        return self._map_knowledge_base(kb_data)

    @staticmethod
    def _get_content_type(file_type: str) -> str:
        """Map file extension to content type"""
        file_type_lower = file_type.lower()
        if file_type_lower in ["pdf"]:
            return "application/pdf"
        elif file_type_lower in ["docx"]:
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif file_type_lower in ["pptx"]:
            return "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        elif file_type_lower in ["txt"]:
            return "text/plain"
        else:
            return "application/octet-stream"

    # ---- Mapping Methods ----

    @staticmethod
    def _map_chunk(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row["id"],
            "subjectId": row["subject_id"],
            "materialId": row["material_id"],
            "documentTitle": row["document_title"],
            "pageNumber": row["page_number"],
            "heading": row["heading"],
            "chunkContent": row["chunk_content"],
            "chunkIndex": row["chunk_index"],
            "metadata": json.loads(row.get("metadata", "{}")),
            "createdAt": row["created_at"],
        }

    @staticmethod
    def _map_conversation_turn(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row["id"],
            "vivaSessionId": row["viva_session_id"],
            "turnNumber": row["turn_number"],
            "question": row["question"],
            "candidateAnswer": row["candidate_answer"],
            "topicTested": row["topic_tested"],
            "aiThinkingReasoning": row["ai_thinking_reasoning"],
            "strategy": row["strategy"],
            "evaluation": json.loads(row.get("evaluation", "{}")),
            "timestamp": row["timestamp"],
        }

    @staticmethod
    def _map_study_material(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row["id"],
            "subjectId": row["subject_id"],
            "fileName": row["file_name"],
            "fileType": row["file_type"],
            "fileSize": row["file_size"],
            "uploadDate": row["upload_date"],
            "storagePath": row["storage_path"],
            "processedPath": row.get("processed_path") or "",
            "processingStatus": row["processing_status"],
            "totalPages": row.get("total_pages"),
            "totalChunks": row.get("total_chunks"),
        }

    @staticmethod
    def _map_knowledge_base(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row["id"],
            "subjectId": row["subject_id"],
            "materialIds": row.get("material_ids") or [],
            "totalDocuments": row.get("total_documents", 0),
            "totalChunks": row.get("total_chunks", 0),
            "totalPages": row.get("total_pages", 0),
            "aiStatus": row.get("ai_status", "pending"),
            "lastIndexed": row.get("last_indexed"),
        }

    @staticmethod
    def _map_blueprint(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row["id"],
            "subjectId": row["subject_id"],
            "title": row["title"],
            "generatedAt": row["generated_at"],
            "status": row["status"],
            "strategyData": row.get("strategy_data") or {},
        }


@lru_cache
def get_supabase_service() -> SupabaseService:
    settings = get_settings()
    if not settings.supabase_configured:
        raise RuntimeError(
            "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
        )
    client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return SupabaseService(client)


@lru_cache
def get_supabase_client_anon() -> Client:
    """Get a Supabase client using the anonymous key for frontend operations"""
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise RuntimeError(
            "Supabase anonymous client not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY."
        )
    return create_client(settings.supabase_url, settings.supabase_anon_key)
