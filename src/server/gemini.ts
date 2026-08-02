/**
 * gemini.ts — AI inference layer for KIA
 *
 * Primary: OpenRouter → google/gemini-2.0-flash-exp:free
 * Fallback: Google Gemini direct (GEMINI_API_KEY) if OpenRouter fails
 *
 * OpenRouter is called first — it's faster and the Gemini free tier has
 * zero quota which wastes ~3s before erroring. If OpenRouter fails for
 * any reason, the direct Gemini SDK is tried as backup.
 */

import { GoogleGenAI } from '@google/genai';
import {
  SyllabusData,
  VivaTurn,
  EvaluationReport,
  ExaminerPersona,
  DocumentChunk,
} from '../types';

// ---------------------------------------------------------------------------
// Model config
// ---------------------------------------------------------------------------

const OPENROUTER_URL    = 'https://openrouter.ai/api/v1/chat/completions';
// Confirmed working on this OpenRouter free-tier account
const OPENROUTER_MODEL  = 'google/gemma-3-27b-it';
const OPENROUTER_MODEL2 = 'google/gemma-4-27b-it:free';   // try as second option
const GEMINI_MODEL      = 'gemini-2.0-flash';

// ---------------------------------------------------------------------------
// Core AI dispatcher — OpenRouter first, Gemini SDK fallback
// ---------------------------------------------------------------------------

