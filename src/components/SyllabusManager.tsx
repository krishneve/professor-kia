import React, { useState } from 'react';
import { SyllabusData, ConceptNode, MisconceptionItem } from '../types';
import { DEMO_SYLLABI } from '../data/presets';
import { BookOpen, Upload, Sparkles, Layers, AlertTriangle, HelpCircle, CheckCircle2, ArrowRight, FileText, Loader2, Network } from 'lucide-react';

interface SyllabusManagerProps {
  selectedSyllabus: SyllabusData;
  onSelectSyllabus: (syllabus: SyllabusData) => void;
  onProceedToSetup: () => void;
}

export const SyllabusManager: React.FC<SyllabusManagerProps> = ({
  selectedSyllabus,
  onSelectSyllabus,
  onProceedToSetup,
}) => {
  const [isCustomUploadOpen, setIsCustomUploadOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [customText, setCustomText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'concepts' | 'misconceptions' | 'questions'>('concepts');

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;

    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/syllabus/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: customTitle || 'Custom Uploaded Course',
          code: customCode || 'CUSTOM-101',
          domain: customDomain || 'Academic Curriculum',
          rawText: customText,
        }),
      });

      if (!res.ok) throw new Error('Syllabus analysis failed');

      const analyzedSyllabus: SyllabusData = await res.json();
      onSelectSyllabus(analyzedSyllabus);
      setIsCustomUploadOpen(false);
      setCustomTitle('');
      setCustomText('');
    } catch (err: any) {
      alert('Analysis error: ' + (err.message || 'Server error'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const taxonomyColors: Record<string, string> = {
    Remembering: 'bg-slate-100 text-slate-800 border-slate-200',
    Understanding: 'bg-blue-50 text-blue-800 border-blue-200',
    Applying: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    Analyzing: 'bg-amber-50 text-amber-800 border-amber-200',
    Evaluating: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Autonomous Examination Planning</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Knowledge Intelligence Base & Syllabus Intelligence
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Select a verified academic syllabus dataset below or upload raw lecture notes/course material. Gemma 4 extracts the cognitive taxonomy matrix, maps conceptual dependencies, identifies misconception vectors, and constructs the examiner’s dynamic questioning plan.
          </p>
        </div>
      </div>

      {/* Course Presets & Custom Upload Buttons */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <span>Select Course Knowledge Base</span>
          </h2>
          <button
            onClick={() => setIsCustomUploadOpen(!isCustomUploadOpen)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium transition-all shadow-md flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>{isCustomUploadOpen ? 'Close Custom Upload' : 'Upload Custom Syllabus / PDF Notes'}</span>
          </button>
        </div>

        {/* Custom Upload Panel */}
        {isCustomUploadOpen && (
          <form onSubmit={handleCustomSubmit} className="mb-8 p-6 bg-slate-900 text-slate-100 rounded-2xl border border-indigo-500/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-indigo-300 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Upload & Gemma AI Deep Syllabus Extraction</span>
              </h3>
              <span className="text-xs text-slate-400">Processes text, lecture notes, textbook outlines</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Course Title</label>
                <input
                  type="text"
                  placeholder="e.g. Advanced Quantum Field Theory"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Course Code</label>
                <input
                  type="text"
                  placeholder="e.g. PHYS-801"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Academic Domain</label>
                <input
                  type="text"
                  placeholder="e.g. Theoretical Physics"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Syllabus Text / Lecture Outline / Exam Objectives *</label>
              <textarea
                rows={5}
                required
                placeholder="Paste course syllabus modules, lecture notes, key theorems, or examination objectives here..."
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCustomUploadOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAnalyzing || !customText.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center space-x-2 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Gemma 4 Extracting Knowledge Graph...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analyze & Build Knowledge Base</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Demo Presets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DEMO_SYLLABI.map((s) => {
            const isSelected = selectedSyllabus.id === s.id;
            return (
              <div
                key={s.id}
                onClick={() => onSelectSyllabus(s)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-900 text-white border-indigo-500 shadow-xl ring-2 ring-indigo-500/30'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isSelected ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {s.code}
                    </span>
                    {isSelected && (
                      <span className="flex items-center space-x-1 text-[11px] font-semibold text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active Base</span>
                      </span>
                    )}
                  </div>
                  <h3 className={`font-bold text-base mb-1 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {s.title}
                  </h3>
                  <p className={`text-xs line-clamp-2 mb-3 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    {s.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100/10 flex items-center justify-between text-[11px]">
                  <span className={isSelected ? 'text-slate-400' : 'text-slate-500'}>{s.concepts.length} Key Concepts</span>
                  <span className={isSelected ? 'text-slate-400' : 'text-slate-500'}>{s.misconceptions.length} Misconception Traps</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Syllabus Breakdown View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 space-y-6">
        
        {/* Course Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {selectedSyllabus.code}
              </span>
              <span className="text-xs font-medium text-slate-500">{selectedSyllabus.domain}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{selectedSyllabus.title}</h2>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">{selectedSyllabus.description}</p>
          </div>

          <button
            onClick={onProceedToSetup}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold rounded-xl text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5"
          >
            <span>Proceed to Examination Setup</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Cognitive Taxonomy Distribution */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Bloom's Taxonomy Distribution (Gemma Cognitive Breakdown)</span>
          </h3>
          <div className="grid grid-cols-5 gap-2 text-center text-xs font-medium">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-lg font-bold text-slate-800">{selectedSyllabus.cognitiveDistribution?.remembering || 15}%</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-tight font-semibold mt-0.5">Remembering</div>
            </div>
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
              <div className="text-lg font-bold text-blue-800">{selectedSyllabus.cognitiveDistribution?.understanding || 25}%</div>
              <div className="text-[10px] text-blue-700 uppercase tracking-tight font-semibold mt-0.5">Understanding</div>
            </div>
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
              <div className="text-lg font-bold text-emerald-800">{selectedSyllabus.cognitiveDistribution?.applying || 30}%</div>
              <div className="text-[10px] text-emerald-700 uppercase tracking-tight font-semibold mt-0.5">Applying</div>
            </div>
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
              <div className="text-lg font-bold text-amber-800">{selectedSyllabus.cognitiveDistribution?.analyzing || 20}%</div>
              <div className="text-[10px] text-amber-700 uppercase tracking-tight font-semibold mt-0.5">Analyzing</div>
            </div>
            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200">
              <div className="text-lg font-bold text-indigo-800">{selectedSyllabus.cognitiveDistribution?.evaluating || 10}%</div>
              <div className="text-[10px] text-indigo-700 uppercase tracking-tight font-semibold mt-0.5">Evaluating</div>
            </div>
          </div>
        </div>

        {/* Tab switcher for Concepts vs Misconceptions vs Question Scaffolds */}
        <div>
          <div className="flex border-b border-slate-200 space-x-6 mb-4">
            <button
              onClick={() => setActiveTab('concepts')}
              className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 ${
                activeTab === 'concepts'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Network className="w-4 h-4" />
              <span>Core Concept Nodes ({selectedSyllabus.concepts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('misconceptions')}
              className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 ${
                activeTab === 'misconceptions'
                  ? 'border-amber-600 text-amber-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Misconception Vector Traps ({selectedSyllabus.misconceptions.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 ${
                activeTab === 'questions'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Initial Question Scaffolds ({selectedSyllabus.suggestedQuestions.length})</span>
            </button>
          </div>

          {/* Concepts Tab Content */}
          {activeTab === 'concepts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedSyllabus.concepts.map((c) => (
                <div key={c.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-slate-900">{c.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${taxonomyColors[c.taxonomyLevel] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                      {c.taxonomyLevel}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mb-1">Category: <span className="font-medium text-slate-700">{c.category}</span></div>
                  <p className="text-xs text-slate-600 leading-relaxed">{c.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Misconceptions Tab Content */}
          {activeTab === 'misconceptions' && (
            <div className="space-y-3">
              {selectedSyllabus.misconceptions.map((m) => (
                <div key={m.id} className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>{m.concept}</span>
                    </span>
                    <span className="text-[10px] font-bold text-amber-800 uppercase bg-amber-100 px-2 py-0.5 rounded">
                      Gemma Detection Trap
                    </span>
                  </div>
                  <div className="text-xs text-red-900 bg-red-50 p-2.5 rounded-lg border border-red-200/60 font-mono">
                    <span className="font-bold text-red-700">Flawed Belief: </span>"{m.flawedBelief}"
                  </div>
                  <div className="text-xs text-emerald-900 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200/60 font-mono">
                    <span className="font-bold text-emerald-700">Rigorous Understanding: </span>"{m.correctUnderstanding}"
                  </div>
                  <div className="text-xs text-slate-700 italic pt-1">
                    <span className="font-semibold text-slate-900">Examiner Probing Question: </span>"{m.probingQuestion}"
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Questions Tab Content */}
          {activeTab === 'questions' && (
            <div className="space-y-2">
              {selectedSyllabus.suggestedQuestions.map((q, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 flex items-start space-x-3">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    Q{idx + 1}
                  </span>
                  <p className="font-medium text-slate-800 leading-relaxed">{q}</p>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
