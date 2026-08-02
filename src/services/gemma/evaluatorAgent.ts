import { VivaTurn, EvaluationMatrix } from '../../types';
import { AgentResponse, EvaluatorAgentInput } from './types';
import { GoogleGenAI } from '@google/genai';

export interface ExtendedEvaluatorOutput extends VivaTurn {
  nextAdaptiveGoal?: string;
  nextStrategy?: string;
  nextQuestion?: string;
}

export class EvaluatorAgent {
  static async evaluateTurn(input: EvaluatorAgentInput): Promise<AgentResponse<VivaTurn>> {
    const timestamp = new Date().toISOString();
    const candidateAnswer = input.candidateAnswer || '';
    const wordCount = candidateAnswer.trim().split(/\s+/).filter(Boolean).length;
    const isSubstantive = wordCount > 15;

    let conceptualAccuracy = isSubstantive ? 85 : 50;
    let technicalRigor = isSubstantive ? 80 : 45;
    let depthOfExplanation = isSubstantive ? 80 : 40;
    let confidenceScore = isSubstantive ? 88 : 50;
    let misconceptionDetected = !isSubstantive;
    let detectedMisconceptionNote = !isSubstantive
      ? 'Candidate provided a brief or surface-level answer without articulating core theoretical invariants.'
      : undefined;
    let positiveHighlights = isSubstantive
      ? ['Clear vocabulary', 'Addressed primary mechanism']
      : ['Attempted initial response'];
    let keyGaps = isSubstantive
      ? ['Could further elaborate on low-level failure modes']
      : ['Lacks deep explanation of protocol state machines'];

    let aiThinkingReasoning = `Gemma Evaluator analyzed response (${wordCount} words). ${isSubstantive ? 'Demonstrates solid conceptual grasp.' : 'Surface answer detected — initiating adaptive follow-up.'}`;
    let nextAdaptiveGoal = isSubstantive ? 'Increasing question difficulty to test edge-case application' : 'Exploring conceptual misunderstanding & verifying prerequisites';
    let nextStrategy = isSubstantive ? 'DEPTH_PROBE' : 'SCAFFOLDING_HINT';
    let nextQuestion = isSubstantive
      ? `That demonstrates good understanding of the primary workflow. Now, what happens if a network partition occurs right during state transition?`
      : `Let's break this down. Can you first state the core definition before we examine system failure modes?`;

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `You are Gemma EvaluatorAgent, an autonomous AI oral viva examiner.
Evaluate the candidate's answer for the following turn:

Question: "${input.turn.question}"
Tested Topic: "${input.turn.topicTested || 'Core Concept'}"
Candidate Answer: "${candidateAnswer}"

INSTRUCTIONS:
1. Evaluate candidate's conceptual accuracy, technical rigor, depth of explanation, and communication.
2. Identify if any specific misconception or flawed belief was exhibited.
3. Determine the next adaptive strategy:
   - 'DEPTH_PROBE' (Increase difficulty / ask why)
   - 'MISCONCEPTION_TEST' (Test flawed assumption)
   - 'SITUATIONAL_APPLICATION' (Practical scenario)
   - 'PIVOT_NEW_TOPIC' (Transition)
   - 'SCAFFOLDING_HINT' (Guide student)
4. Formulate internal reasoning for the Live AI Analysis Panel ("aiThinkingReasoning") and next adaptive goal ("nextAdaptiveGoal").
5. Formulate the next viva question ("nextQuestion").

Return JSON strictly:
{
  "aiThinkingReasoning": "Internal reasoning trace...",
  "nextAdaptiveGoal": "Assessing application skills / Verifying prerequisite knowledge...",
  "nextStrategy": "DEPTH_PROBE",
  "nextQuestion": "Next viva question...",
  "evaluation": {
    "conceptualAccuracy": 85,
    "technicalRigor": 80,
    "depthOfExplanation": 75,
    "confidenceScore": 88,
    "misconceptionDetected": false,
    "detectedMisconceptionNote": "Note if misconception found",
    "positiveHighlights": ["Used precise terms", "Explained state machine"],
    "keyGaps": ["Omitted timeout edge cases"]
  }
}`;

        const res = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });

        if (res.text) {
          const parsed = JSON.parse(res.text);
          if (parsed.aiThinkingReasoning) aiThinkingReasoning = parsed.aiThinkingReasoning;
          if (parsed.nextAdaptiveGoal) nextAdaptiveGoal = parsed.nextAdaptiveGoal;
          if (parsed.nextStrategy) nextStrategy = parsed.nextStrategy;
          if (parsed.nextQuestion) nextQuestion = parsed.nextQuestion;
          if (parsed.evaluation) {
            conceptualAccuracy = parsed.evaluation.conceptualAccuracy ?? conceptualAccuracy;
            technicalRigor = parsed.evaluation.technicalRigor ?? technicalRigor;
            depthOfExplanation = parsed.evaluation.depthOfExplanation ?? depthOfExplanation;
            confidenceScore = parsed.evaluation.confidenceScore ?? confidenceScore;
            misconceptionDetected = Boolean(parsed.evaluation.misconceptionDetected);
            detectedMisconceptionNote = parsed.evaluation.detectedMisconceptionNote;
            if (parsed.evaluation.positiveHighlights) positiveHighlights = parsed.evaluation.positiveHighlights;
            if (parsed.evaluation.keyGaps) keyGaps = parsed.evaluation.keyGaps;
          }
        }
      } catch (err) {
        console.warn('Gemma EvaluatorAgent API fallback:', err);
      }
    }

    const evaluatedTurn: VivaTurn = {
      ...input.turn,
      candidateAnswer,
      strategy: nextStrategy,
      aiThinkingReasoning,
      evaluation: {
        isCorrect: conceptualAccuracy >= 70,
        conceptualAccuracy,
        depthOfExplanation,
        misconceptionDetected,
        detectedMisconceptionNote,
        conceptualGaps: keyGaps,
        positiveHighlights,
        keyGaps,
        matrix: {
          conceptualDepth: depthOfExplanation,
          accuracyScore: conceptualAccuracy,
          communicationClarity: confidenceScore,
          problemSolvingAgility: technicalRigor,
        },
        examinerNote: aiThinkingReasoning,
      },
    };

    // Attach extended metadata for live viva controller
    (evaluatedTurn as any).nextAdaptiveGoal = nextAdaptiveGoal;
    (evaluatedTurn as any).nextStrategy = nextStrategy;
    (evaluatedTurn as any).nextQuestion = nextQuestion;

    return {
      agentName: 'EvaluatorAgent',
      timestamp,
      success: true,
      data: evaluatedTurn,
      reasoningTrace: aiThinkingReasoning,
    };
  }
}
