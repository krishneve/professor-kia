/**
 * Supabase integration for KIA.
 *
 * - Uses the ANON key for the client-facing singleton (read-only safe operations).
 * - Uses the SERVICE_ROLE key for the server-side SupabaseService (trusted writes).
 * - All calls are wrapped in try/catch — if Supabase is not configured the
 *   callers fall back to the local JSON DB without crashing.
 *
 * Table names match backend/migrations/001_initial_schema.sql exactly.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DocumentChunk, StudyMaterial, KnowledgeBase } from '../types';

// ---------------------------------------------------------------------------
// Client factory — returns null when env vars are absent (graceful no-op mode)
// ---------------------------------------------------------------------------

function makeClient(key: string): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || '';
  if (!url || !key || url.includes('your-project-url')) {
    return null;
  }
  try {
    return createClient(url, key);
  } catch {
    return null;
  }
}

/**
 * Anonymous-key client (used on the browser / frontend path).
 * Exposed for direct Supabase operations from React components if needed.
 */
export const supabase: SupabaseClient | null = makeClient(
  process.env.SUPABASE_ANON_KEY || ''
);

/**
 * Service-role client (backend only — never send this key to the browser).
 */
const serviceClient: SupabaseClient | null = makeClient(
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

function getClient(): SupabaseClient | null {
  return serviceClient || supabase;
}

// ---------------------------------------------------------------------------
// SupabaseService — all methods are async and never throw (return empty/null)
// ---------------------------------------------------------------------------

export class SupabaseService {

  // ---- Storage ----

  static async uploadFile(
    bucket: string,
    filePath: string,
    file: Buffer | Uint8Array
  ): Promise<string> {
    const client = getClient();
    if (!client) throw new Error('Supabase not configured');

    const { error } = await client.storage.from(bucket).upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });
    if (error) throw new Error(error.message);

    const { data } = client.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  }

  // ---- Study Materials ----

  static async createStudyMaterial(material: StudyMaterial): Promise<StudyMaterial> {
    const client = getClient();
    if (!client) throw new Error('Supabase not configured');

    const { data, error } = await client
      .from('study_materials')
      .insert({
        id: material.id,
        subject_id: material.subjectId,
        file_name: material.fileName,
        file_type: material.fileType,
        file_size: material.fileSize,
        upload_date: material.uploadDate,
        storage_path: material.storagePath || '',
        processed_path: material.processedPath || '',
        processing_status: material.processingStatus,
        total_pages: material.totalPages ?? null,
        total_chunks: material.totalChunks ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapStudyMaterial(data);
  }

  static async getStudyMaterials(subjectId?: string): Promise<StudyMaterial[]> {
    const client = getClient();
    if (!client) return [];

    try {
      let q = client
        .from('study_materials')
        .select('*')
        .order('upload_date', { ascending: false });

      if (subjectId) q = q.eq('subject_id', subjectId);

      const { data, error } = await q;
      if (error) return [];
      return (data || []).map(mapStudyMaterial);
    } catch {
      return [];
    }
  }

  // ---- Knowledge Chunks (table: knowledge_chunks per migration SQL) ----

  static async createChunks(chunks: DocumentChunk[]): Promise<void> {
    const client = getClient();
    if (!client || !chunks.length) return;

    try {
      // Insert in batches of 100 to stay within Supabase row limits
      const BATCH = 100;
      const ts = Date.now();
      for (let i = 0; i < chunks.length; i += BATCH) {
        const batch = chunks.slice(i, i + BATCH).map((c, idx) => ({
          id: `chunk-${ts}-${i + idx}`,
          subject_id: c.subjectId || '',
          material_id: c.materialId || null,
          chapter: c.heading || '',
          topic: c.heading || '',
          content: c.chunkContent,
          page_number: c.pageNumber || 1,
          chunk_index: c.chunkIndex ?? (i + idx),
        }));

        const { error } = await client.from('knowledge_chunks').insert(batch);
        if (error) {
          console.error('Supabase chunk insert error:', error.message);
        }
      }
    } catch (err: any) {
      console.error('createChunks failed:', err?.message);
    }
  }

  static async getChunksBySubject(subjectId: string): Promise<DocumentChunk[]> {
    const client = getClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('knowledge_chunks')
        .select('*')
        .eq('subject_id', subjectId)
        .order('chunk_index');

      if (error) return [];

      return (data || []).map((row: any): DocumentChunk => ({
        documentTitle: row.subject_label || row.chapter || row.topic || 'Document',
        pageNumber: row.page_number ?? 1,
        heading: row.chapter || row.topic || '',
        chunkContent: row.content || '',
        chunkIndex: row.chunk_index ?? 0,
        subjectId: row.subject_id,
        materialId: row.material_id,
      }));
    } catch {
      return [];
    }
  }

  // ---- Conversation History ----

  static async createConversationTurn(turn: {
    vivaAttemptId: string;
    turnIndex: number;
    question: string;
    candidateAnswer?: string;
    strategy?: string;
    topicTested?: string;
    evaluation?: object;
    aiReasoning?: string;
  }): Promise<void> {
    const client = getClient();
    if (!client) return;

    try {
      const { error } = await client.from('conversation_history').insert({
        attempt_id: turn.vivaAttemptId,
        turn_index: turn.turnIndex,
        question: turn.question,
        candidate_answer: turn.candidateAnswer || '',
        strategy: turn.strategy || '',
        topic_tested: turn.topicTested || '',
        evaluation: turn.evaluation ? JSON.stringify(turn.evaluation) : null,
        ai_reasoning: turn.aiReasoning || '',
      });
      if (error) console.error('createConversationTurn:', error.message);
    } catch (err: any) {
      console.error('createConversationTurn failed:', err?.message);
    }
  }

  // ---- Faculty Reports ----

  static async createReport(report: {
    id: string;
    studentId: string;
    studentName?: string;
    vivaSessionId: string;
    vivaTitle?: string;
    score: number;
    reportJson: object;
  }): Promise<void> {
    const client = getClient();
    if (!client) return;

    try {
      const { error } = await client.from('reports').insert({
        id: report.id,
        student_id: report.studentId,
        student_name: report.studentName || '',
        viva_session_id: report.vivaSessionId,
        viva_title: report.vivaTitle || '',
        score: report.score,
        report_json: report.reportJson,
      });
      if (error) console.error('createReport:', error.message);
    } catch (err: any) {
      console.error('createReport failed:', err?.message);
    }
  }

  // ---- Knowledge Base Stats ----

  static async getKnowledgeBase(subjectId: string): Promise<KnowledgeBase | null> {
    const client = getClient();
    if (!client) return null;

    try {
      const { data } = await client
        .from('knowledge_bases')
        .select('*')
        .eq('subject_id', subjectId)
        .single();

      if (!data) return null;

      return {
        id: data.id,
        subjectId: data.subject_id,
        materialIds: data.material_ids || [],
        totalDocuments: data.total_documents || 0,
        totalChunks: data.total_chunks || 0,
        totalPages: data.total_pages || 0,
        aiStatus: data.ai_status || 'pending',
        lastIndexed: data.last_indexed,
      };
    } catch {
      return null;
    }
  }

  static isConfigured(): boolean {
    return getClient() !== null;
  }
}

// ---------------------------------------------------------------------------
// Private mappers
// ---------------------------------------------------------------------------

function mapStudyMaterial(row: any): StudyMaterial {
  return {
    id: row.id,
    subjectId: row.subject_id,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    uploadDate: row.upload_date,
    storagePath: row.storage_path || '',
    processedPath: row.processed_path || '',
    processingStatus: row.processing_status,
    totalPages: row.total_pages ?? undefined,
    totalChunks: row.total_chunks ?? undefined,
  };
}
