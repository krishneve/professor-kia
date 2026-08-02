import React, { useState, useEffect, useRef } from 'react';
import { VivaSession, VivaTurn, SyllabusData, ExaminerPersona } from '../types';
import { EXAMINER_PERSONAS } from '../data/presets';
import { Mic, MicOff, Send, Volume2, VolumeX, Sparkles, AlertTriangle, Brain, Loader2, HelpCircle, CheckCircle2, ArrowRight, Activity, ShieldAlert } from 'lucide-react';

interface LiveVivaStageProps {
  session: VivaSession;
  syllabus: SyllabusData;
  onUpdateSession: (session: VivaSession) => void;
  onCompleteSession: (completedSession: VivaSession) => void;
}

// Extended shape of the evaluation object returned by /api/viva/evaluate-turn
// (superset of VivaTurn.evaluation — includes fields Gemma returns but types.ts omits)
interface LiveEvaluation {
  isCorrect?: boolean;
  conceptualAccuracy: number;
  technicalRigor: number;
  depthOfExplanation: number;
  confidenceScore?: number;
  misconceptionDetected: boolean;
  detectedMisconceptionNote?: string;
  positiveHighlights: string[];
  keyGaps: string[];
  // matrix fields forwarded from EvaluationMatrix
  conceptualDepth?: number;
  accuracyScore?: number;
  communicationClarity?: number;
  problemSolvingAgility?: number;
  examinerNote?: string;
  conceptualGaps?: string[];
}

