-- KIA AI Pipeline Tables — Supabase Migration
-- These are the only tables the AI viva pipeline reads/writes.
-- No FK constraints to users/classes/subjects — those are managed by the local JSON DB.
-- Run this in the Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Study Materials
-- Stores metadata about uploaded documents per subject.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS study_materials (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    storage_path TEXT NOT NULL DEFAULT '',
    processed_path TEXT DEFAULT '',
    processing_status TEXT NOT NULL DEFAULT 'ready',
    total_pages INTEGER,
    total_chunks INTEGER,
    upload_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_materials_subject ON study_materials(subject_id);

-- ---------------------------------------------------------------------------
-- Knowledge Chunks
-- The actual extracted text units from uploaded documents.
-- This is what Gemma reads to generate grounded viva questions.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    subject_id TEXT NOT NULL,
    material_id TEXT,
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

-- ---------------------------------------------------------------------------
-- Knowledge Bases
-- Aggregate stats per subject (total docs, chunks, pages, AI status).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS knowledge_bases (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL UNIQUE,
    material_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_documents INTEGER NOT NULL DEFAULT 0,
    total_chunks INTEGER NOT NULL DEFAULT 0,
    total_pages INTEGER NOT NULL DEFAULT 0,
    ai_status TEXT NOT NULL DEFAULT 'ready',
    last_indexed TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Storage bucket
-- Create manually in Supabase Dashboard → Storage → New Bucket
-- Name: study-materials
-- Public: false
-- ---------------------------------------------------------------------------
