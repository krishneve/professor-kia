export type UserRole = 'teacher' | 'student';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Teacher {
  teacher_id: string;
  user_id: string;
  full_name?: string;
  email?: string;
}

export interface Student {
  student_id: string;
  user_id: string;
  class_id?: string;
  full_name?: string;
  email?: string;
}

export interface ClassModel {
  id: string;
  class_name: string;
  class_code: string;
  semester: string;
  department: string;
  teacher_id: string;
  teacher_name?: string;
  student_count?: number;
  created_at: string;
}

export interface SubjectModel {
  id: string;
  subject_name: string;
  subject_code: string;
  class_id: string;
  class_name?: string;
  teacher_name?: string;
  created_at: string;
}

export interface EnrollmentModel {
  id: string;
  student_id: string;
  class_id: string;
  created_at: string;
}

export interface VivaSessionModel {
  id: string;
  subject_id: string;
  subject_name?: string;
  title: string;
  status: 'scheduled' | 'active' | 'completed';
  scheduled_date: string;
  created_at: string;
}

export interface ReportModel {
  id: string;
  student_id: string;
  student_name?: string;
  viva_session_id: string;
  viva_title?: string;
  score: number;
  report_json: Record<string, any>;
  created_at: string;
}

export interface StudyMaterial {
  id: string;
  subjectId: string;
  fileName: string;
  fileType: 'PDF' | 'DOCX' | 'PPTX' | 'TXT' | string;
  fileSize: number;
  uploadDate: string;
  storagePath: string;
  processedPath: string;
  processingStatus: 'pending' | 'processing' | 'ready' | 'failed';
  totalPages?: number;
  totalChunks?: number;
}

export interface KnowledgeBase {
  id: string;
  subjectId: string;
  materialIds: string[];
  totalDocuments: number;
  totalChunks: number;
  totalPages: number;
  aiStatus: 'pending' | 'processing' | 'ready' | 'failed';
  lastIndexed: string;
}

export interface ExaminationBlueprint {
  id: string;
  subjectId: string;
  title: string;
  generatedAt: string;
  status: 'draft' | 'published' | 'archived';
  strategyData?: {
    overview?: string;
    topics?: string[];
    topicWeightages?: Record<string, number>;
    difficultyProgression?: string[];
    bloomTaxonomyDistribution?: Record<string, number>;
    estimatedDuration?: string;
    questionStrategy?: string;
    recommendedPersonas?: string[];
    sampleProbingAngles?: string[];
  };
}

export interface DocumentChunk {
  documentTitle: string;
  pageNumber: number;
  heading: string;
  chunkContent: string;
  chunkIndex: number;
  // Set when stored in Supabase
  subjectId?: string;
  materialId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Auxiliary types for phase compatibility
export type AcademicLevel = 'Undergraduate' | 'Postgraduate' | 'Doctoral / Research';
export type ExaminerPersonaId = 'socratic' | 'rigorous' | 'supportive' | 'industry';

export interface ConceptNode {
  id: string;
  title: string;
  description: string;
  importance: string;
  category?: string;
  taxonomyLevel?: string;
}

export interface MisconceptionItem {
  id: string;
  concept: string;
  flawedBelief?: string;
  commonPitfall?: string;
  correctUnderstanding?: string;
  probingQuestion: string;
}

export interface SyllabusData {
  id: string;
  title: string;
  code: string;
  domain: string;
  description?: string;
  concepts: ConceptNode[];
  misconceptions: MisconceptionItem[];
  rawSyllabusText?: string;
  rawText?: string;
  cognitiveDistribution?: any;
  suggestedQuestions?: string[];
  updatedAt?: string;
}

export interface ExaminerPersona {
  id: ExaminerPersonaId;
  name: string;
  title: string;
  styleDescription?: string;
  description?: string;
  style?: string;
  avatar?: string;
  avatarUrl?: string;
  accentColor?: string;
  voiceName?: string;
  tonePrompt?: string;
}

export interface EvaluationMatrix {
  conceptualDepth: number; // 0-100
  accuracyScore: number;   // 0-100
  communicationClarity: number; // 0-100
  problemSolvingAgility: number; // 0-100
}

export interface VivaTurn {
  id?: string;
  turnNumber?: number;
  turnIndex?: number;
  question: string;
  targetConceptId?: string;
  difficulty?: 'foundational' | 'intermediate' | 'advanced' | 'edge-case' | string;
  candidateAnswer?: string;
  strategy?: string;
  topicTested?: string;
  aiThinkingReasoning?: string;
  audioUrl?: string;
  timestamp?: string;
  evaluation?: {
    isCorrect: boolean;
    conceptualAccuracy?: number | string;
    technicalRigor?: number | string;
    depthOfExplanation?: number | string;
    misconceptionDetected?: boolean;
    detectedMisconceptionNote?: string;
    positiveHighlights?: string[];
    keyGaps?: string[];
    conceptualGaps: string[];
    matrix: EvaluationMatrix;
    examinerNote: string;
  };
}

export interface VivaSession {
  id: string;
  syllabusId: string;
  syllabusTitle: string;
  candidateName: string;
  candidateId: string;
  academicLevel: AcademicLevel;
  personaId: ExaminerPersonaId;
  status: 'draft' | 'ongoing' | 'completed' | 'IN_PROGRESS' | 'COMPLETED';
  turns: VivaTurn[];
  startedAt?: string;
  completedAt?: string;
  startTime?: string;
  endTime?: string;
  overallReport?: EvaluationReport;
  targetQuestionsCount?: number;
  currentTurnIndex?: number;
}

export interface EvaluationReport {
  id?: string;
  sessionId?: string;
  candidateName?: string;
  candidateId?: string;
  academicLevel?: AcademicLevel;
  syllabusTitle?: string;
  courseTitle?: string;
  examDate?: string;
  generatedAt?: string;
  overallScore?: number;
  grade?: string;
  verdict?: string;
  matrix?: EvaluationMatrix;
  radarMetrics?: any;
  readinessSummary?: string;
  keyStrengths?: string[];
  criticalMisconceptions?: Array<{
    concept: string;
    description: string;
    remediationAdvice: string;
  }>;
  recommendedRemediation?: any;
  facultyRecommendations?: string[];
  facultyVerdict?: string;
  annotatedTurns?: VivaTurn[];
  vivaTurnLog?: VivaTurn[];
}