export const LiveVivaStage: React.FC<LiveVivaStageProps> = ({
  session,
  syllabus,
  onUpdateSession,
  onCompleteSession,
}) => {
  const persona = EXAMINER_PERSONAS.find(p => p.id === session.personaId) || EXAMINER_PERSONAS[0];

  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [currentStrategy, setCurrentStrategy] = useState<string>('OPENING_QUESTION');
  const [currentTopic, setCurrentTopic] = useState<string>('Overview & Core Concepts');
  const [candidateAnswer, setCandidateAnswer] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [latestTurnResult, setLatestTurnResult] = useState<VivaTurn | null>(null);
  const [latestEval, setLatestEval] = useState<LiveEvaluation | null>(null);
  const [latestAdaptiveGoal, setLatestAdaptiveGoal] = useState<string>('');
  const [isThinkingDrawerOpen, setIsThinkingDrawerOpen] = useState<boolean>(true);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(session.turns.length === 0);

  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setCandidateAnswer(transcript);
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Fetch opening question on mount if new session
  useEffect(() => {
    if (session.turns.length === 0) {
      fetchNextQuestion('First question of oral examination', '');
    } else {
      const lastTurn = session.turns[session.turns.length - 1];
      setCurrentQuestion(lastTurn.question);
      setCurrentStrategy(lastTurn.strategy);
      setCurrentTopic(lastTurn.topicTested);
      setLatestTurnResult(lastTurn);
      // Restore eval panel from the saved turn's evaluation (cast to LiveEvaluation)
      if (lastTurn.evaluation) {
        setLatestEval(lastTurn.evaluation as unknown as LiveEvaluation);
      }
      setIsInitialLoading(false);
    }
  }, []);

  // Speak question via browser speech synthesis or audio
  const speakQuestion = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported in this browser. You can type your answer in the box below.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setCandidateAnswer('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const fetchNextQuestion = async (promptHint: string, lastAnswer: string) => {
    setIsEvaluating(true);
    // Capture the question being answered *before* any state update
    const answeredQuestion = currentQuestion;
    try {
      const response = await fetch('/api/viva/evaluate-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: session.syllabusId,   // ← tells the server which chunks to load
          syllabus,
          persona,
          candidateName: session.candidateName,
          academicLevel: session.academicLevel,
          history: session.turns,
          candidateLatestAnswer: lastAnswer || 'Opening session initialization.',
        }),
      });

      if (!response.ok) throw new Error('Evaluation failed');

      const data = await response.json();

      setCurrentQuestion(data.nextQuestion);
      setCurrentStrategy(data.nextStrategy);
      setCurrentTopic(data.topicTested);

      // Capture the full evaluation payload + adaptive goal directly from the API response
      // so the panel renders correct values regardless of VivaTurn type narrowness
      if (data.evaluation) {
        setLatestEval(data.evaluation as LiveEvaluation);
      }
      if (data.nextAdaptiveGoal) {
        setLatestAdaptiveGoal(data.nextAdaptiveGoal);
      }

      if (lastAnswer) {
        const newTurn: VivaTurn = {
          id: `turn-${Date.now()}`,
          turnIndex: session.turns.length + 1,
          // Use the captured question (what was actually asked this turn)
          question: answeredQuestion,
          strategy: data.nextStrategy,
          topicTested: data.topicTested,
          candidateAnswer: lastAnswer,
          timestamp: new Date().toLocaleTimeString(),
          aiThinkingReasoning: data.aiThinkingReasoning,
          evaluation: data.evaluation,
        };

        const updatedTurns = [...session.turns, newTurn];
        setLatestTurnResult(newTurn);

        const updatedSession: VivaSession = {
          ...session,
          currentTurnIndex: updatedTurns.length + 1,
          turns: updatedTurns,
        };

        onUpdateSession(updatedSession);

        // Auto speak question if enabled
        speakQuestion(data.nextQuestion);

        // Check if finished target questions count
        if (updatedTurns.length >= (session.targetQuestionsCount ?? 5)) {
          finishVivaSession(updatedSession);
          return;
        }
      } else {
        // Initial opening question
        speakQuestion(data.nextQuestion);
      }
    } catch (err: any) {
      alert('Viva Evaluation Error: ' + err.message);
    } finally {
      setIsEvaluating(false);
      setIsInitialLoading(false);
      setCandidateAnswer('');
    }
  };

  const handleSubmitAnswer = () => {
    if (!candidateAnswer.trim() || isEvaluating) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    fetchNextQuestion('Evaluate answer and proceed', candidateAnswer);
  };

  const handleRequestHint = () => {
    const hintAnswer = "[CANDIDATE REQUESTED HINT / SCAFFOLDING CLUE]";
    fetchNextQuestion('Candidate requested hint', hintAnswer);
  };

  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);

  const finishVivaSession = async (finalSession: VivaSession) => {
    if (isGeneratingReport) return; // prevent double-trigger
    setIsGeneratingReport(true);
    setIsEvaluating(true);
    try {
      const res = await fetch('/api/viva/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: finalSession.syllabusId,   // ← tells the server which chunks to load
          syllabus,
          persona,
          candidateName: finalSession.candidateName,
          candidateId: finalSession.candidateId,
          academicLevel: finalSession.academicLevel,
          turns: finalSession.turns,
        }),
      });

      if (!res.ok) throw new Error('Report generation failed');

      const report = await res.json();
      const completed: VivaSession = {
        ...finalSession,
        status: 'COMPLETED',
        endTime: new Date().toLocaleTimeString(),
        overallReport: report,
      };

      onCompleteSession(completed);
    } catch (err: any) {
      alert('Report Error: ' + err.message);
      setIsGeneratingReport(false);
    } finally {
      setIsEvaluating(false);
    }
  };

  if (isInitialLoading || isGeneratingReport) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
          <Brain className="w-8 h-8 text-indigo-400 animate-pulse" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          {isGeneratingReport
            ? 'Gemma 4 Generating Faculty Report…'
            : 'Gemma 4 Constructing Examination Plan...'}
        </h2>
        <p className="text-xs text-slate-500 max-w-md">
          {isGeneratingReport
            ? `Synthesizing ${session.turns.length} viva turns into a complete academic evaluation report for ${session.candidateName}…`
            : `Synthesizing syllabus knowledge graph, calibrating persona strategy for ${persona.name}, and framing opening viva question...`}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* Top Session Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <img
              src={persona.avatar}
              alt={persona.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500"
            />
            <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 absolute -bottom-0.5 -right-0.5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-white">{persona.name}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {persona.title}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Candidate: <span className="text-slate-200 font-semibold">{session.candidateName}</span> ({session.academicLevel})
            </div>
          </div>
        </div>

        {/* Question Counter Progress */}
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-xs font-bold text-indigo-400">
              Question {session.turns.length + 1} of {session.targetQuestionsCount}
            </div>
            <div className="text-[10px] text-slate-400">Strategy: <span className="font-semibold text-slate-200">{currentStrategy}</span></div>
          </div>

          <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
            <div
              className="bg-gradient-to-r from-indigo-500 to-teal-400 h-full transition-all duration-500"
              style={{ width: `${((session.turns.length + 1) / session.targetQuestionsCount) * 100}%` }}
            />
          </div>

          <button
            onClick={() => finishVivaSession(session)}
            disabled={isGeneratingReport}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center space-x-1.5"
          >
            {isGeneratingReport ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating Report…</span>
              </>
            ) : (
              <span>End &amp; Generate Report</span>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Viva Arena (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Examiner Question Box */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-indigo-600 uppercase tracking-wider">
                <Brain className="w-4 h-4 text-indigo-600" />
                <span>Topic: {currentTopic}</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => speakQuestion(currentQuestion)}
                  className={`p-2 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                    isSpeaking
                      ? 'bg-indigo-600 text-white animate-pulse'
                      : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                  }`}
                  title="Replay Spoken Question"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{isSpeaking ? 'Speaking...' : 'Listen'}</span>
                </button>
              </div>
            </div>

            {/* Question Text Display */}
            <div className="min-h-[100px] flex items-center">
              <p className="text-lg sm:text-xl font-bold text-slate-900 leading-relaxed tracking-tight">
                "{currentQuestion}"
              </p>
            </div>

            {/* Animated Examiner Audio Wave Visualizer */}
            <div className="flex items-center space-x-1.5 pt-2 border-t border-slate-100 text-xs text-slate-500">
              <Activity className={`w-4 h-4 ${isSpeaking ? 'text-indigo-600 animate-bounce' : 'text-slate-400'}`} />
              <span className="text-[11px] font-medium">{isSpeaking ? 'Examiner is speaking question...' : 'Waiting for candidate response...'}</span>
              
              {isSpeaking && (
                <div className="flex items-center space-x-1 ml-2">
                  <div className="w-1 h-3 bg-indigo-500 rounded-full animate-pulse" />
                  <div className="w-1 h-5 bg-indigo-600 rounded-full animate-pulse delay-75" />
                  <div className="w-1 h-2 bg-indigo-400 rounded-full animate-pulse delay-150" />
                  <div className="w-1 h-4 bg-teal-500 rounded-full animate-pulse delay-200" />
                </div>
              )}
            </div>
          </div>

          {/* Candidate Response Station */}
          <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center space-x-2">
                <Mic className="w-4 h-4 text-indigo-400" />
                <span>Candidate Viva Response Station</span>
              </div>

              {/* Mic Toggle Button */}
              <button
                onClick={toggleMic}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
                    : 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/50'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isListening ? 'Stop Mic Recording' : 'Start Voice Input'}</span>
              </button>
            </div>

            {/* Voice Input Live Wave Banner */}
            {isListening && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between text-xs text-red-300">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="font-semibold">Microphone Live — Speak your answer clearly...</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-1 h-4 bg-red-500 animate-bounce" />
                  <div className="w-1 h-6 bg-red-400 animate-bounce delay-100" />
                  <div className="w-1 h-3 bg-red-300 animate-bounce delay-200" />
                </div>
              </div>
            )}

            {/* Response Textarea */}
            <textarea
              rows={5}
              value={candidateAnswer}
              onChange={(e) => setCandidateAnswer(e.target.value)}
              disabled={isEvaluating}
              placeholder="Speak via microphone above or type your oral response here in detail..."
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed resize-none"
            />

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleRequestHint}
                disabled={isEvaluating}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 flex items-center space-x-1.5 disabled:opacity-50"
              >
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>Request Scaffolding Hint</span>
              </button>

              <button
                onClick={handleSubmitAnswer}
                disabled={isEvaluating || !candidateAnswer.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-teal-500 hover:from-indigo-500 hover:to-teal-400 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/30 flex items-center space-x-2 disabled:opacity-50 transition-all"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Gemma 4 Evaluating Response...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Viva Response</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Gemma Real-Time Thinking & Live AI Analysis Panel */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-slate-100 rounded-2xl border border-indigo-500/30 shadow-2xl p-6 space-y-5 sticky top-20">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Brain className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Live AI Analysis Panel</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                Gemma 4 Live
              </span>
            </div>

            {/* Current Viva Parameters */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block font-mono uppercase">Current Topic</span>
                <span className="font-bold text-indigo-300 text-[11px] truncate block">
                  {currentTopic || 'Foundational Principles'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block font-mono uppercase">Adaptive Strategy</span>
                <span className="font-bold text-teal-400 text-[11px] truncate block">
                  {currentStrategy || 'DEPTH_PROBE'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block font-mono uppercase">Coverage Progress</span>
                <span className="font-bold text-emerald-400 text-[11px]">
                  {Math.round((session.turns.length / (session.targetQuestionsCount ?? 5)) * 100)}% Complete
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block font-mono uppercase">Running Score</span>
                <span className="font-bold text-violet-400 text-[11px]">
                  {session.turns.length > 0
                    ? `${Math.round(
                        session.turns.reduce((sum, t) => {
                          const acc = (t.evaluation as any)?.conceptualAccuracy ?? 0;
                          return sum + Number(acc);
                        }, 0) / session.turns.length
                      )}%`
                    : '—'}
                </span>
              </div>
            </div>

            {/* Next Examination Goal (from evaluator) */}
            <div className="bg-indigo-950/40 p-3.5 rounded-xl border border-indigo-500/30 text-xs space-y-1">
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block font-mono">
                Next Examination Goal
              </span>
              <p className="text-indigo-200 text-[11px] font-medium leading-relaxed">
                {latestAdaptiveGoal || 'Assessing candidate core comprehension & probing for theoretical edge cases'}
              </p>
            </div>

            {/* Gemma Reasoning Trace */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
              <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider flex items-center justify-between font-mono">
                <span>Gemma 4 Reasoning Trace</span>
                <Sparkles className="w-3 h-3 text-indigo-400" />
              </div>
              <p className="text-slate-300 font-mono text-[11px] leading-relaxed italic">
                {latestTurnResult?.aiThinkingReasoning
                  ? `"${latestTurnResult.aiThinkingReasoning}"`
                  : '"Analyzing syllabus knowledge graph, formulating opening question..."'}
              </p>
            </div>

            {/* Misconception Alert */}
            {latestEval?.misconceptionDetected && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/40 rounded-xl space-y-1.5">
                <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Misconception Detected</span>
                </div>
                <p className="text-[11px] text-amber-200 leading-relaxed font-mono">
                  {latestEval.detectedMisconceptionNote || 'Candidate demonstrated a superficial or flawed assumption regarding core concepts.'}
                </p>
              </div>
            )}

            {/* Real-Time Evaluation Score Bars */}
            {latestEval && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Last Turn — Evaluation Matrix</div>

                {[
                  { label: 'Conceptual Accuracy', value: latestEval.conceptualAccuracy, color: 'bg-indigo-500', textColor: 'text-indigo-400' },
                  { label: 'Technical Rigor',      value: latestEval.technicalRigor,      color: 'bg-teal-400',   textColor: 'text-teal-400' },
                  { label: 'Depth of Explanation', value: latestEval.depthOfExplanation,  color: 'bg-emerald-400',textColor: 'text-emerald-400' },
                  { label: 'Confidence Score',     value: latestEval.confidenceScore ?? latestEval.conceptualAccuracy, color: 'bg-violet-400', textColor: 'text-violet-400' },
                ].map(({ label, value, color, textColor }) => (
                  <div key={label}>
                    <div className="flex justify-between text-[11px] font-medium text-slate-300 mb-1">
                      <span>{label}</span>
                      <span className={`font-bold ${textColor}`}>{value ?? '—'}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`${color} h-full transition-all duration-500`}
                        style={{ width: `${Math.min(100, Number(value) || 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Positive Highlights & Key Gaps */}
            {latestEval && (
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                {latestEval.positiveHighlights?.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono block">Strengths</span>
                    <ul className="space-y-1">
                      {latestEval.positiveHighlights.map((h, i) => (
                        <li key={i} className="flex items-start space-x-1.5 text-[11px] text-slate-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {latestEval.keyGaps?.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono block">Key Gaps</span>
                    <ul className="space-y-1">
                      {latestEval.keyGaps.map((g, i) => (
                        <li key={i} className="flex items-start space-x-1.5 text-[11px] text-slate-300">
                          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
};
