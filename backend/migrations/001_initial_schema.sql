-- KIA Initial Schema for Supabase PostgreSQL
-- Run in Supabase SQL Editor or via migration tooling.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teachers (
    teacher_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT
);

CREATE TABLE IF NOT EXISTS students (
    student_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    class_id TEXT,
    full_name TEXT,
    email TEXT
);

-- ---------------------------------------------------------------------------
-- Academic structure
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    class_name TEXT NOT NULL,
    class_code TEXT NOT NULL UNIQUE,
    semester TEXT NOT NULL,
    department TEXT NOT NULL,
    teacher_id TEXT NOT NULL REFERENCES teachers(teacher_id) ON DELETE CASCADE,
    teacher_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    subject_name TEXT NOT NULL,
    subject_code TEXT NOT NULL,
    class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    class_name TEXT,
    teacher_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enrollments (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, class_id)
);

-- ---------------------------------------------------------------------------
-- Study materials & knowledge
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS study_materials (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    storage_path TEXT NOT NULL,
    processed_path TEXT,
    processing_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (processing_status IN ('pending', 'processing', 'ready', 'failed')),
    total_pages INTEGER,
    total_chunks INTEGER,
    upload_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_bases (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL UNIQUE REFERENCES subjects(id) ON DELETE CASCADE,
    material_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_documents INTEGER NOT NULL DEFAULT 0,
    total_chunks INTEGER NOT NULL DEFAULT 0,
    total_pages INTEGER NOT NULL DEFAULT 0,
    ai_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (ai_status IN ('pending', 'processing', 'ready', 'failed')),
    last_indexed TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    material_id TEXT REFERENCES study_materials(id) ON DELETE CASCADE,
    subject_label TEXT,
    chapter TEXT,
    topic TEXT,
    subtopic TEXT,
    page_number INTEGER NOT NULL DEFAULT 1,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_subject ON knowledge_chunks(subject_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_material ON knowledge_chunks(material_id);

CREATE TABLE IF NOT EXISTS examination_blueprints (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),
    strategy_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Viva lifecycle
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS viva_sessions (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    subject_name TEXT,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'active', 'completed')),
    scheduled_date TIMESTAMPTZ NOT NULL,
    blueprint_id TEXT REFERENCES examination_blueprints(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS viva_attempts (
    id TEXT PRIMARY KEY,
    viva_session_id TEXT NOT NULL REFERENCES viva_sessions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    blueprint_id TEXT REFERENCES examination_blueprints(id) ON DELETE SET NULL,
    persona_id TEXT,
    academic_level TEXT,
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS'
        CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'ABANDONED')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    current_turn_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS conversation_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    attempt_id TEXT NOT NULL REFERENCES viva_attempts(id) ON DELETE CASCADE,
    turn_index INTEGER NOT NULL,
    question TEXT NOT NULL,
    candidate_answer TEXT,
    strategy TEXT,
    topic_tested TEXT,
    difficulty TEXT,
    evaluation JSONB,
    ai_reasoning TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_attempt ON conversation_history(attempt_id);

CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    attempt_id TEXT REFERENCES viva_attempts(id) ON DELETE SET NULL,
    student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    student_name TEXT,
    viva_session_id TEXT NOT NULL REFERENCES viva_sessions(id) ON DELETE CASCADE,
    viva_title TEXT,
    score NUMERIC(5, 2) NOT NULL DEFAULT 0,
    report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Storage bucket (run separately in Supabase dashboard or via API)
-- Bucket name: study-materials (public: false)
-- ---------------------------------------------------------------------------
