import React, { useState } from 'react';
import { SyllabusData, ExaminerPersona, ExaminerPersonaId, AcademicLevel, VivaSession } from '../types';
import { EXAMINER_PERSONAS } from '../data/presets';
import { User, GraduationCap, Volume2, Mic, Play, Sparkles, CheckCircle2, Sliders, Shield } from 'lucide-react';

interface VivaSetupProps {
  syllabus: SyllabusData;
  onStartSession: (session: VivaSession) => void;
  onBackToSyllabus: () => void;
}

export const VivaSetup: React.FC<VivaSetupProps> = ({
  syllabus,
  onStartSession,
  onBackToSyllabus,
}) => {
  const [candidateName, setCandidateName] = useState('Alex Rivera');
  const [candidateId, setCandidateId] = useState('STUDENT-8842');
  const [academicLevel, setAcademicLevel] = useState<AcademicLevel>('Graduate');
  const [selectedPersonaId, setSelectedPersonaId] = useState<ExaminerPersonaId>('rigorous');
  const [questionsCount, setQuestionsCount] = useState<number>(5);
  const [enableAudioPlayback, setEnableAudioPlayback] = useState<boolean>(true);
  const [enableSpeechInput, setEnableSpeechInput] = useState<boolean>(true);

  const selectedPersona = EXAMINER_PERSONAS.find(p => p.id === selectedPersonaId) || EXAMINER_PERSONAS[0];

  const handleLaunchViva = () => {
    const newSession: VivaSession = {
      id: `session-${Date.now()}`,
      candidateName: candidateName || 'Candidate',
      candidateId: candidateId || 'STU-001',
      academicLevel,
      syllabusId: syllabus.id,
      syllabusTitle: syllabus.title,
      personaId: selectedPersonaId,
      status: 'IN_PROGRESS',
      startTime: new Date().toLocaleTimeString(),
      targetQuestionsCount: questionsCount,
      currentTurnIndex: 1,
      turns: [],
    };

    onStartSession(newSession);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-2">
        <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Stage 2: Examination Configuration</span>
        </div>
        <h1 className="text-2xl font-bold">Configure Autonomous Viva Examination</h1>
        <p className="text-xs text-slate-300">
          Target Course: <span className="font-semibold text-white">{syllabus.title} ({syllabus.code})</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Candidate & Exam Settings */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Candidate Profile Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3">
              <User className="w-4 h-4 text-indigo-600" />
              <span>Candidate Information</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Candidate Full Name *</label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="e.g. Elena Rostova"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Student Roll / ID No *</label>
                <input
                  type="text"
                  value={candidateId}
                  onChange={(e) => setCandidateId(e.target.value)}
                  placeholder="e.g. CS-2026-901"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Level (Calibrates Gemma Evaluation Matrix)</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['Undergraduate', 'Graduate', 'PhD Candidate', 'Professional Certification'] as AcademicLevel[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setAcademicLevel(level)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border text-center ${
                      academicLevel === level
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Examiner Persona Selection Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <span>Select AI Examiner Persona</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {EXAMINER_PERSONAS.map((p) => {
                const isSelected = selectedPersonaId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPersonaId(p.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-900 text-white border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg'
                        : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-3 mb-3">
                        <img
                          src={p.avatar}
                          alt={p.name}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-500/50"
                        />
                        <div>
                          <div className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-slate-900'}`}>{p.name}</div>
                          <div className={`text-[11px] ${isSelected ? 'text-indigo-300' : 'text-indigo-600 font-medium'}`}>{p.title}</div>
                        </div>
                      </div>
                      <p className={`text-xs leading-relaxed mb-2 ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>{p.description}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/20 text-[10px] font-semibold tracking-wide flex items-center justify-between">
                      <span className={isSelected ? 'text-slate-400' : 'text-slate-500'}>Style: {p.style.slice(0, 45)}...</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-1" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: Parameters & Launch Button */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 sticky top-20">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>Viva Parameters</span>
            </h2>

            {/* Target Questions Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                <span>Target Viva Questions</span>
                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">{questionsCount} Questions</span>
              </div>
              <input
                type="range"
                min={3}
                max={10}
                value={questionsCount}
                onChange={(e) => setQuestionsCount(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>3 (Short Viva)</span>
                <span>5 (Standard)</span>
                <span>10 (Comprehensive)</span>
              </div>
            </div>

            {/* Audio Controls Toggle */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-slate-50">
                <div className="flex items-center space-x-2.5">
                  <Volume2 className="w-4 h-4 text-indigo-600" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Spoken Audio Output</div>
                    <div className="text-[10px] text-slate-500">AI Examiner speaks questions aloud</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableAudioPlayback}
                  onChange={(e) => setEnableAudioPlayback(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-slate-50">
                <div className="flex items-center space-x-2.5">
                  <Mic className="w-4 h-4 text-indigo-600" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Voice Speech Input</div>
                    <div className="text-[10px] text-slate-500">Candidate can speak answer via microphone</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableSpeechInput}
                  onChange={(e) => setEnableSpeechInput(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
              </label>
            </div>

            {/* Examiner Summary Card */}
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2 border border-slate-800">
              <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Active Examiner</div>
              <div className="text-sm font-bold">{selectedPersona.name}</div>
              <p className="text-xs text-slate-300 leading-relaxed">{selectedPersona.style}</p>
            </div>

            {/* Launch Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleLaunchViva}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Launch Live Autonomous Viva</span>
              </button>

              <button
                onClick={onBackToSyllabus}
                className="w-full py-2 bg-slate-100 text-slate-700 font-medium rounded-xl text-xs hover:bg-slate-200 transition-all text-center"
              >
                Back to Syllabus & Knowledge Base
              </button>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
