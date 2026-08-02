import { DocumentChunk, ExaminationBlueprint, EvaluationReport, VivaTurn } from '../../types';

export interface PlannerAgentInput {
  subjectId: string;
  subjectTitle: string;
  chunks: DocumentChunk[];
  targetQuestionCount?: number;
}

export interface ExaminerAgentInput {
  blueprint: ExaminationBlueprint;
  chunks: DocumentChunk[];
  previousTurns: VivaTurn[];
  candidateLevel: string;
}

export interface EvaluatorAgentInput {
  turn: VivaTurn;
  candidateAnswer: string;
  expectedConcepts: string[];
}

export interface MentorAgentInput {
  report: EvaluationReport;
  candidateName: string;
}

export interface AgentResponse<T> {
  agentName: 'PlannerAgent' | 'ExaminerAgent' | 'EvaluatorAgent' | 'MentorAgent';
  timestamp: string;
  success: boolean;
  data: T;
  reasoningTrace?: string;
}
