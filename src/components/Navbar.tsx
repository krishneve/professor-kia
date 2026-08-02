import React from 'react';
import { Brain, GraduationCap, PlayCircle, FileText, History, Sparkles, Volume2, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  activeTab: 'syllabus' | 'setup' | 'live' | 'report' | 'history';
  setActiveTab: (tab: 'syllabus' | 'setup' | 'live' | 'report' | 'history') => void;
  hasActiveSession: boolean;
  hasReport: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  hasActiveSession,
  hasReport,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-slate-100 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Platform Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('syllabus')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-teal-400 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Brain className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                  KIA
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-indigo-400" /> Gemma 4 Autonomous
                </span>
              </div>
              <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">Knowledge Intelligence Assessor</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('syllabus')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === 'syllabus'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Syllabus & KB</span>
            </button>

            <button
              onClick={() => setActiveTab('setup')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === 'setup'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <PlayCircle className="w-4 h-4" />
              <span>Setup Viva</span>
            </button>

            <button
              onClick={() => setActiveTab('live')}
              disabled={!hasActiveSession && activeTab !== 'live'}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 relative ${
                activeTab === 'live'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-sm'
                  : hasActiveSession
                  ? 'text-slate-200 hover:bg-slate-800/60'
                  : 'text-slate-600 cursor-not-allowed opacity-60'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              <span>Live Stage</span>
              {hasActiveSession && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('report')}
              disabled={!hasReport && activeTab !== 'report'}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === 'report'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : hasReport
                  ? 'text-slate-200 hover:bg-slate-800/60'
                  : 'text-slate-600 cursor-not-allowed opacity-60'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden md:inline">Faculty Report</span>
              <span className="md:hidden">Report</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === 'history'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Past History</span>
            </button>
          </nav>

          {/* Academic Status Badge */}
          <div className="hidden lg:flex items-center space-x-2 text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Autonomous AI Examiner Active</span>
          </div>

        </div>
      </div>
    </header>
  );
};