async function callAI(prompt: string, label: string): Promise<any> {
  const orKey     = process.env.OPENROUTER_API_KEY || '';
  const geminiKey = process.env.GEMINI_API_KEY     || '';

  if (!orKey) {
    throw new Error('OPENROUTER_API_KEY is not set in .env');
  }

  // Try each OpenRouter model in order, stop on first success
  const modelsToTry = [OPENROUTER_MODEL, OPENROUTER_MODEL2];

  for (const model of modelsToTry) {
    console.log(`[AI/${label}] → OpenRouter (${model})`);
    try {
      const t0  = Date.now();
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${orKey}`,
          'Content-Type':  'application/json',
          'HTTP-Referer':  'https://kia.edu',
          'X-Title':       'KIA Knowledge Intelligence Assessor',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role:    'system',
              content: 'You are an expert academic AI assistant. Respond with valid JSON only. No markdown fences, no explanation — just the raw JSON object.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.4,
          max_tokens:  4096,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`HTTP ${res.status}: ${err.substring(0, 300)}`);
      }

      const json = await res.json();
      const raw  = json.choices?.[0]?.message?.content || '';
      if (!raw.trim()) throw new Error('Empty content in response');

      const ms = Date.now() - t0;
      console.log(`[AI/${label}] ✓ ${model} responded in ${ms}ms (${raw.length} chars)`);

      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();
      return JSON.parse(cleaned);

    } catch (err: any) {
      console.warn(`[AI/${label}] ${model} failed: ${err?.message}`);
      // continue to next model
    }
  }

  // ── Last resort: Gemini SDK direct (only if OpenRouter completely fails) ──
  if (geminiKey && !geminiKey.startsWith('MY_')) {
    console.log(`[AI/${label}] → Gemini SDK fallback (${GEMINI_MODEL})`);
    try {
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
      const res  = await ai.models.generateContent({
        model:    GEMINI_MODEL,
        contents: prompt,
        config:   { responseMimeType: 'application/json' },
      });
      const text = res.text || '';
      if (!text.trim()) throw new Error('Gemini SDK returned empty response');
      console.log(`[AI/${label}] ✓ Gemini SDK responded (${text.length} chars)`);
      return JSON.parse(text);
    } catch (err: any) {
      console.warn(`[AI/${label}] Gemini SDK failed: ${err?.message}`);
    }
  }

  throw new Error(`All AI providers failed for ${label}. Check API keys and quotas.`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function selectRelevantChunks(
  chunks: DocumentChunk[],
  contextHint: string,
  limit = 6
): string {
  if (!chunks || chunks.length === 0) return '';
  const hint = contextHint.toLowerCase();
  const hintWords = new Set(hint.split(/\W+/).filter((w) => w.length > 3));

  const scored = chunks.map((c) => {
    const text = `${c.heading} ${c.chunkContent}`.toLowerCase();
    let score = 0;
    hintWords.forEach((w) => { if (text.includes(w)) score++; });
    return { chunk: c, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored
    .slice(0, limit)
    .map(({ chunk }) => `[${chunk.heading} | p.${chunk.pageNumber}]\n${chunk.chunkContent.substring(0, 400)}`)
    .join('\n\n---\n\n');
}

function buildTopicMap(chunks: DocumentChunk[]): Record<string, string> {
  const map: Record<string, string[]> = {};
  chunks.forEach((c) => {
    const h = c.heading || 'General';
    if (!map[h]) map[h] = [];
    if (map[h].join(' ').length < 600) map[h].push(c.chunkContent.substring(0, 150));
  });
  const result: Record<string, string> = {};
  Object.entries(map).forEach(([k, v]) => { result[k] = v.join(' ').substring(0, 600); });
  return result;
}

// Kept for TTS route in server.ts
export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is missing.');
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

// ---------------------------------------------------------------------------
// analyzeSyllabusText
// ---------------------------------------------------------------------------

export async function analyzeSyllabusText(
  title: string,
  code: string,
  domain: string,
  rawText: string
): Promise<SyllabusData> {
  const prompt = `You are an expert academic curriculum designer and university examiner.
Analyze the following course material and extract a structured examination knowledge base for oral viva evaluations.
Every concept and misconception you identify MUST come directly from the material below — do not invent generic topics.

Course Title: ${title}
Course Code: ${code}
Academic Domain: ${domain}

Raw Study Material:
"""
${rawText.substring(0, 8000)}
"""

Return a clean JSON object following this schema strictly:
{
  "description": "2-sentence summary of the main examination focus areas found in this material",
  "cognitiveDistribution": { "remembering": 15, "understanding": 25, "applying": 30, "analyzing": 20, "evaluating": 10 },
  "concepts": [
    { "id": "c1", "title": "Exact concept name from the material", "category": "Section heading", "taxonomyLevel": "Understanding", "importance": "Core", "description": "What a student must understand" }
  ],
  "misconceptions": [
    { "id": "m1", "concept": "Concept from the material", "flawedBelief": "Common student misunderstanding", "correctUnderstanding": "Correct understanding from the notes", "probingQuestion": "Viva question to expose this misconception" }
  ],
  "suggestedQuestions": ["3-5 challenging viva questions grounded only in the uploaded material"]
}`;

  const parsed = await callAI(prompt, 'analyzeSyllabus');

  return {
    id: `syllabus-${Date.now()}`,
    title: title || 'Uploaded Course',
    code: code || 'COURSE-101',
    domain: domain || 'Academic',
    description: parsed.description || 'Course material analyzed for AI viva examination.',
    rawText,
    cognitiveDistribution: parsed.cognitiveDistribution || {
      remembering: 15, understanding: 25, applying: 30, analyzing: 20, evaluating: 10,
    },
    concepts: parsed.concepts || [],
    misconceptions: parsed.misconceptions || [],
    suggestedQuestions: parsed.suggestedQuestions || [],
  };
}

// ---------------------------------------------------------------------------
// evaluateVivaTurn
// ---------------------------------------------------------------------------

export async function evaluateVivaTurn(
  syllabus: SyllabusData,
  persona: ExaminerPersona,
  candidateName: string,
  academicLevel: string,
  history: VivaTurn[],
  candidateLatestAnswer: string,
  chunks: DocumentChunk[] = []
): Promise<{
  aiThinkingReasoning: string;
  nextAdaptiveGoal: string;
  evaluation: {
    conceptualAccuracy: number;
    technicalRigor: number;
    depthOfExplanation: number;
    confidenceScore: number;
    misconceptionDetected: boolean;
    detectedMisconceptionNote?: string;
    positiveHighlights: string[];
    keyGaps: string[];
  };
  nextQuestion: string;
  nextStrategy: string;
  topicTested: string;
}> {
  const lastTurn = history[history.length - 1];
  const contextHint = lastTurn
    ? `${lastTurn.topicTested || ''} ${lastTurn.question || ''} ${candidateLatestAnswer}`
    : candidateLatestAnswer || syllabus.title;

  const relevantChunkText = selectRelevantChunks(chunks, contextHint, 6);
  const coveredTopics = [...new Set(history.map((h) => h.topicTested).filter(Boolean))];
  const allTopics = [...new Set(chunks.map((c) => c.heading).filter(Boolean))];
  const isOpeningTurn = history.length === 0;
  const currentTurnNumber = history.length + 1;

  console.log(`\n[Stage 5] evaluateVivaTurn: turn=${currentTurnNumber} chunks=${chunks.length} relevantChars=${relevantChunkText.length}`);
  if (chunks.length === 0) {
    console.error('[Stage 5] ⚠ No chunks — questions will not be grounded in uploaded material');
  }

  const conversationFormatted = history
    .map((h, idx) => `Turn ${idx + 1} [${h.strategy} → ${h.topicTested}]:
Q: "${h.question}"
A: "${h.candidateAnswer}"
Score: ${(h.evaluation as any)?.conceptualAccuracy ?? 'N/A'}%`)
    .join('\n---\n');

  const prompt = `You are ${persona.name} (${persona.title}), an AI university examiner conducting a live oral viva.
Demeanour: ${persona.style || 'Rigorous, Socratic, academically precise.'}

━━━ KNOWLEDGE BASE — UPLOADED STUDY MATERIAL ━━━
(Ask ONLY questions grounded in this content. Never invent topics outside this material.)
${relevantChunkText || '[No chunks available — use course title as fallback topic]'}

━━━ COURSE CONTEXT ━━━
Course: ${syllabus.title}
All KB topics: ${allTopics.length > 0 ? allTopics.join(', ') : syllabus.concepts.map((c) => c.title).join(', ') || 'General curriculum'}
Topics already covered: ${coveredTopics.join(', ') || 'None yet'}
Known misconceptions: ${syllabus.misconceptions.map((m) => `${m.concept}: ${m.flawedBelief}`).join(' | ') || 'None'}

CANDIDATE: ${candidateName} (${academicLevel})
TURN: ${currentTurnNumber}

${isOpeningTurn
  ? 'This is the OPENING question. Pick a foundational concept from the Knowledge Base above and ask a clear, specific question about it.'
  : `CONVERSATION SO FAR:\n${conversationFormatted}\n\nCANDIDATE'S LATEST ANSWER:\n"${candidateLatestAnswer}"`
}

INSTRUCTIONS:
${isOpeningTurn
  ? `Pick the most important concept from the Knowledge Base.
Frame a clear, specific opening question grounded in that content.
Set all evaluation scores to 0 for this opening turn.
Set nextStrategy to "FOUNDATIONAL_PROBE".`
  : `1. Evaluate the answer against the Knowledge Base content shown above.
2. Score each metric 0-100: conceptualAccuracy, technicalRigor, depthOfExplanation, confidenceScore.
3. Detect misconceptions — compare what they said vs what the material states.
4. Choose nextStrategy: DEPTH_PROBE | MISCONCEPTION_TEST | SITUATIONAL_APPLICATION | PIVOT_NEW_TOPIC | SCAFFOLDING_HINT
5. Write the next question using ONLY content from the Knowledge Base above.`
}

Return ONLY valid JSON — no markdown, no explanation:
{
  "aiThinkingReasoning": "Internal evaluation referencing specific KB content",
  "nextAdaptiveGoal": "One sentence on what you are assessing next and why",
  "evaluation": {
    "conceptualAccuracy": 80,
    "technicalRigor": 75,
    "depthOfExplanation": 70,
    "confidenceScore": 80,
    "misconceptionDetected": false,
    "detectedMisconceptionNote": "What they got wrong vs what the material says",
    "positiveHighlights": ["Specific thing correct from the KB"],
    "keyGaps": ["Specific gap vs KB content"]
  },
  "topicTested": "Exact KB heading or concept name",
  "nextStrategy": "DEPTH_PROBE",
  "nextQuestion": "The next viva question grounded in the uploaded material."
}`;

  const parsed = await callAI(prompt, 'evaluateVivaTurn');

  const evaluation = parsed.evaluation || {};
  console.log(`[Stage 6] nextQuestion: ${(parsed.nextQuestion || '').substring(0, 120)}`);
  console.log(`[Stage 6] topicTested : ${parsed.topicTested || '—'}`);
  console.log(`[Stage 6] nextStrategy: ${parsed.nextStrategy || '—'}`);

  return {
    aiThinkingReasoning: parsed.aiThinkingReasoning || (isOpeningTurn ? 'Opening question from knowledge base.' : 'Evaluating response...'),
    nextAdaptiveGoal: parsed.nextAdaptiveGoal || 'Probing core understanding from the uploaded material.',
    evaluation: {
      conceptualAccuracy: evaluation.conceptualAccuracy ?? (isOpeningTurn ? 0 : 70),
      technicalRigor:     evaluation.technicalRigor     ?? (isOpeningTurn ? 0 : 65),
      depthOfExplanation: evaluation.depthOfExplanation ?? (isOpeningTurn ? 0 : 65),
      confidenceScore:    evaluation.confidenceScore    ?? (isOpeningTurn ? 0 : 70),
      misconceptionDetected:     evaluation.misconceptionDetected ?? false,
      detectedMisconceptionNote: evaluation.detectedMisconceptionNote,
      positiveHighlights: evaluation.positiveHighlights ?? [],
      keyGaps:            evaluation.keyGaps            ?? [],
    },
    topicTested:  parsed.topicTested  || allTopics[0] || syllabus.concepts[0]?.title || 'Core Concept',
    nextStrategy: parsed.nextStrategy || (isOpeningTurn ? 'FOUNDATIONAL_PROBE' : 'DEPTH_PROBE'),
    nextQuestion: parsed.nextQuestion || `Can you explain a key concept from ${syllabus.title}?`,
  };
}

// ---------------------------------------------------------------------------
// generateFacultyReport
// ---------------------------------------------------------------------------

export async function generateFacultyReport(
  syllabus: SyllabusData,
  persona: ExaminerPersona,
  candidateName: string,
  candidateId: string,
  academicLevel: string,
  turns: VivaTurn[],
  chunks: DocumentChunk[] = []
): Promise<EvaluationReport> {
  const topicScores: Record<string, number[]> = {};
  turns.forEach((t) => {
    const topic = t.topicTested || 'General';
    if (!topicScores[topic]) topicScores[topic] = [];
    topicScores[topic].push(Number((t.evaluation as any)?.conceptualAccuracy ?? 70));
  });

  const topicPerformanceSummary = Object.entries(topicScores)
    .map(([topic, scores]) => `${topic}: ${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}%`)
    .join('\n');

  const transcriptSummary = turns
    .map((t, idx) => `Q${idx + 1} [${t.topicTested} / ${t.strategy}]:
Question: ${t.question}
Answer: ${t.candidateAnswer}
Score: ${(t.evaluation as any)?.conceptualAccuracy ?? 'N/A'}%
Misconception: ${(t.evaluation as any)?.misconceptionDetected ? (t.evaluation as any)?.detectedMisconceptionNote : 'None'}`)
    .join('\n---\n');

  const topicContext = Object.entries(buildTopicMap(chunks))
    .slice(0, 8)
    .map(([h, c]) => `[${h}]: ${c.substring(0, 300)}`)
    .join('\n\n');

  const prompt = `You are a Senior Academic Examiner generating an official Faculty Viva Evaluation Report.
Ground the report ONLY in the candidate's actual answers and the uploaded course material below.

COURSE: ${syllabus.title} (${syllabus.code})
CANDIDATE: ${candidateName} (ID: ${candidateId}) | LEVEL: ${academicLevel}
EXAMINER: ${persona.name} (${persona.title})

UPLOADED MATERIAL TOPICS:
${topicContext || syllabus.concepts.map((c) => c.title).join(', ') || 'General curriculum'}

TOPIC-WISE PERFORMANCE:
${topicPerformanceSummary || 'No topic data'}

VIVA TRANSCRIPT:
${transcriptSummary || 'No turns recorded.'}

Return ONLY valid JSON — no markdown:
{
  "overallScore": 84,
  "grade": "Distinction",
  "facultyVerdict": "Official board recommendation based on this viva",
  "readinessSummary": "2-3 paragraphs referencing specific topics and answers from the transcript",
  "radarMetrics": { "conceptualClarity": 85, "technicalRigor": 80, "problemSolving": 75, "misconceptionAvoidance": 90, "communicationFluency": 88 },
  "topicPerformance": [{ "topic": "Topic from material", "score": 85, "remarks": "What student demonstrated" }],
  "strongConcepts": ["Specific mastered concept from KB"],
  "weakConcepts": ["Specific gap concept from KB"],
  "keyStrengths": ["Concrete strength from actual answers"],
  "criticalMisconceptions": [{ "concept": "Topic", "description": "What they said vs what material states", "remediationAdvice": "Specific section to revisit" }],
  "learningRoadmap": ["Step 1: ...", "Step 2: ..."],
  "recommendedRemediation": ["Specific section to re-read"],
  "confidenceLevel": "High",
  "facultyRecommendations": ["Official recommendation"],
  "practiceQuestions": ["Follow-up question from the material"]
}`;

  const parsed = await callAI(prompt, 'generateFacultyReport');

  const computedScore = turns.length > 0
    ? Math.round(turns.reduce((s, t) => s + Number((t.evaluation as any)?.conceptualAccuracy ?? 70), 0) / turns.length)
    : 70;

  const report = {
    id: `report-${Date.now()}`,
    sessionId: `session-${Date.now()}`,
    candidateName, candidateId,
    academicLevel: academicLevel as any,
    syllabusTitle: syllabus.title,
    courseTitle: syllabus.title,
    examDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    generatedAt: new Date().toISOString(),
    overallScore:      parsed.overallScore ?? computedScore,
    grade:             parsed.grade ?? (computedScore >= 85 ? 'Distinction' : computedScore >= 70 ? 'Pass' : 'Conditional Pass'),
    verdict:           parsed.facultyVerdict ?? 'Passed Oral Examination',
    facultyVerdict:    parsed.facultyVerdict ?? 'Passed Oral Examination',
    readinessSummary:  parsed.readinessSummary ?? `${candidateName} completed the oral viva for ${syllabus.title}.`,
    radarMetrics: parsed.radarMetrics ?? {
      conceptualClarity: computedScore, technicalRigor: computedScore - 2,
      problemSolving: computedScore - 5, misconceptionAvoidance: computedScore + 3,
      communicationFluency: computedScore + 2,
    },
    matrix: {
      conceptualDepth:      parsed.radarMetrics?.conceptualClarity ?? computedScore,
      accuracyScore:        parsed.overallScore ?? computedScore,
      communicationClarity: parsed.radarMetrics?.communicationFluency ?? computedScore,
      problemSolvingAgility:parsed.radarMetrics?.problemSolving ?? computedScore,
    },
    keyStrengths:           parsed.keyStrengths ?? [],
    criticalMisconceptions: parsed.criticalMisconceptions ?? [],
    recommendedRemediation: parsed.recommendedRemediation ?? [],
    facultyRecommendations: parsed.facultyRecommendations ?? [],
    annotatedTurns: turns.map((t, i) => ({
      turnIndex: i + 1, question: t.question, answer: t.candidateAnswer,
      score: (t.evaluation as any)?.conceptualAccuracy ?? 70, comment: t.aiThinkingReasoning ?? '',
    })),
    vivaTurnLog: turns,
  } as EvaluationReport;

  (report as any).topicPerformance    = parsed.topicPerformance ?? [];
  (report as any).strongConcepts      = parsed.strongConcepts ?? [];
  (report as any).weakConcepts        = parsed.weakConcepts ?? [];
  (report as any).learningRoadmap     = parsed.learningRoadmap ?? [];
  (report as any).confidenceLevel     = parsed.confidenceLevel ?? 'Moderate';
  (report as any).practiceQuestions   = parsed.practiceQuestions ?? [];

  return report;
}
