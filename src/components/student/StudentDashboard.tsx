import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ClassModel, SubjectModel, VivaSessionModel, ReportModel, VivaSession, SyllabusData, EvaluationReport } from '../../types';
import { JoinClassModal } from '../common/JoinClassModal';
import { SubjectWorkspace } from '../teacher/SubjectWorkspace';
import { LiveVivaStage } from '../LiveVivaStage';
import { FacultyReportView } from '../FacultyReportView';
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  FileText,
  User,
  Plus,
  GraduationCap,
  Sparkles,
  Users,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ChevronRight,
  Award,
  AlertCircle,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'subjects' | 'viva' | 'reports' | 'profile'>('dashboard');

  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [subjects, setSubjects] = useState<SubjectModel[]>([]);
  const [vivaSessions, setVivaSessions] = useState<VivaSessionModel[]>([]);
  const [reports, setReports] = useState<ReportModel[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectModel | null>(null);
  const [loading, setLoading] = useState(true);

  // Active Viva & Setup States
  const [selectedVivaForSetup, setSelectedVivaForSetup] = useState<VivaSessionModel | null>(null);
  const [activeVivaSession, setActiveVivaSession] = useState<VivaSession | null>(null);
  const [activeVivaModel, setActiveVivaModel] = useState<VivaSessionModel | null>(null);
  const [activeSyllabus, setActiveSyllabus] = useState<SyllabusData | null>(null);
  const [syllabusLoading, setSyllabusLoading] = useState(false);
  const [selectedReportView, setSelectedReportView] = useState<EvaluationReport | null>(null);

  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  const handleOpenVivaSetup = async (viva: VivaSessionModel) => {
    const storageKey = `kia_active_viva_${viva.id}_${user?.id}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed: VivaSession = JSON.parse(saved);
        // Fetch syllabus so resumed session is also grounded in real material
        let resumedSyllabus: SyllabusData | null = null;
        try {
          const res = await fetch(`/api/subjects/${viva.subject_id}/syllabus`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) resumedSyllabus = await res.json();
        } catch (_) {}
        if (!resumedSyllabus) {
          resumedSyllabus = {
            id: viva.subject_id,
            title: viva.subject_name || viva.title,
            code: 'COURSE-101',
            domain: 'Academic Curriculum',
            description: 'Oral examination based on subject curriculum.',
            concepts: [],
            misconceptions: [],
          };
        }
        setActiveSyllabus(resumedSyllabus);
        setActiveVivaModel(viva);
        setActiveVivaSession(parsed);
        return;
      } catch (e) {
        console.error('Error parsing stored session:', e);
      }
    }
    setSelectedVivaForSetup(viva);
  };

  const handleStartViva = async () => {
    if (!selectedVivaForSetup) return;

    setSyllabusLoading(true);

    // Fetch real AI-analyzed syllabus grounded in uploaded study material
    let resolvedSyllabus: SyllabusData | null = null;
    try {
      const res = await fetch(`/api/subjects/${selectedVivaForSetup.subject_id}/syllabus`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        resolvedSyllabus = await res.json();
      } else {
        console.warn('Syllabus fetch failed, using subject title fallback:', await res.text());
      }
    } catch (err) {
      console.warn('Syllabus fetch error, using fallback:', err);
    }

    // Fallback: minimal syllabus using subject name so viva can still run
    if (!resolvedSyllabus) {
      resolvedSyllabus = {
        id: selectedVivaForSetup.subject_id,
        title: selectedVivaForSetup.subject_name || selectedVivaForSetup.title,
        code: 'COURSE-101',
        domain: 'Academic Curriculum',
        description: 'Oral examination based on subject curriculum.',
        concepts: [],
        misconceptions: [],
      };
    }

    setSyllabusLoading(false);

    const storageKey = `kia_active_viva_${selectedVivaForSetup.id}_${user?.id}`;
    const initialSession: VivaSession = {
      id: selectedVivaForSetup.id,
      syllabusId: selectedVivaForSetup.subject_id,
      syllabusTitle: selectedVivaForSetup.subject_name || selectedVivaForSetup.title,
      candidateName: user?.full_name || 'Alex Rivera',
      candidateId: user?.id || 'STU-001',
      academicLevel: 'Undergraduate',
      personaId: 'socratic',
      status: 'IN_PROGRESS',
      turns: [],
      targetQuestionsCount: 5,
      currentTurnIndex: 1,
      startedAt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey, JSON.stringify(initialSession));
    setActiveSyllabus(resolvedSyllabus);
    setActiveVivaModel(selectedVivaForSetup);
    setActiveVivaSession(initialSession);
    setSelectedVivaForSetup(null);
  };

  const handleUpdateVivaSession = (updated: VivaSession) => {
    setActiveVivaSession(updated);
    if (activeVivaModel) {
      const storageKey = `kia_active_viva_${activeVivaModel.id}_${user?.id}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }
  };

  const handleCompleteVivaSession = async (completedSession: VivaSession) => {
    if (activeVivaModel) {
      localStorage.removeItem(`kia_active_viva_${activeVivaModel.id}_${user?.id}`);
    }

    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          student_id: user?.id,
          student_name: user?.full_name,
          viva_session_id: activeVivaModel?.id || 'viva-1',
          viva_title: activeVivaModel?.title || completedSession.syllabusTitle,
          score: completedSession.overallReport?.overallScore || 85,
          report_json: completedSession.overallReport,
        }),
      });

      if (activeVivaModel) {
        await fetch(`/api/viva-sessions/${activeVivaModel.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: 'completed' }),
        });
      }
    } catch (err) {
      console.error('Error persisting viva report:', err);
    }

    fetchData();
    const repToView = completedSession.overallReport || null;
    setActiveVivaSession(null);
    setActiveVivaModel(null);
    setSelectedReportView(repToView);
  };

  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      const [resClasses, resSubjects, resViva, resReports] = await Promise.all([
        fetch('/api/classes', { headers }),
        fetch('/api/subjects', { headers }),
        fetch('/api/viva-sessions', { headers }),
        fetch('/api/reports', { headers }),
      ]);

      if (resClasses.ok) setClasses(await resClasses.json());
      if (resSubjects.ok) setSubjects(await resSubjects.json());
      if (resViva.ok) setVivaSessions(await resViva.json());
      if (resReports.ok) setReports(await resReports.json());
    } catch (err) {
      console.error('Error fetching student data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const completedVivas = vivaSessions.filter((v) => v.status === 'completed');
  const upcomingVivas = vivaSessions.filter((v) => v.status === 'scheduled');

  return (
    <div className="flex min-h-[calc(100vh-65px)] bg-zinc-950 text-zinc-100">
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800/80 bg-zinc-950 p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div className="px-3 py-2 bg-zinc-900/60 rounded-xl border border-zinc-800 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 text-violet-400 flex items-center justify-center font-bold text-sm">
              {user?.full_name?.charAt(0)}
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-200 truncate">{user?.full_name}</div>
              <div className="text-[10px] text-violet-400 font-mono">Student Candidate</div>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'subjects', label: 'My Subjects', icon: BookOpen, badge: subjects.length },
              { id: 'viva', label: 'Viva Sessions', icon: Calendar, badge: vivaSessions.length },
              { id: 'reports', label: 'Previous Reports', icon: FileText, badge: reports.length },
              { id: 'profile', label: 'My Profile', icon: User },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                    active
                      ? 'bg-violet-600/15 text-violet-300 border border-violet-500/30'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 ${active ? 'text-violet-400' : 'text-zinc-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                        active ? 'bg-violet-500/20 text-violet-300' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick Join Card */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-violet-900/30 to-indigo-900/20 border border-violet-500/20 text-xs space-y-2">
          <div className="flex items-center justify-between text-violet-300 font-semibold">
            <span>Enrolled Classes</span>
            <span className="text-[10px] bg-violet-500/20 px-2 py-0.5 rounded text-violet-200 font-mono">
              {classes.length} Joined
            </span>
          </div>
          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="w-full py-2 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 transition shadow-md shadow-violet-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Join Class by Code</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        {selectedReportView ? (
          <FacultyReportView
            report={selectedReportView}
            onBack={() => setSelectedReportView(null)}
          />
        ) : activeVivaSession && activeSyllabus ? (
          <LiveVivaStage
            session={activeVivaSession}
            syllabus={activeSyllabus}
            onUpdateSession={handleUpdateVivaSession}
            onCompleteSession={handleCompleteVivaSession}
          />
        ) : selectedVivaForSetup ? (
          <div className="max-w-4xl mx-auto space-y-6 py-4">
            {/* Header */}
            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-300 border border-violet-500/20 uppercase tracking-wider font-mono">
                    Oral Viva Examination Instructions
                  </span>
                  <h1 className="text-2xl font-extrabold text-white mt-2">{selectedVivaForSetup.title}</h1>
                  <p className="text-xs text-zinc-400 mt-1">{selectedVivaForSetup.subject_name}</p>
                </div>
                <div className="p-3 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400">
                  <Sparkles className="w-8 h-8 text-violet-400" />
                </div>
              </div>

              {/* Assessment Parameter Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase block">Estimated Duration</span>
                  <span className="text-xs font-bold text-zinc-200">15 - 20 Minutes</span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase block">Target Questions</span>
                  <span className="text-xs font-bold text-violet-400">5 Adaptive Questions</span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase block">Difficulty Mode</span>
                  <span className="text-xs font-bold text-amber-400">Adaptive Socratic</span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase block">Examiner Engine</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">Gemma 4 Real-Time</span>
                </div>
              </div>
            </div>

            {/* Examination Guidelines */}
            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4 shadow-xl">
              <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider font-mono flex items-center space-x-2">
                <GraduationCap className="w-4 h-4 text-violet-400" />
                <span>Student viva guidelines & instructions</span>
              </h2>

              <ul className="space-y-3 text-xs text-zinc-300 leading-relaxed">
                <li className="flex items-start space-x-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800/60">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Microphone & Speech:</strong> Enable your microphone for spoken responses or type directly in the response station.
                  </span>
                </li>

                <li className="flex items-start space-x-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800/60">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Socratic Depth Probing:</strong> Gemma 4 adaptively evaluates your conceptual accuracy, technical rigor, and depth. Providing thorough explanations will trigger higher-order probing.
                  </span>
                </li>

                <li className="flex items-start space-x-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800/60">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Scaffolding Support:</strong> If stuck on a complex theoretical concept, click "Request Scaffolding Hint" to receive structured clues.
                  </span>
                </li>

                <li className="flex items-start space-x-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800/60">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Official Evaluation Report:</strong> Upon session completion, a complete Professor Evaluation Report with competency matrices will be generated and filed in your student records.
                  </span>
                </li>
              </ul>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                <button
                  onClick={() => setSelectedVivaForSetup(null)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
                >
                  Back to Dashboard
                </button>

                <button
                  onClick={handleStartViva}
                  disabled={syllabusLoading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs shadow-lg shadow-violet-600/30 flex items-center space-x-2 transition"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{syllabusLoading ? 'Analyzing Study Material…' : 'Start Live Viva Assessment'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : selectedSubject ? (
          <SubjectWorkspace
            subject={selectedSubject}
            token={token || ''}
            onBack={() => setSelectedSubject(null)}
          />
        ) : (
          <>
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 max-w-7xl">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Student Academic Dashboard</h1>
                <p className="text-xs text-zinc-400 mt-1">
                  Track enrolled curriculum, prepare for upcoming viva examinations, and view faculty evaluation reports.
                </p>
              </div>

              <button
                onClick={() => setIsJoinModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center space-x-2 transition shadow-lg shadow-violet-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Join Class with Code</span>
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                  <span>Current Semester</span>
                  <GraduationCap className="w-4 h-4 text-violet-400" />
                </div>
                <div className="text-2xl font-bold text-white tracking-tight">Semester 6</div>
                <div className="text-[11px] text-zinc-500">Academic Year 2026-2027</div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                  <span>Joined Classes</span>
                  <Users className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-3xl font-bold text-white tracking-tight">{classes.length}</div>
                <div className="text-[11px] text-emerald-400 font-medium">Active Cohorts</div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                  <span>Upcoming Vivas</span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-bold text-white tracking-tight">{upcomingVivas.length}</div>
                <div className="text-[11px] text-amber-400">Scheduled Oral Assessments</div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                  <span>Completed Vivas</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold text-white tracking-tight">{completedVivas.length}</div>
                <div className="text-[11px] text-zinc-500">Reports Evaluated</div>
              </div>
            </div>

            {/* Enrolled Classes Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-200">Enrolled Classes & Subjects</h2>
                <button
                  onClick={() => setActiveTab('subjects')}
                  className="text-xs text-violet-400 hover:underline flex items-center space-x-1"
                >
                  <span>View All Subjects</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {classes.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-zinc-800 text-center space-y-3">
                  <BookOpen className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-xs text-zinc-400">You haven't joined any classes yet.</p>
                  <button
                    onClick={() => setIsJoinModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold"
                  >
                    Enter Class Code
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {classes.map((cls) => (
                    <div key={cls.id} className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                            Code: {cls.class_code}
                          </span>
                          <h3 className="text-sm font-bold text-white mt-1.5">{cls.class_name}</h3>
                          <p className="text-xs text-zinc-400 mt-0.5">{cls.department} • {cls.semester}</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-zinc-800/60 text-xs text-zinc-400 flex items-center justify-between">
                        <span>Faculty: {cls.teacher_name || 'Prof. Sarah Jenkins'}</span>
                        <span className="text-[10px] text-emerald-400 font-mono">Enrolled</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Vivas Timeline */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-200 flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-violet-400" />
                <span>Upcoming Viva Schedule</span>
              </h2>

              <div className="space-y-3">
                {vivaSessions.map((viva) => (
                  <div key={viva.id} className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-zinc-100">{viva.title}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">{viva.subject_name} • <span className="font-mono text-violet-300">{new Date(viva.scheduled_date).toLocaleDateString()}</span></div>
                    </div>
                    <div>
                      {viva.status === 'completed' ? (
                        <button
                          onClick={() => {
                            const foundRep = reports.find((r) => r.viva_session_id === viva.id || r.viva_title === viva.title);
                            if (foundRep) setSelectedReportView(foundRep.report_json as any);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center space-x-1.5 transition"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Report</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenVivaSetup(viva)}
                          className="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/20 flex items-center space-x-1.5 transition"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Start Viva</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: MY SUBJECTS */}
        {activeTab === 'subjects' && (
          <div className="space-y-6 max-w-7xl">
            <div>
              <h1 className="text-xl font-bold text-white">My Academic Subjects</h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Curriculum overview and upcoming viva assessments for your enrolled subjects.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((subj) => (
                <div key={subj.id} className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-semibold">
                    {subj.subject_code}
                  </span>
                  <h3 className="text-sm font-bold text-white">{subj.subject_name}</h3>
                  <p className="text-xs text-zinc-400">{subj.class_name}</p>

                  <div className="pt-3 border-t border-zinc-800 text-xs text-zinc-500 flex items-center justify-between">
                    <span>Faculty: {subj.teacher_name || 'Prof. Sarah Jenkins'}</span>
                    <button
                      onClick={() => setSelectedSubject(subj)}
                      className="px-2.5 py-1 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 text-[11px] font-semibold flex items-center space-x-1"
                    >
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>Knowledge Base</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: VIVA SESSIONS */}
        {activeTab === 'viva' && (
          <div className="space-y-6 max-w-7xl">
            <div>
              <h1 className="text-xl font-bold text-white">Viva Examination Schedule</h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                View scheduled oral viva examinations and past completed assessments.
              </p>
            </div>

            <div className="space-y-3">
              {vivaSessions.map((viva) => (
                <div key={viva.id} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white">{viva.title}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${
                          viva.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-violet-500/10 text-violet-300 border border-violet-500/20'
                        }`}
                      >
                        {viva.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">{viva.subject_name} • <span className="font-mono">{new Date(viva.scheduled_date).toLocaleString()}</span></p>
                  </div>

                  <div>
                    {viva.status === 'completed' ? (
                      <button
                        onClick={() => {
                          const foundRep = reports.find((r) => r.viva_session_id === viva.id || r.viva_title === viva.title);
                          if (foundRep) setSelectedReportView(foundRep.report_json as any);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center space-x-1.5 transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View AI Report</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenVivaSetup(viva)}
                        className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 flex items-center space-x-2 transition"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Start Viva Assessment</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: PREVIOUS REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-6 max-w-7xl">
            <div>
              <h1 className="text-xl font-bold text-white">My Viva Evaluation Reports</h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Access faculty evaluation scorecards, grades, and conceptual feedback.
              </p>
            </div>

            {reports.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 space-y-3">
                <FileText className="w-10 h-10 text-zinc-600 mx-auto" />
                <div className="text-sm font-semibold text-zinc-300">No Viva Evaluation Reports Yet</div>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  When you complete an oral viva examination, your comprehensive Professor Evaluation Report with competency radar and feedback will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((rep) => (
                  <div key={rep.id} className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                          Score: {rep.score}/100
                        </span>
                        <h3 className="text-sm font-bold text-white mt-1.5">{rep.viva_title}</h3>
                      </div>
                      <button
                        onClick={() => setSelectedReportView(rep.report_json as any)}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-md shadow-indigo-600/20"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Official AI Report</span>
                      </button>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                      <span className="font-semibold text-zinc-200 block mb-1">Feedback Summary:</span>
                      {rep.report_json?.readinessSummary || 'Demonstrated solid grasp of core concepts with high analytical accuracy.'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: PROFILE */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h1 className="text-xl font-bold text-white">Student Profile</h1>
              <p className="text-xs text-zinc-400 mt-0.5">Your candidate profile and enrollment details.</p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 font-bold text-lg flex items-center justify-center">
                  {user?.full_name?.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{user?.full_name}</div>
                  <div className="text-xs text-zinc-400">{user?.email}</div>
                  <div className="text-[10px] text-violet-400 uppercase tracking-widest font-mono mt-0.5">
                    Role: {user?.role}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </>
        )}

      </main>

      {/* JOIN CLASS MODAL */}
      <JoinClassModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onSuccess={() => fetchData()}
      />
    </div>
  );
};
