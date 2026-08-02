import React from 'react';
import { EvaluationReport } from '../types';
import { Award, CheckCircle2, AlertTriangle, BookOpen, Printer, Download, ArrowLeft, ShieldCheck, FileText } from 'lucide-react';

interface FacultyReportViewProps {
  report: EvaluationReport;
  onBack: () => void;
}

export const FacultyReportView: React.FC<FacultyReportViewProps> = ({
  report,
  onBack,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const gradeColors: Record<string, string> = {
    Distinction: 'bg-emerald-500 text-white border-emerald-400',
    Pass: 'bg-indigo-600 text-white border-indigo-500',
    'Conditional Pass': 'bg-amber-500 text-white border-amber-400',
    'Remediation Required': 'bg-red-600 text-white border-red-500',
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between no-print bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-lg">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center space-x-2 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official Faculty Report</span>
          </button>
        </div>
      </div>

      {/* Main Printable Document Sheet */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 sm:p-12 space-y-8 text-slate-900 print:shadow-none print:border-none print:p-0">
        
        {/* Academic Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-slate-900 pb-6 gap-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-700 font-extrabold text-xs uppercase tracking-widest mb-1">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Department of Academic Evaluation & Examination Board</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Official Viva Voce Evaluation Report
            </h1>
            <p className="text-xs text-slate-500 mt-1">Autonomous AI Intelligence Assessment System (Powered by Gemma 4)</p>
          </div>

          <div className="text-right sm:text-right font-mono text-xs text-slate-600">
            <div><span className="font-bold text-slate-800">Exam Date:</span> {report.examDate}</div>
            <div><span className="font-bold text-slate-800">Report ID:</span> {report.id}</div>
          </div>
        </div>

        {/* Candidate & Course Metadata Card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 font-medium block">Candidate Name</span>
            <span className="font-bold text-slate-900 text-sm">{report.candidateName}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block">Roll / Student ID</span>
            <span className="font-bold text-slate-900 text-sm">{report.candidateId}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block">Academic Level</span>
            <span className="font-bold text-slate-900 text-sm">{report.academicLevel}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block">Course Title</span>
            <span className="font-bold text-slate-900 text-sm line-clamp-1">{report.courseTitle}</span>
          </div>
        </div>

        {/* Score & Verdict Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 text-center sm:text-left">
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Overall Academic Score</span>
            <div className="flex items-baseline justify-center sm:justify-start space-x-2">
              <span className="text-5xl font-extrabold text-white">{report.overallScore}</span>
              <span className="text-lg font-bold text-slate-400">/ 100</span>
            </div>
            <div className="text-xs text-slate-300 max-w-md">
              Faculty Verdict: <span className="font-bold text-emerald-400">{report.facultyVerdict}</span>
            </div>
          </div>

          <div className="flex flex-col items-center sm:items-end">
            <span className="text-xs text-slate-400 font-medium mb-1">Official Evaluation Grade</span>
            <span className={`px-5 py-2.5 rounded-2xl text-sm font-extrabold border uppercase tracking-wider shadow-lg ${gradeColors[report.grade] || gradeColors['Pass']}`}>
              {report.grade}
            </span>
          </div>
        </div>

        {/* Executive Readiness Summary */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Executive Readiness Summary</span>
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed font-sans bg-slate-50/80 p-5 rounded-2xl border border-slate-200">
            {report.readinessSummary}
          </p>
        </div>

        {/* Multi-Vector Radar Competency Grid */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-2">
            <Award className="w-4 h-4 text-indigo-600" />
            <span>Competency Vector Breakdown</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-center text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-lg font-bold text-indigo-700">{report.radarMetrics?.conceptualClarity || 80}%</div>
              <div className="text-[10px] text-slate-600 uppercase font-semibold mt-0.5">Conceptual Clarity</div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-lg font-bold text-teal-700">{report.radarMetrics?.technicalRigor || 75}%</div>
              <div className="text-[10px] text-slate-600 uppercase font-semibold mt-0.5">Technical Rigor</div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-lg font-bold text-emerald-700">{report.radarMetrics?.problemSolving || 85}%</div>
              <div className="text-[10px] text-slate-600 uppercase font-semibold mt-0.5">Problem Solving</div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-lg font-bold text-amber-700">{report.radarMetrics?.misconceptionAvoidance || 90}%</div>
              <div className="text-[10px] text-slate-600 uppercase font-semibold mt-0.5">Misconception Shield</div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-lg font-bold text-indigo-800">{report.radarMetrics?.communicationFluency || 85}%</div>
              <div className="text-[10px] text-slate-600 uppercase font-semibold mt-0.5">Fluency</div>
            </div>
          </div>
        </div>

        {/* Key Strengths & Misconceptions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Key Strengths */}
          <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-3">
            <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Key Academic Strengths</span>
            </h3>
            <ul className="space-y-1.5 text-xs text-emerald-950">
              {report.keyStrengths?.map((str, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Misconceptions & Critical Gaps */}
          <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-3">
            <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Identified Misconceptions & Gaps</span>
            </h3>
            <ul className="space-y-1.5 text-xs text-amber-950">
              {report.criticalMisconceptions?.length > 0 ? (
                report.criticalMisconceptions.map((disc, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>{disc}</span>
                  </li>
                ))
              ) : (
                <li className="text-slate-500 italic">No critical misconceptions detected during viva.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Annotated Turn-by-Turn Viva Transcript */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Annotated Viva Transcript & Examiner Commentary</span>
          </h2>

          <div className="space-y-4">
            {report.annotatedTurns?.map((t, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="font-bold text-xs text-indigo-700">Question {t.turnIndex || idx + 1}</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800">
                    Score: {t.score}%
                  </span>
                </div>

                <div className="text-xs text-slate-900 font-semibold">
                  <span className="text-slate-500 font-medium">Examiner Q: </span>"{t.question}"
                </div>

                <div className="text-xs text-slate-800 bg-white p-3 rounded-xl border border-slate-200/80 font-mono">
                  <span className="font-bold text-slate-600">Candidate A: </span>"{t.answer}"
                </div>

                <div className="text-xs text-slate-600 italic bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100">
                  <span className="font-bold text-indigo-900">Faculty Analysis: </span>{t.comment}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Remediation Roadmap */}
        {report.recommendedRemediation?.length > 0 && (
          <div className="p-5 bg-indigo-50/60 rounded-2xl border border-indigo-200 space-y-2">
            <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Recommended Remedial Study Roadmap</h3>
            <ul className="space-y-1 text-xs text-indigo-950">
              {report.recommendedRemediation.map((rem, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="text-indigo-600 font-bold">{idx + 1}.</span>
                  <span>{rem}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Official Faculty Signature Block */}
        <div className="pt-8 border-t-2 border-slate-900 flex justify-between items-end text-xs text-slate-600">
          <div>
            <div className="font-bold text-slate-900 text-sm">Gemma 4 Autonomous Examination Engine</div>
            <div className="text-slate-500">Knowledge Intelligence Assessor (KIA v4.2)</div>
          </div>

          <div className="text-right space-y-1">
            <div className="w-48 border-b border-slate-900 mb-1" />
            <div className="font-bold text-slate-900">Faculty Chair Signature</div>
            <div className="text-[10px] text-slate-400">Verified Academic Record</div>
          </div>
        </div>

      </div>

    </div>
  );
};
