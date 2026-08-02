import React from 'react';
import { VivaSession, EvaluationReport } from '../types';
import { History, FileText, Calendar, User, Award, ArrowRight } from 'lucide-react';

interface PastHistoryViewProps {
  sessions: VivaSession[];
  onSelectReport: (report: EvaluationReport) => void;
  onNewViva: () => void;
}

export const PastHistoryView: React.FC<PastHistoryViewProps> = ({
  sessions,
  onSelectReport,
  onNewViva,
}) => {
  const completedSessions = sessions.filter(s => s.status === 'COMPLETED' && s.overallReport);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <History className="w-4 h-4" />
            <span>Academic History & Archive</span>
          </div>
          <h1 className="text-2xl font-bold">Past Viva Examination Records</h1>
          <p className="text-xs text-slate-300">Archive of completed candidate evaluations, transcripts, and faculty reports.</p>
        </div>

        <button
          onClick={onNewViva}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg flex items-center space-x-2 transition-all"
        >
          <span>Setup New Viva</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {completedSessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <History className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">No Archive Records Yet</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Complete an autonomous viva examination session to view faculty reports and annotated transcripts in your archive.
          </p>
          <button
            onClick={onNewViva}
            className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-all inline-block"
          >
            Launch First Viva
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {completedSessions.map((s) => {
            const report = s.overallReport!;
            return (
              <div
                key={s.id}
                onClick={() => onSelectReport(report)}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-xs text-indigo-600">{s.syllabusTitle}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-700">
                      {report.grade}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs">
                      {s.candidateName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900">{s.candidateName}</div>
                      <div className="text-[11px] text-slate-500">ID: {s.candidateId} • {s.academicLevel}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1 text-slate-600">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-900">{report.overallScore} / 100</span>
                  </div>

                  <span className="text-indigo-600 font-bold flex items-center space-x-1">
                    <span>View Faculty Report</span>
                    <FileText className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
