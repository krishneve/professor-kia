import { DocumentChunk, ExaminationBlueprint, EvaluationReport, VivaTurn } from '../../types';
import { PlannerAgent } from './plannerAgent';
import { ExaminerAgent } from './examinerAgent';
import { EvaluatorAgent } from './evaluatorAgent';
import { MentorAgent } from './mentorAgent';

export { PlannerAgent, ExaminerAgent, EvaluatorAgent, MentorAgent };

export const gemmaService = {
  async analyzeKnowledgeBase(subjectId: string, materialIds: string[], chunks: DocumentChunk[] = []) {
    const totalDocs = materialIds.length;
    const totalChunks = chunks.length;
    const totalPages = Math.max(1, Math.ceil(totalChunks / 3));

    return {
      subjectId,
      totalDocuments: totalDocs,
      totalChunks,
      totalPages,
      aiStatus: totalDocs > 0 ? 'ready' : 'pending',
      summary: `Knowledge Base initialized with ${totalDocs} document(s) containing ${totalChunks} indexed chunks ready for Gemma Agent processing.`,
      lastIndexed: new Date().toISOString(),
    };
  },

  async generateBlueprint(subjectId: string, subjectTitle: string, chunks: DocumentChunk[] = []): Promise<ExaminationBlueprint> {
    const res = await PlannerAgent.createBlueprint({
      subjectId,
      subjectTitle,
      chunks,
    });
    return res.data;
  },

  async generateQuestion(blueprint: ExaminationBlueprint, chunks: DocumentChunk[] = [], previousTurns: VivaTurn[] = [], candidateLevel: string = 'Undergraduate'): Promise<VivaTurn> {
    const res = await ExaminerAgent.generateQuestion({
      blueprint,
      chunks,
      previousTurns,
      candidateLevel,
    });
    return res.data;
  },

  async evaluateAnswer(turn: VivaTurn, candidateAnswer: string, expectedConcepts: string[] = []): Promise<VivaTurn> {
    const res = await EvaluatorAgent.evaluateTurn({
      turn,
      candidateAnswer,
      expectedConcepts,
    });
    return res.data;
  },

  async generateReport(sessionData: { subjectTitle: string; candidateName: string; candidateId: string; turns: VivaTurn[] }): Promise<EvaluationReport> {
    const res = await MentorAgent.generateReport({
      candidateName: sessionData.candidateName,
      candidateId: sessionData.candidateId,
      courseTitle: sessionData.subjectTitle,
      turns: sessionData.turns,
    });
    return res.data;
  },
};
