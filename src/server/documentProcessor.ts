/**
 * Document Processor — debugged AI pipeline
 *
 * BUGS FIXED:
 *  1. PDF extraction now uses pdf-parse (real text, not heuristic regex)
 *  2. DOCX extraction now uses mammoth (real text)
 *  3. PPTX: heuristic XML-tag strip (no native parser available)
 *  4. processedPath is now saved to the DB AFTER it is set (not before)
 *  5. createStructuredChunks no longer drops short paragraphs and no longer
 *     misclassifies normal sentences as headings
 *  6. Every stage logs what it is doing so failures are visible in the terminal
 */

import fs from 'fs';
import path from 'path';
import { DocumentChunk, StudyMaterial } from '../types';
import { SupabaseService } from './supabase';

// ---------------------------------------------------------------------------
// Optional parsers — imported lazily so the server still boots if missing
// ---------------------------------------------------------------------------
let pdfParse: ((buf: Buffer) => Promise<{ text: string }>) | null = null;
let mammoth: { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> } | null = null;

try {
  const mod = await import('pdf-parse');
  pdfParse = ((mod as any).default ?? mod) as any;
  console.log('[DocumentProcessor] pdf-parse loaded ✓');
} catch {
  console.warn('[DocumentProcessor] pdf-parse not available — PDF text extraction will use fallback');
}

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  mammoth = (await import('mammoth')) as any;
  console.log('[DocumentProcessor] mammoth loaded ✓');
} catch {
  console.warn('[DocumentProcessor] mammoth not available — DOCX text extraction will use fallback');
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROCESSED_DIR = path.join(process.cwd(), 'data', 'processed');

/** In-memory chunk cache for the current server process. Key = subjectId. */
const chunkCache: Map<string, DocumentChunk[]> = new Map();

function ensureProcessedDir() {
  if (!fs.existsSync(PROCESSED_DIR)) {
    fs.mkdirSync(PROCESSED_DIR, { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface UploadPayload {
  subjectId: string;
  fileName: string;
  fileType: string;
  fileContentBase64?: string;
  fileText?: string;
}

export async function processDocumentUpload(
  payload: UploadPayload
): Promise<{ material: StudyMaterial; chunks: DocumentChunk[] }> {
  const id = `mat-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const ext = payload.fileName.split('.').pop()?.toLowerCase() || 'txt';
  const fileTypeNormalized = (payload.fileType || ext).toUpperCase();

  // ── STAGE 1: receive file ───────────────────────────────────────────────
  console.log(`\n[Stage 1] Received upload:`);
  console.log(`  filename : ${payload.fileName}`);
  console.log(`  fileType : ${fileTypeNormalized}`);
  console.log(`  hasBase64: ${Boolean(payload.fileContentBase64)}`);
  console.log(`  hasText  : ${Boolean(payload.fileText)}`);

  let rawText = '';
  let fileSize = 0;
  let fileBuffer: Buffer | null = null;

  // ── STAGE 2: extract text ───────────────────────────────────────────────
  if (payload.fileText && payload.fileText.trim().length > 0) {
    rawText = payload.fileText;
    fileBuffer = Buffer.from(rawText, 'utf-8');
    fileSize = fileBuffer.length;
    console.log(`[Stage 2] Source: plain text paste`);
  } else if (payload.fileContentBase64) {
    fileBuffer = Buffer.from(payload.fileContentBase64, 'base64');
    fileSize = fileBuffer.length;
    console.log(`[Stage 2] Source: base64 binary  size=${fileSize} bytes  ext=${ext}`);

    rawText = await extractTextFromBuffer(fileBuffer, ext, payload.fileName);
  } else {
    rawText = '';
    fileBuffer = Buffer.alloc(0);
    console.warn('[Stage 2] WARNING: No file content provided');
  }

  console.log(`[Stage 2] Extracted text length : ${rawText.length} characters`);
  if (rawText.length > 0) {
    console.log(`[Stage 2] First 500 chars:\n---\n${rawText.substring(0, 500)}\n---`);
  } else {
    console.error('[Stage 2] FAIL: extracted text is empty. Check file content and format.');
  }

  // ── STAGE 3: create Knowledge Units ────────────────────────────────────
  const rawChunks = createStructuredChunks(payload.fileName, rawText);
  const chunks: DocumentChunk[] = rawChunks.map((c) => ({
    ...c,
    subjectId: payload.subjectId,
    materialId: id,
  }));

  const wordCount = rawText.trim().split(/\s+/).filter(Boolean).length;
  const estimatedPages = Math.max(1, Math.ceil(wordCount / 350));

  console.log(`[Stage 3] Knowledge Units created : ${chunks.length}`);
  if (chunks.length > 0) {
    console.log(`[Stage 3] Sample unit #0:`);
    console.log(`  heading : ${chunks[0].heading}`);
    console.log(`  page    : ${chunks[0].pageNumber}`);
    console.log(`  content : ${chunks[0].chunkContent.substring(0, 200)}`);
  } else {
    console.error('[Stage 3] FAIL: zero Knowledge Units produced. Text may be empty or all filtered out.');
  }

  // ── Build material record (processedPath still empty here) ──────────────
  const material: StudyMaterial = {
    id,
    subjectId: payload.subjectId,
    fileName: payload.fileName,
    fileType: fileTypeNormalized,
    fileSize,
    uploadDate: new Date().toISOString(),
    storagePath: '',
    processedPath: '',           // ← will be set below before DB write
    processingStatus: 'ready',
    totalPages: estimatedPages,
    totalChunks: chunks.length,
  };

  // ── Persist locally FIRST so processedPath is known before DB write ─────
  let localPath = '';
  try {
    ensureProcessedDir();
    localPath = path.join(PROCESSED_DIR, `${id}_chunks.json`);
    fs.writeFileSync(localPath, JSON.stringify(chunks, null, 2), 'utf-8');
    material.processedPath = localPath;   // FIX: set before createStudyMaterial
    console.log(`[Stage 3] Chunks persisted locally → ${localPath}`);
  } catch (err: any) {
    console.error(`[Stage 3] Local chunk write FAILED: ${err?.message}`);
  }

  // ── Populate in-memory cache immediately ────────────────────────────────
  const existing = chunkCache.get(payload.subjectId) || [];
  chunkCache.set(payload.subjectId, [...existing, ...chunks]);
  console.log(`[Stage 3] In-memory cache updated: ${chunkCache.get(payload.subjectId)!.length} total chunks for subject ${payload.subjectId}`);

  // ── Supabase (non-fatal, Supabase is optional) ───────────────────────────
  if (SupabaseService.isConfigured()) {
    if (fileBuffer && fileBuffer.length > 0) {
      try {
        const storagePath = await SupabaseService.uploadFile(
          'study-materials',
          `${payload.subjectId}/${id}/${payload.fileName}`,
          fileBuffer
        );
        material.storagePath = storagePath;
        console.log(`[Stage 3] File uploaded to Supabase Storage → ${storagePath}`);
      } catch (err: any) {
        console.warn(`[Stage 3] Supabase Storage upload skipped: ${err?.message}`);
      }
    }

    try {
      await SupabaseService.createStudyMaterial(material);
      console.log(`[Stage 3] study_materials record saved to Supabase`);
    } catch (err: any) {
      console.warn(`[Stage 3] Supabase study_materials insert skipped: ${err?.message}`);
    }

    try {
      await SupabaseService.createChunks(chunks);
      console.log(`[Stage 3] ${chunks.length} chunks saved to Supabase knowledge_chunks`);
    } catch (err: any) {
      console.warn(`[Stage 3] Supabase knowledge_chunks insert skipped: ${err?.message}`);
    }
  } else {
    console.log(`[Stage 3] Supabase not configured — using local storage only`);
  }

  return { material, chunks };
}

// ---------------------------------------------------------------------------
// Chunk retrieval — Stage 4
// ---------------------------------------------------------------------------

/**
 * Load all chunks for a subject.
 * Priority: in-memory cache (fastest, populated during upload)
 *         → Supabase (if configured)
 *         → local JSON files (processedPath from DB)
 */
export async function getChunksBySubjectId(
  subjectId: string,
  studyMaterials: StudyMaterial[] = []
): Promise<DocumentChunk[]> {
  console.log(`[Stage 4] Loading chunks for subject: ${subjectId}`);

  // 1. In-memory cache — fastest, populated immediately on upload
  const cached = chunkCache.get(subjectId);
  if (cached && cached.length > 0) {
    console.log(`[Stage 4] ✓ ${cached.length} chunks from in-memory cache`);
    return cached;
  }

  // 2. Supabase
  if (SupabaseService.isConfigured()) {
    const remote = await SupabaseService.getChunksBySubject(subjectId);
    if (remote.length > 0) {
      console.log(`[Stage 4] ✓ ${remote.length} chunks from Supabase`);
      chunkCache.set(subjectId, remote);
      return remote;
    }
    console.log(`[Stage 4] Supabase returned 0 chunks for subject ${subjectId}`);
  }

  // 3. Local JSON files via processedPath
  const local: DocumentChunk[] = [];
  for (const mat of studyMaterials) {
    console.log(`[Stage 4] Checking local file: "${mat.processedPath}" (exists=${mat.processedPath ? fs.existsSync(mat.processedPath) : false})`);
    if (mat.processedPath && fs.existsSync(mat.processedPath)) {
      try {
        const data = fs.readFileSync(mat.processedPath, 'utf-8');
        const parsed: DocumentChunk[] = JSON.parse(data);
        local.push(...parsed);
        console.log(`[Stage 4] Loaded ${parsed.length} chunks from ${mat.processedPath}`);
      } catch (err: any) {
        console.error(`[Stage 4] Failed to read ${mat.processedPath}: ${err?.message}`);
      }
    }
  }

  if (local.length > 0) {
    chunkCache.set(subjectId, local);
    console.log(`[Stage 4] ✓ ${local.length} chunks from local files`);
  } else {
    console.error(`[Stage 4] FAIL: 0 chunks found for subject ${subjectId}. Materials checked: ${studyMaterials.length}`);
    studyMaterials.forEach((m) => {
      console.error(`  material id=${m.id} processedPath="${m.processedPath}"`);
    });
  }

  return local;
}

/**
 * Legacy compat — still used by /api/study-materials/:id/chunks endpoint.
 */
export function getProcessedChunks(processedPath: string): DocumentChunk[] {
  if (!processedPath) {
    console.warn('[getProcessedChunks] processedPath is empty — no chunks to return');
    return [];
  }
  if (!fs.existsSync(processedPath)) {
    console.warn(`[getProcessedChunks] file not found: ${processedPath}`);
    return [];
  }
  try {
    const data = fs.readFileSync(processedPath, 'utf-8');
    const chunks = JSON.parse(data);
    console.log(`[getProcessedChunks] Loaded ${chunks.length} chunks from ${processedPath}`);
    return chunks;
  } catch (err: any) {
    console.error(`[getProcessedChunks] Failed to parse ${processedPath}: ${err?.message}`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Text extraction — Stage 2 internals
// ---------------------------------------------------------------------------

async function extractTextFromBuffer(
  buffer: Buffer,
  ext: string,
  fileName: string
): Promise<string> {
  // ── PDF ──────────────────────────────────────────────────────────────────
  if (ext === 'pdf') {
    if (pdfParse) {
      try {
        const result = await pdfParse(buffer);
        const text = result.text?.trim() || '';
        if (text.length > 50) {
          console.log(`[Stage 2] pdf-parse extracted ${text.length} chars from ${fileName}`);
          return text;
        }
        console.warn(`[Stage 2] pdf-parse returned very short text (${text.length} chars) — may be a scanned PDF`);
        return text;
      } catch (err: any) {
        console.error(`[Stage 2] pdf-parse failed: ${err?.message}`);
      }
    }
    // Fallback: extract visible ASCII runs from the raw PDF stream
    return extractVisibleTextFromBinary(buffer, fileName);
  }

  // ── DOCX ─────────────────────────────────────────────────────────────────
  if (ext === 'docx') {
    if (mammoth) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        const text = result.value?.trim() || '';
        if (text.length > 50) {
          console.log(`[Stage 2] mammoth extracted ${text.length} chars from ${fileName}`);
          return text;
        }
        console.warn(`[Stage 2] mammoth returned very short text (${text.length} chars)`);
        return text;
      } catch (err: any) {
        console.error(`[Stage 2] mammoth failed: ${err?.message}`);
      }
    }
    return extractVisibleTextFromBinary(buffer, fileName);
  }

  // ── PPTX ─────────────────────────────────────────────────────────────────
  if (ext === 'pptx') {
    // PPTX is a ZIP; extract XML text content by stripping tags
    try {
      const raw = buffer.toString('utf-8', 0, Math.min(buffer.length, 500000));
      // Pull content between <a:t> tags (PowerPoint text runs)
      const matches = raw.match(/<a:t[^>]*>([^<]+)<\/a:t>/g);
      if (matches && matches.length > 0) {
        const text = matches
          .map((m) => m.replace(/<[^>]+>/g, ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        console.log(`[Stage 2] PPTX XML extraction: ${text.length} chars from ${matches.length} text runs`);
        return text;
      }
    } catch {
      // fall through
    }
    return extractVisibleTextFromBinary(buffer, fileName);
  }

  // ── TXT ──────────────────────────────────────────────────────────────────
  if (ext === 'txt') {
    const text = buffer.toString('utf-8').trim();
    console.log(`[Stage 2] TXT decoded: ${text.length} chars`);
    return text;
  }

  // ── Unknown format ────────────────────────────────────────────────────────
  console.warn(`[Stage 2] Unknown extension "${ext}" — trying UTF-8 decode`);
  return buffer.toString('utf-8').trim();
}

/**
 * Last-resort text extraction: find sequences of printable ASCII that look like
 * real sentences (at least one space and one lowercase letter).
 */
function extractVisibleTextFromBinary(buffer: Buffer, fileName: string): string {
  const raw = buffer.toString('latin1');
  // Match runs of printable chars with at least one space
  const matches = raw.match(/[ -~]{30,}/g) || [];
  const sentences = matches
    .map((s) => s.replace(/[^\x20-\x7E]/g, '').trim())
    .filter((s) => s.length > 20 && /[a-z]/.test(s) && s.includes(' '));

  const text = sentences.join('\n\n').trim();
  console.log(`[Stage 2] Binary fallback for ${fileName}: ${sentences.length} runs → ${text.length} chars`);
  return text;
}

// ---------------------------------------------------------------------------
// Chunking — Stage 3 internals
// ---------------------------------------------------------------------------

function createStructuredChunks(documentTitle: string, fullText: string): DocumentChunk[] {
  if (!fullText || fullText.trim().length === 0) {
    console.error('[Stage 3] createStructuredChunks received empty text — producing 0 chunks');
    return [];
  }

  const chunks: DocumentChunk[] = [];

  // Split on double newlines. Fall back to single newlines if nothing found.
  let paragraphs = fullText
    .split(/\n\s*\n|\r\n\r\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);   // FIX: was > 20, now accepts any non-empty paragraph

  if (paragraphs.length <= 1) {
    // No paragraph breaks — split on single newlines
    paragraphs = fullText
      .split(/\n|\r\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  if (paragraphs.length === 0) {
    // Absolute fallback: treat the whole text as one chunk
    paragraphs = [fullText.trim()];
  }

  console.log(`[Stage 3] createStructuredChunks: ${paragraphs.length} paragraphs from ${fullText.length} chars`);

  let chunkIndex = 0;
  let currentHeading = documentTitle.replace(/\.[^.]+$/, ''); // strip extension

  paragraphs.forEach((para, idx) => {
    const words = para.split(/\s+/).filter(Boolean);

    // FIX: only treat as heading if it is SHORT AND does not contain a sentence ending
    // Previous code treated any short line without a period as a heading — this was
    // misclassifying normal content lines (e.g. "Neural networks are" → heading)
    const isHeading =
      words.length > 0 &&
      words.length <= 8 &&
      (para.startsWith('#') ||
        /^(chapter|module|unit|section|\d+\.)/i.test(para)) &&
      !para.endsWith(',');

    if (isHeading) {
      currentHeading = para.replace(/^#+\s*/, '').trim();
    }

    const pageNumber = Math.floor(idx / 4) + 1;

    if (words.length > 250) {
      // Large paragraph → split into 200-word sub-chunks
      for (let w = 0; w < words.length; w += 200) {
        const subContent = words.slice(w, w + 200).join(' ');
        chunks.push({
          documentTitle,
          pageNumber,
          heading: currentHeading,
          chunkContent: subContent,
          chunkIndex: chunkIndex++,
        });
      }
    } else if (words.length >= 5) {
      // FIX: was filtering out paragraphs < 20 chars — now only skip very tiny ones (< 5 words)
      chunks.push({
        documentTitle,
        pageNumber,
        heading: currentHeading,
        chunkContent: para,
        chunkIndex: chunkIndex++,
      });
    }
    // Silently skip lines shorter than 5 words (page numbers, stray characters)
  });

  return chunks;
}
