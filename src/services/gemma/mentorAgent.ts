import { EvaluationReport, VivaTurn } from '../../types';
import { AgentResponse } from './types';
import { GoogleGenAI } from '@google/genai';

export interface MentorAgentInput {
  candidateName: string;
  candidateId: string;
  courseTitle: string;
  turns: VivaTurn[];
}

export class MentorAgent {
  static async generateReport(input: MentorAgentInput): Promise<AgentResponse<EvaluationReport>> {
    const timestamp = new Date().toISOString();
    const turns = input.turns || [];

    // -----------------------------------------------------------------------
    // Compute baseline metrics from turn data — no hardcoded values
    // -----------------------------------------------------------------------
    const computedScore =
      turns.length > 0
        ? Math.round(
            turns.reduce((sum, t) => sum + Number((t.evaluation as any)?.conceptualAccuracy ?? 70), 0) /
              turns.length
          )
        : 70;

    // Per-topic performance from actual turn data
    const topicScores: Record<string, number[]> = {};
    turns.forEach((t) => {
      const topic = t.topicTested || 'General';
      if (!topicScores[topic]) topicScores[topic] = [];
      topicScores[topic].push(Number((t.evaluation as any)?.conceptualAccuracy ?? 70));
    });

    const topicPerformanceDefault = Object.entries(topicScores).map(([topic, scores]) => ({
      topic,
      score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      remarks: `Assessed during the viva session.`,
    }));

    const strongConceptsDefault = topicPerformanceDefault
      .filter((t) => t.score >= 75)
      .map((t) => t.topic);

    const weakConceptsDefault = topicPerformanceDefault
      .filter((t) => t.score < 75)
      .map((t) => t.topic);

    // Collect misconceptions directly from turn evaluations
    const misconceptionsFromTurns: Array<{ concept: string; description: string; remediationAdvice: string }> = [];
    turns.forEach((t) => {
      if ((t.evaluation as any)?.misconceptionDetected) {
        misconceptionsFromTurns.push({
          concept: t.topicTested || 'Core Concept',
          description: (t.evaluation as any)?.detectedMisconceptionNote || 'Candidate showed a gap in understanding.',
          remediationAdvice: `Review the material on "${t.topicTested || 'this topic'}" and re-examine the specific concept.`,
        });
      }
    });

    // Grade based on computed score — no hardcoded subject names
    const grade =
      computedScore >= 85 ? 'Distinction' : computedScore >= 70 ? 'Pass' : 'Conditional Pass';
    const facultyVerdict =
      computedScore >= 70 ? 'Passed Oral Assessment' : 'Recommended for Remedial Review';
    const readinessSummary = `Candidate ${input.candidateName} completed the oral viva examination for "${input.courseTitle}". Overall performance score: ${computedScore}/100.`;

    // -----------------------------------------------------------------------
    // Mutable output — overwritten by Gemma if API key is available
    // -----------------------------------------------------------------------
    let overallScore = computedScore;
    let finalGrade = grade;
    let finalVerdict = facultyVerdict;
    let finalSummary = readinessSummary;
    let keyStrengths: string[] = strongConceptsDefault.length > 0
      ? strongConceptsDefault.map((c) => `Demonstrated understanding of ${c}`)
      : [`Engaged with the viva examination on ${input.courseTitle}`];
    let criticalMisconceptions = misconceptionsFromTurns;
    let facultyRecommendations: string[] = [
      computedScore >= 70
        ? 'Candidate is cleared for further coursework in this subject.'
        : 'Candidate should revisit the weak topics identified before proceeding.',
    ];
    let recommendedRemediation: string[] = weakConceptsDefault.length > 0
      ? weakConceptsDefault.map((c) => `Re-read and review material on: ${c}`)
      : ['Review the full course material and focus on areas where questions were challenging.'];
    let practiceQuestions: string[] = [
      `Explain the key concepts covered in ${input.courseTitle} in your own words.`,
    ];
    let topicPerformance = topicPerformanceDefault;
    let strongConcepts = strongConceptsDefault;
    let weakConcepts = weakConceptsDefault;
    let learningRoadmap: string[] = weakConceptsDefault.length > 0
      ? weakConceptsDefault.map((c, i) => `Step ${i + 1}: Revisit "${c}" from the course material`)
      : [`Step 1: Consolidate understanding of all topics covered in ${input.courseTitle}`];
    let confidenceLevel = computedScore >= 80 ? 'High' : computedScore >= 65 ? 'Moderate' : 'Low';

    // -----------------------------------------------------------------------
    // Gemma API call — enrich everything with real AI output
    // -----------------------------------------------------------------------
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const turnsSummary = turns
          .map(
            (t, idx) => `Turn ${idx + 1} [Topic: ${t.topicTested || 'N/A'} | Strategy: ${t.strategy || 'N/A'}]:
Q: ${t.question}
A: ${t.candidateAnswer || '(no answer)'}
Score: ${(t.evaluation as any)?.conceptualAccuracy ?? 'N/A'}%
Depth: ${(t.evaluation as any)?.depthOfExplanation ?? 'N/A'}%
Misconception: ${(t.evaluation as any)?.misconceptionDetected ? 'YES — ' + (t.evaluation as any)?.detectedMisconceptionNote : 'None'}
Examiner Note: ${t.aiThinkingReasoning || ''}`
          )
          .join('\n---\n');

        const topicSummary = topicPerformanceDefault
          .map((t) => `${t.topic}: ${t.score}%`)
          .join('\n');

        const prompt = `You are a Senior University Professor and Board Examiner generating an official Faculty Viva Evaluation Report.
The report must be based ONLY on the candidate's actual viva responses below.
Do NOT use generic academic language. Reference specific topics and answers from the transcript.

COURSE: "${input.courseTitle}"
CANDIDATE: ${input.candidateName} (ID: ${input.candidateId})

TOPIC-WISE PERFORMANCE:
${topicSummary || 'No topic data available'}

FULL VIVA TRANSCRIPT:
${turnsSummary || 'No turn data recorded.'}

Generate a JSON faculty report strictly following this schema:
{
  "overallScore": 84,
  "grade": "Distinction",
  "facultyVerdict": "Official board recommendation based on performance",
  "readinessSummary": "2-3 paragraph professor-quality synthesis. Must reference specific topics from the viva and specific things the student said or missed.",
  "topicPerformance": [
    {
      "topic": "Exact topic tested in the viva",
      "score": 85,
      "remarks": "What the student demonstrated or missed about this specific topic"
    }
  ],
  "strongConcepts": [
    "Specific concept the student showed mastery of, from the viva topics"
  ],
  "weakConcepts": [
    "Specific concept the student struggled with, from the viva topics"
  ],
  "keyStrengths": [
    "Concrete academic strength grounded in their actual answers"
  ],
  "criticalMisconceptions": [
    {
      "concept": "Specific topic from the viva",
      "description": "Exact misconception — what they said vs what is correct",
      "remediationAdvice": "Specific guidance on what to study to correct this"
    }
  ],
  "learningRoadmap": [
    "Step 1: Specific action to improve understanding of a weak concept",
    "Step 2: Specific study task for the next gap identified"
  ],
  "recommendedRemediation": [
    "Specific topic or section to re-study based on the viva performance"
  ],
  "confidenceLevel": "High",
  "facultyRecommendations": [
    "Official academic recommendation based on this viva performance"
  ],
  "practiceQuestions": [
    "Follow-up question targeting a specific gap identified in the viva"
  ]
}`;

        const res = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });

        if (res.text) {
          const parsed = JSON.parse(res.text);
          if (parsed.overallScore)                         overallScore = parsed.overallScore;
          if (parsed.grade)                                finalGrade = parsed.grade;
          if (parsed.facultyVerdict)                       finalVerdict = parsed.facultyVerdict;
          if (parsed.readinessSummary)                     finalSummary = parsed.readinessSummary;
          if (parsed.keyStrengths?.length)                 keyStrengths = parsed.keyStrengths;
          if (parsed.criticalMisconceptions)               criticalMisconceptions = parsed.criticalMisconceptions;
          if (parsed.facultyRecommendations)               facultyRecommendations = parsed.facultyRecommendations;
          if (parsed.recommendedRemediation)               recommendedRemediation = parsed.recommendedRemediation;
          if (parsed.practiceQuestions)                    practiceQuestions = parsed.practiceQuestions;
          if (parsed.topicPerformance?.length)             topicPerformance = parsed.topicPerformance;
          if (parsed.strongConcepts?.length)               strongConcepts = parsed.strongConcepts;
          if (parsed.weakConcepts?.length)                 weakConcepts = parsed.weakConcepts;
          if (parsed.learningRoadmap?.length)              learningRoadmap = parsed.learningRoadmap;
          if (parsed.confidenceLevel)                      confidenceLevel = parsed.confidenceLevel;
        }
      } catch (err) {
        console.warn('MentorAgent Gemma API fallback — using computed defaults:', err);
      }
    }

    // -----------------------------------------------------------------------
    // Assemble final report
    // -----------------------------------------------------------------------
    const report: EvaluationReport = {
      id: `rep-${Date.now()}`,
      sessionId: `viva-${Date.now()}`,
      candidateName: input.candidateName,
      candidateId: input.candidateId,
      academicLevel: 'Undergraduate',
      syllabusTitle: input.courseTitle,
      courseTitle: input.courseTitle,
      examDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      generatedAt: timestamp,
      overallScore,
      grade: finalGrade,
      verdict: finalVerdict,
      facultyVerdict: finalVerdict,
      readinessSummary: finalSummary,
      radarMetrics: {
        conceptualClarity: overallScore,
        technicalRigor: Math.min(100, overallScore - 2),
        problemSolving: Math.max(50, overallScore - 5),
        misconceptionAvoidance: misconceptionsFromTurns.length === 0
          ? Math.min(100, overallScore + 5)
          : Math.max(50, overallScore - 10),
        communicationFluency: Math.min(100, overallScore + 2),
      },
      matrix: {
        conceptualDepth: overallScore,
        accuracyScore: overallScore,
        communicationClarity: Math.min(100, overallScore + 2),
        problemSolvingAgility: Math.max(50, overallScore - 5),
      },
      keyStrengths,
      criticalMisconceptions,
      facultyRecommendations,
      recommendedRemediation,
      annotatedTurns: turns,
      vivaTurnLog: turns,
    };

    // Attach extended fields for FacultyReportView
    (report as any).topicPerformance = topicPerformance;
    (report as any).strongConcepts = strongConcepts;
    (report as any).weakConcepts = weakConcepts;
    (report as any).learningRoadmap = learningRoadmap;
    (report as any).confidenceLevel = confidenceLevel;
    (report as any).practiceQuestions = practiceQuestions;

    return {
      agentName: 'MentorAgent',
      timestamp,
      success: true,
      data: report,
      reasoningTrace: `MentorAgent synthesized faculty report for ${input.candidateName} — score ${overallScore}/100, ${topicPerformance.length} topics assessed.`,
    };
  }
}
