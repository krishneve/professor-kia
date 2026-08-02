import { VivaTurn, ExaminationBlueprint, DocumentChunk } from '../../types';
import { AgentResponse, ExaminerAgentInput } from './types';
import { GoogleGenAI } from '@google/genai';

export class ExaminerAgent {
  static async generateQuestion(input: ExaminerAgentInput): Promise<AgentResponse<VivaTurn>> {
    const timestamp = new Date().toISOString();
    const turnNumber = input.previousTurns.length + 1;
    const topics = input.blueprint.strategyData?.topics || [
      'Core Theoretical Mechanics',
      'System Invariants & Constraints',
      'Practical Implementation & Edge Cases',
      'Architectural Evaluation & Trade-offs'
    ];

    const currentTopic = topics[(turnNumber - 1) % topics.length];
    const difficultyLevel = turnNumber === 1 ? 'Foundational' : turnNumber <= 3 ? 'Intermediate' : turnNumber <= 5 ? 'Advanced' : 'Expert';

    let question = `[Gemma Examiner] Grounded in our Knowledge Base under "${currentTopic}": How does the underlying system maintain state invariants and prevent failures under high load?`;
    let strategy = 'Foundational Probing';
    let reasoningTrace = `Gemma Examiner initiating examination turn #${turnNumber} targeting "${currentTopic}" at ${difficultyLevel} level.`;

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const historyText = input.previousTurns.map((t, i) => `Turn ${i + 1} (${t.topicTested}):
Q: ${t.question}
A: ${t.candidateAnswer || 'No response'}
Eval: Accuracy ${t.evaluation?.conceptualAccuracy || 'N/A'}%, Misconception: ${t.evaluation?.misconceptionDetected ? 'Yes' : 'No'}`).join('\n---\n');

        const prompt = `You are Gemma ExaminerAgent, an autonomous oral viva interviewer.
Conduct an oral examination question based on the syllabus blueprint and candidate history.

Subject: ${input.blueprint.title}
Target Topic: ${currentTopic}
Candidate Academic Level: ${input.candidateLevel || 'Undergraduate'}
Turn Number: ${turnNumber}
Target Difficulty: ${difficultyLevel}

VIVA HISTORY SO FAR:
${historyText || 'Opening Question'}

Instructions:
1. Generate the next oral question. Make it sound natural, sharp, and academic like a professor conducting a viva.
2. Choose an adaptive strategy from: 'FOUNDATIONAL_PROBE' | 'DEPTH_PROBE' | 'MISCONCEPTION_TEST' | 'SITUATIONAL_APPLICATION' | 'PIVOT_NEW_TOPIC'.
3. State your internal AI reasoning trace explaining why you chose this question.

Return JSON strictly:
{
  "question": "Oral question text...",
  "strategy": "DEPTH_PROBE",
  "reasoningTrace": "Gemma reasoning trace..."
}`;

        const res = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });

        if (res.text) {
          const parsed = JSON.parse(res.text);
          if (parsed.question) question = parsed.question;
          if (parsed.strategy) strategy = parsed.strategy;
          if (parsed.reasoningTrace) reasoningTrace = parsed.reasoningTrace;
        }
      } catch (err) {
        console.warn('Gemma ExaminerAgent API fallback:', err);
      }
    }

    const turn: VivaTurn = {
      id: `turn-${Date.now()}`,
      turnNumber,
      turnIndex: turnNumber,
      question,
      topicTested: currentTopic,
      difficulty: difficultyLevel.toLowerCase(),
      strategy,
      aiThinkingReasoning: reasoningTrace,
      timestamp,
    };

    return {
      agentName: 'ExaminerAgent',
      timestamp,
      success: true,
      data: turn,
      reasoningTrace,
    };
  }
}
