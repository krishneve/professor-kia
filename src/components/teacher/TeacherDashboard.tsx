import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ClassModel, SubjectModel, VivaSessionModel, ReportModel } from '../../types';
import { SubjectWorkspace } from './SubjectWorkspace';
import { FacultyReportView } from '../FacultyReportView';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  FileText,
  Settings,
  Plus,
  Copy,
  Check,
  Trash2,
  Edit,
  Upload,
  AlertCircle,
  GraduationCap,
  Sparkles,
  ArrowUpRight,
  UserCheck,
  Search,
  ChevronRight,
  Lock,
} from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'classes' | 'subjects' | 'viva' | 'reports' | 'settings'>('dashboard');

  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [subjects, setSubjects] = useState<SubjectModel[]>([]);
  const [vivaSessions, setVivaSessions] = useState<VivaSessionModel[]>([]);
  const [reports, setReports] = useState<ReportModel[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectModel | null>(null);
  const [selectedReportToView, setSelectedReportToView] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [showScheduleViva, setShowScheduleViva] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState<string | null>(null); // subject_id or class_id
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);

  // Form states
  const [newClassName, setNewClassName] = useState('');
  const [newClassSemester, setNewClassSemester] = useState('Semester 6');
  const [newClassDept, setNewClassDept] = useState('Computer Science');

  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjCode, setNewSubjCode] = useState('');
  const [newSubjClassId, setNewSubjClassId] = useState('');

  const [newVivaTitle, setNewVivaTitle] = useState('');
  const [newVivaSubjId, setNewVivaSubjId] = useState('');
  const [newVivaDate, setNewVivaDate] = useState('');

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Teacher Data
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
      console.error('Error fetching teacher data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Handlers
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          class_name: newClassName,
          semester: newClassSemester,
          department: newClassDept,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create class');

      setShowCreateClass(false);
      setNewClassName('');
      fetchData();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject_name: newSubjName,
          subject_code: newSubjCode,
          class_id: newSubjClassId || classes[0]?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create subject');

      setShowCreateSubject(false);
      setNewSubjName('');
      setNewSubjCode('');
      fetchData();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleScheduleViva = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      const res = await fetch('/api/viva-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject_id: newVivaSubjId || subjects[0]?.id,
          title: newVivaTitle,
          scheduled_date: newVivaDate || new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule viva');

      setShowScheduleViva(false);
      setNewVivaTitle('');
      fetchData();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;
    try {
      await fetch(`/api/subjects/${subjectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleViewStudents = async (subjectId: string) => {
    try {
      const res = await fetch(`/api/subjects/${subjectId}/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const stds = await res.json();
        setEnrolledStudents(stds);
        setShowStudentsModal(subjectId);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const copyClassCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const totalStudentsCount = classes.reduce((acc, c) => acc + (c.student_count || 0), 0);

  return (
    <div className="flex min-h-[calc(100vh-65px)] bg-zinc-950 text-zinc-100">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-zinc-800/80 bg-zinc-950 p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div className="px-3 py-2 bg-zinc-900/60 rounded-xl border border-zinc-800 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
              {user?.full_name?.charAt(0)}
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-200 truncate">{user?.full_name}</div>
              <div className="text-[10px] text-indigo-400 font-mono">Faculty Examiner</div>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'classes', label: 'Class Management', icon: Users, badge: classes.length },
              { id: 'subjects', label: 'Subjects & Curriculum', icon: BookOpen, badge: subjects.length },
              { id: 'viva', label: 'Viva Sessions', icon: Calendar, badge: vivaSessions.length },
              { id: 'reports', label: 'Evaluation Reports', icon: FileText },
              { id: 'settings', label: 'Faculty Settings', icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                    active
                      ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 ${active ? 'text-indigo-400' : 'text-zinc-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                        active ? 'bg-indigo-500/20 text-indigo-300' : 'bg-zinc-800 text-zinc-400'
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

        {/* Quick Help Card */}
        <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 text-xs text-zinc-400 space-y-2">
          <div className="flex items-center space-x-2 text-indigo-400 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Phase 1 Architecture</span>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Classes and subjects created here are stored securely with SQLite persistence and unique join codes.
          </p>
        </div>
      </aside>

      {/* Main Work Area */}
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        {selectedSubject ? (
          <SubjectWorkspace
            subject={selectedSubject}
            token={token || ''}
            onBack={() => setSelectedSubject(null)}
          />
        ) : (
          <>
        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 max-w-7xl">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Faculty Dashboard</h1>
                <p className="text-xs text-zinc-400 mt-1">
                  Manage academic classes, assign subjects, monitor viva schedules, and access student reports.
                </p>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setShowCreateClass(true);
                    setFormError(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-2 transition shadow-lg shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Class</span>
                </button>

                <button
                  onClick={() => {
                    setShowCreateSubject(true);
                    setFormError(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold flex items-center space-x-2 transition"
                >
                  <Plus className="w-4 h-4 text-indigo-400" />
                  <span>Create Subject</span>
                </button>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                  <span>Total Classes</span>
                  <Users className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-3xl font-bold text-white tracking-tight">{classes.length}</div>
                <div className="text-[11px] text-emerald-400 flex items-center space-x-1">
                  <span>Active semester cohorts</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                  <span>Enrolled Students</span>
                  <GraduationCap className="w-4 h-4 text-violet-400" />
                </div>
                <div className="text-3xl font-bold text-white tracking-tight">{totalStudentsCount}</div>
                <div className="text-[11px] text-zinc-500">Joined via Class Codes</div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                  <span>Active Viva Sessions</span>
                  <Calendar className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold text-white tracking-tight">{vivaSessions.length}</div>
                <div className="text-[11px] text-indigo-400 font-medium">Scheduled & Upcoming</div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                  <span>Reports Generated</span>
                  <FileText className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-bold text-white tracking-tight">{reports.length}</div>
                <div className="text-[11px] text-zinc-500">Evaluation Records</div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-200">Faculty Actions</h2>
                <span className="text-[10px] text-zinc-500 font-mono uppercase">Phase 1 Workflow</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  onClick={() => setShowCreateClass(true)}
                  className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:border-indigo-500/50 hover:bg-zinc-800/80 text-left transition group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-indigo-300">
                    <span>Create New Class</span>
                    <Plus className="w-4 h-4 text-indigo-400 group-hover:rotate-90 transition-transform" />
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">Generates unique student join code</p>
                </button>

                <button
                  onClick={() => setShowCreateSubject(true)}
                  className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:border-indigo-500/50 hover:bg-zinc-800/80 text-left transition group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-violet-300">
                    <span>Create Subject</span>
                    <Plus className="w-4 h-4 text-violet-400 group-hover:rotate-90 transition-transform" />
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">Assign curriculum to a class</p>
                </button>

                <button
                  onClick={() => setShowScheduleViva(true)}
                  className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:border-emerald-500/50 hover:bg-zinc-800/80 text-left transition group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-emerald-300">
                    <span>Schedule Viva</span>
                    <Calendar className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">Set date for oral examination</p>
                </button>

                <button
                  onClick={() => {
                    if (subjects.length > 0) {
                      setSelectedSubject(subjects[0]);
                    } else {
                      setActiveTab('subjects');
                    }
                  }}
                  className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:border-amber-500/50 hover:bg-zinc-800/80 text-left transition group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-amber-300">
                    <span>Upload Material</span>
                    <Upload className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">Syllabus PDF & RAG processing</p>
                </button>
              </div>
            </div>

            {/* Recent Classes & Viva Sessions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Classes List */}
              <div className="lg:col-span-7 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <h2 className="text-sm font-semibold text-zinc-200">Active Classes</h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('classes')}
                    className="text-xs text-indigo-400 hover:underline flex items-center space-x-1"
                  >
                    <span>View all</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {classes.map((cls) => (
                    <div
                      key={cls.id}
                      className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/80 transition flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-zinc-100">{cls.class_name}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center space-x-2">
                          <span>{cls.department}</span>
                          <span>•</span>
                          <span>{cls.semester}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="text-xs font-mono font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg flex items-center space-x-1.5">
                            <span>{cls.class_code}</span>
                            <button
                              onClick={() => copyClassCode(cls.class_code)}
                              className="text-zinc-400 hover:text-white"
                              title="Copy Class Code"
                            >
                              {copiedCode === cls.class_code ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <span className="text-[10px] text-zinc-500 block mt-1">
                            {cls.student_count || 0} students enrolled
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Viva Sessions */}
              <div className="lg:col-span-5 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-sm font-semibold text-zinc-200">Scheduled Vivas</h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('viva')}
                    className="text-xs text-indigo-400 hover:underline flex items-center space-x-1"
                  >
                    <span>Manage</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {vivaSessions.map((viva) => (
                    <div key={viva.id} className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2">
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-semibold text-zinc-200 line-clamp-1">{viva.title}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${
                            viva.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                          }`}
                        >
                          {viva.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                        <span>{viva.subject_name}</span>
                        <span className="font-mono text-zinc-500">
                          {new Date(viva.scheduled_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CLASS MANAGEMENT */}
        {activeTab === 'classes' && (
          <div className="space-y-6 max-w-7xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-white">Class Management</h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Create classes and share unique auto-generated class codes with students.
                </p>
              </div>
              <button
                onClick={() => setShowCreateClass(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-2 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Class</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls) => (
                <div key={cls.id} className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="text-sm font-bold text-white leading-snug">{cls.class_name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                        {cls.semester}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">{cls.department}</p>
                  </div>

                  <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-semibold">Join Code</span>
                      <div className="font-mono font-bold text-indigo-300 flex items-center space-x-2 mt-0.5">
                        <span>{cls.class_code}</span>
                        <button
                          onClick={() => copyClassCode(cls.class_code)}
                          className="text-zinc-400 hover:text-white"
                          title="Copy Code"
                        >
                          {copiedCode === cls.class_code ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-semibold">Students</span>
                      <span className="font-semibold text-zinc-200">{cls.student_count || 0} Enrolled</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: SUBJECTS & CURRICULUM */}
        {activeTab === 'subjects' && (
          <div className="space-y-6 max-w-7xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-white">Subjects & Curriculum</h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Define academic subjects, manage curriculum nodes, and view enrolled students.
                </p>
              </div>
              <button
                onClick={() => setShowCreateSubject(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-2 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Subject</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((subj) => (
                <div key={subj.id} className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                        {subj.subject_code}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-2">{subj.subject_name}</h3>
                      <p className="text-xs text-zinc-400 mt-1">{subj.class_name}</p>
                    </div>

                    <button
                      onClick={() => handleDeleteSubject(subj.id)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition"
                      title="Delete Subject"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                    <button
                      onClick={() => handleViewStudents(subj.id)}
                      className="text-xs text-indigo-400 hover:underline flex items-center space-x-1"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Students</span>
                    </button>

                    <button
                      onClick={() => setSelectedSubject(subj)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>AI Knowledge Base</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: VIVA SESSIONS */}
        {activeTab === 'viva' && (
          <div className="space-y-6 max-w-7xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-white">Viva Sessions</h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Schedule upcoming oral viva examinations and track completion status.
                </p>
              </div>
              <button
                onClick={() => setShowScheduleViva(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-2 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule New Viva</span>
              </button>
            </div>

            <div className="space-y-3">
              {vivaSessions.map((viva) => (
                <div key={viva.id} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-bold text-white">{viva.title}</span>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                          viva.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                        }`}
                      >
                        {viva.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">{viva.subject_name}</p>
                  </div>

                  <div className="text-right text-xs text-zinc-400 font-mono">
                    {new Date(viva.scheduled_date).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: FACULTY EVALUATION REPORTS */}
        {activeTab === 'reports' && (
          selectedReportToView ? (
            <FacultyReportView
              report={{
                id: selectedReportToView.id,
                candidateName: selectedReportToView.student_name || 'Student Candidate',
                candidateId: selectedReportToView.student_id || 'STD-2026',
                academicLevel: 'Undergraduate',
                courseTitle: selectedReportToView.viva_title || 'Oral Viva Examination',
                examDate: new Date(selectedReportToView.created_at || Date.now()).toLocaleDateString(),
                overallScore: selectedReportToView.score || 85,
                gradeClassification: selectedReportToView.score >= 85 ? 'Distinction' : selectedReportToView.score >= 70 ? 'Pass' : 'Conditional Pass',
                facultyVerdict: selectedReportToView.report_json?.verdict || 'RECOMMENDED FOR ADVANCED CREDIT',
                readinessSummary: selectedReportToView.report_json?.readinessSummary || 'Demonstrated comprehensive conceptual understanding and solid reasoning across Socratic probes.',
                domainCompetencies: selectedReportToView.report_json?.domainCompetencies || [
                  { domainName: 'Core Theory', score: 88, status: 'Mastery', Strengths: 'Deep understanding', Weaknesses: 'Minor precision' },
                  { domainName: 'Practical Application', score: 82, status: 'Competent', Strengths: 'Good intuition', Weaknesses: 'Edge cases' }
                ],
                socraticTranscripts: selectedReportToView.report_json?.socraticTranscripts || [],
                recommendationAction: selectedReportToView.report_json?.recommendationAction || 'Approved with distinction.'
              }}
              onBack={() => setSelectedReportToView(null)}
            />
          ) : (
            <div className="space-y-6 max-w-7xl">
              <div>
                <h1 className="text-xl font-bold text-white">Faculty Evaluation Reports</h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Detailed viva transcripts, score breakdowns, and conceptual misconception analysis.
                </p>
              </div>

              <div className="space-y-4">
                {reports.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 space-y-3">
                    <FileText className="w-10 h-10 text-zinc-600 mx-auto" />
                    <div className="text-sm font-semibold text-zinc-300">No Evaluation Reports Generated Yet</div>
                    <p className="text-xs text-zinc-500">Reports will automatically appear here once students complete live viva sessions.</p>
                  </div>
                ) : (
                  reports.map((rep) => (
                    <div key={rep.id} className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Score: {rep.score}/100
                          </span>
                          <h3 className="text-sm font-bold text-white mt-1">{rep.viva_title}</h3>
                          <p className="text-xs text-zinc-400">Student: {rep.student_name}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-xs text-emerald-400 font-medium">{rep.report_json?.verdict}</span>
                          <button
                            onClick={() => setSelectedReportToView(rep)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                          >
                            View Full Report
                          </button>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-950/60 text-xs text-zinc-300 leading-relaxed border border-zinc-800/60">
                        <span className="font-semibold text-zinc-200 block mb-1">Examiner Summary:</span>
                        {rep.report_json?.readinessSummary || 'Candidate demonstrated strong mastery over core curriculum topics.'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        )}

        {/* TAB 6: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h1 className="text-xl font-bold text-white">Faculty Account Settings</h1>
              <p className="text-xs text-zinc-400 mt-0.5">Manage your profile and institutional preferences.</p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-bold text-lg flex items-center justify-center">
                  {user?.full_name?.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{user?.full_name}</div>
                  <div className="text-xs text-zinc-400">{user?.email}</div>
                  <div className="text-[10px] text-indigo-400 uppercase tracking-widest font-mono mt-0.5">
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

      {/* CREATE CLASS MODAL */}
      {showCreateClass && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-white">Create New Academic Class</h2>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateClass} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Class Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI & Machine Learning Batch 2027"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Semester</label>
                  <input
                    type="text"
                    required
                    value={newClassSemester}
                    onChange={(e) => setNewClassSemester(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={newClassDept}
                    onChange={(e) => setNewClassDept(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateClass(false)}
                  className="px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Create & Generate Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SUBJECT MODAL */}
      {showCreateSubject && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-white">Create New Subject</h2>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubject} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Neural Networks & Transformer Models"
                  value={newSubjName}
                  onChange={(e) => setNewSubjName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Subject Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS-801"
                  value={newSubjCode}
                  onChange={(e) => setNewSubjCode(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Assign to Class</label>
                <select
                  value={newSubjClassId}
                  onChange={(e) => setNewSubjClassId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.class_name} ({c.class_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateSubject(false)}
                  className="px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE VIVA MODAL */}
      {showScheduleViva && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-white">Schedule Viva Examination</h2>

            <form onSubmit={handleScheduleViva} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Viva Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. End-Term Oral Assessment"
                  value={newVivaTitle}
                  onChange={(e) => setNewVivaTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Subject</label>
                <select
                  value={newVivaSubjId}
                  onChange={(e) => setNewVivaSubjId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.subject_name} ({s.subject_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Scheduled Date</label>
                <input
                  type="datetime-local"
                  required
                  value={newVivaDate}
                  onChange={(e) => setNewVivaDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleViva(false)}
                  className="px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Schedule Viva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ENROLLED STUDENTS DRAWER */}
      {showStudentsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Enrolled Students List</h2>
              <button
                onClick={() => setShowStudentsModal(null)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {enrolledStudents.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-500">No students enrolled yet.</div>
              ) : (
                enrolledStudents.map((st) => (
                  <div key={st.student_id} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-zinc-200">{st.full_name}</div>
                      <div className="text-[10px] text-zinc-500">{st.email}</div>
                    </div>
                    <span className="text-[10px] text-indigo-400 font-mono">Enrolled</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
