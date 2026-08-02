import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SubjectModel, StudyMaterial, KnowledgeBase, ExaminationBlueprint, Student, ReportModel } from '../../types';
import { FacultyReportView } from '../FacultyReportView';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  BrainCircuit,
  Calendar,
  Users,
  Sparkles,
  Upload,
  Search,
  Filter,
  Trash2,
  Edit3,
  Download,
  Eye,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Play,
  FileCode,
  FileSpreadsheet,
  Plus,
  Check,
  X,
} from 'lucide-react';

interface SubjectWorkspaceProps {
  subject: SubjectModel;
  token: string;
  onBack: () => void;
}

export const SubjectWorkspace: React.FC<SubjectWorkspaceProps> = ({ subject, token, onBack }) => {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';

  const [activeTab, setActiveTab] = useState<'overview' | 'materials' | 'knowledge' | 'viva' | 'students' | 'reports'>('overview');

  // State
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(null);
  const [blueprints, setBlueprints] = useState<ExaminationBlueprint[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [vivaSessions, setVivaSessions] = useState<any[]>([]);
  const [reports, setReports] = useState<ReportModel[]>([]);
  const [selectedReportToView, setSelectedReportToView] = useState<ReportModel | null>(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modals state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [replaceTargetMat, setReplaceTargetMat] = useState<StudyMaterial | null>(null);
  const [showChunkModal, setShowChunkModal] = useState<StudyMaterial | null>(null);
  const [chunksPreview, setChunksPreview] = useState<any[]>([]);
  const [showBlueprintModal, setShowBlueprintModal] = useState<ExaminationBlueprint | null>(null);
  const [showRenameModal, setShowRenameModal] = useState<StudyMaterial | null>(null);
  const [showVivaModal, setShowVivaModal] = useState<boolean>(false);
  const [editingViva, setEditingViva] = useState<any | null>(null);

  // Form states
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileType, setUploadFileType] = useState('PDF');
  const [uploadText, setUploadText] = useState('');
  const [uploadBase64, setUploadBase64] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [vivaTitleInput, setVivaTitleInput] = useState('');
  const [vivaDateInput, setVivaDateInput] = useState('');

  const [renameInput, setRenameInput] = useState('');
  const [indexing, setIndexing] = useState(false);
  const [generatingBp, setGeneratingBp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch subject details
  const fetchWorkspaceData = async () => {
    if (!token || !subject) return;
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      const [resMat, resKb, resBp, resStd, resRep, resViva] = await Promise.all([
        fetch(`/api/subjects/${subject.id}/materials`, { headers }),
        fetch(`/api/subjects/${subject.id}/knowledge-base`, { headers }),
        fetch(`/api/subjects/${subject.id}/blueprints`, { headers }),
        fetch(`/api/subjects/${subject.id}/students`, { headers }),
        fetch('/api/reports', { headers }),
        fetch('/api/viva-sessions', { headers }),
      ]);

      if (resMat.ok) setMaterials(await resMat.json());
      if (resKb.ok) setKnowledgeBase(await resKb.json());
      if (resBp.ok) setBlueprints(await resBp.json());
      if (resStd.ok) setStudents(await resStd.json());
      if (resRep.ok) setReports(await resRep.json());
      if (resViva.ok) {
        const allVivas = await resViva.json();
        setVivaSessions(allVivas.filter((v: any) => v.subject_id === subject.id));
      }
    } catch (err) {
      console.error('Error fetching subject workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, [subject.id, token]);

  // Handle Drag & Drop File Upload
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setUploadFileName(file.name);
    const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF';
    setUploadFileType(ext === 'TXT' ? 'TXT' : ext === 'DOCX' ? 'DOCX' : ext === 'PPTX' ? 'PPTX' : 'PDF');

    const reader = new FileReader();
    if (ext === 'TXT') {
      reader.onload = (evt) => {
        setUploadText(evt.target?.result as string || '');
        setUploadBase64(null);
      };
      reader.readAsText(file);
    } else {
      reader.onload = (evt) => {
        const result = evt.target?.result as string;
        const base64Str = result.split(',')[1] || result;
        setUploadBase64(base64Str);
        setUploadText('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileName) return;
    setErrorMsg(null);
    try {
      const res = await fetch('/api/study-materials/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subjectId: subject.id,
          fileName: uploadFileName,
          fileType: uploadFileType,
          fileContentBase64: uploadBase64,
          fileText: uploadText,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload document');

      setShowUploadModal(false);
      setUploadFileName('');
      setUploadText('');
      setUploadBase64(null);
      fetchWorkspaceData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteMaterial = async (matId: string) => {
    if (!confirm('Are you sure you want to delete this study material?')) return;
    try {
      await fetch(`/api/study-materials/${matId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchWorkspaceData();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleRenameMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRenameModal || !renameInput) return;
    try {
      await fetch(`/api/study-materials/${showRenameModal.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fileName: renameInput }),
      });
      setShowRenameModal(null);
      fetchWorkspaceData();
    } catch (err) {
      console.error('Rename error:', err);
    }
  };

  const handleInspectChunks = async (mat: StudyMaterial) => {
    setShowChunkModal(mat);
    try {
      const res = await fetch(`/api/study-materials/${mat.id}/chunks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setChunksPreview(await res.json());
      }
    } catch (err) {
      console.error('Error fetching chunks:', err);
    }
  };

  const handleReindexKnowledgeBase = async () => {
    try {
      setIndexing(true);
      const res = await fetch(`/api/subjects/${subject.id}/knowledge-base/index`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setKnowledgeBase(data.knowledgeBase);
      }
    } catch (err) {
      console.error('Reindex error:', err);
    } finally {
      setIndexing(false);
    }
  };

  const handleGenerateBlueprint = async () => {
    try {
      setGeneratingBp(true);
      const res = await fetch(`/api/subjects/${subject.id}/blueprints`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const bp = await res.json();
        setBlueprints((prev) => [bp, ...prev]);
        setShowBlueprintModal(bp);
      }
    } catch (err) {
      console.error('Blueprint error:', err);
    } finally {
      setGeneratingBp(false);
    }
  };

  const handlePublishBlueprint = async (bpId: string) => {
    try {
      const res = await fetch(`/api/blueprints/${bpId}/publish`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchWorkspaceData();
      }
    } catch (err) {
      console.error('Publish error:', err);
    }
  };

  // Viva CRUD Handlers
  const handleSaveVivaSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vivaTitleInput || !vivaDateInput) return;
    try {
      if (editingViva) {
        await fetch(`/api/viva-sessions/${editingViva.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: vivaTitleInput,
            scheduled_date: vivaDateInput,
          }),
        });
      } else {
        await fetch('/api/viva-sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            subject_id: subject.id,
            title: vivaTitleInput,
            scheduled_date: vivaDateInput,
          }),
        });
      }
      setShowVivaModal(false);
      setEditingViva(null);
      setVivaTitleInput('');
      setVivaDateInput('');
      fetchWorkspaceData();
    } catch (err) {
      console.error('Error saving viva session:', err);
    }
  };

  const handleDeleteVivaSession = async (vivaId: string) => {
    if (!confirm('Are you sure you want to delete this viva session?')) return;
    try {
      await fetch(`/api/viva-sessions/${vivaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchWorkspaceData();
    } catch (err) {
      console.error('Error deleting viva session:', err);
    }
  };

  const handleDuplicateVivaSession = async (vivaId: string) => {
    try {
      await fetch(`/api/viva-sessions/${vivaId}/duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchWorkspaceData();
    } catch (err) {
      console.error('Error duplicating viva session:', err);
    }
  };

  const handleUpdateVivaStatus = async (vivaId: string, status: string) => {
    try {
      await fetch(`/api/viva-sessions/${vivaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      fetchWorkspaceData();
    } catch (err) {
      console.error('Error updating viva status:', err);
    }
  };

  // Filtered materials
  const filteredMaterials = materials.filter((m) => {
    const matchesSearch = m.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'ALL' || m.fileType.toUpperCase() === typeFilter.toUpperCase();
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Subject Workspace Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-indigo-950/40 border border-zinc-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
              title="Return to Subjects"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/20">
                  {subject.subject_code}
                </span>
                <span className="text-xs text-zinc-400">{subject.class_name}</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight mt-1">{subject.subject_name}</h1>
            </div>
          </div>

          {/* AI Readiness Status Badge */}
          <div className="flex items-center space-x-2 bg-zinc-950/80 p-2.5 rounded-2xl border border-zinc-800">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <BrainCircuit className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono font-bold">AI Knowledge Engine</div>
              <div className="text-xs font-semibold text-emerald-400 flex items-center space-x-1">
                <span>Gemma Knowledge Base Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Navigation Tabs */}
        <div className="flex items-center space-x-1 border-t border-zinc-800/80 pt-3 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: BookOpen },
            { id: 'materials', label: 'Study Materials', icon: FileText, badge: materials.length },
            { id: 'knowledge', label: 'Knowledge Base', icon: BrainCircuit, badge: knowledgeBase?.totalChunks || 0 },
            { id: 'viva', label: 'Viva Workspace', icon: Calendar, badge: blueprints.length },
            { id: 'students', label: 'Students', icon: Users, badge: students.length },
            { id: 'reports', label: 'Reports', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition shrink-0 ${
                  active
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${active ? 'bg-indigo-700 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Total Documents</span>
                <FileText className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-white">{knowledgeBase?.totalDocuments || materials.length}</div>
              <div className="text-[11px] text-zinc-500">Uploaded Study Materials</div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Total Pages</span>
                <Layers className="w-4 h-4 text-violet-400" />
              </div>
              <div className="text-2xl font-bold text-white">{knowledgeBase?.totalPages || 0}</div>
              <div className="text-[11px] text-zinc-500">Indexed Curriculum Pages</div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Structured Chunks</span>
                <BrainCircuit className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white">{knowledgeBase?.totalChunks || 0}</div>
              <div className="text-[11px] text-emerald-400">Ready for Gemma RAG</div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Examination Blueprints</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white">{blueprints.length}</div>
              <div className="text-[11px] text-zinc-500">Strategy Profiles</div>
            </div>
          </div>

          {/* Overview Hero Panel */}
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Subject Knowledge Base Overview</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Documents uploaded to this subject are automatically processed into structured text chunks and ingested into the Gemma Knowledge Engine.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('materials')}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-2 transition"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Material</span>
              </button>
            </div>

            {/* Quick Material List Preview */}
            <div className="space-y-2 pt-2">
              {materials.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-zinc-950/60 border border-dashed border-zinc-800 space-y-3">
                  <BrainCircuit className="w-8 h-8 text-zinc-600 mx-auto" />
                  <div className="text-xs font-semibold text-zinc-300">No Study Materials Uploaded</div>
                  <p className="text-[11px] text-zinc-500 max-w-md mx-auto">
                    Upload PDFs, DOCX, PPTX, or TXT documents to transform this subject into an AI Knowledge Base for Gemma-powered oral examinations.
                  </p>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
                  >
                    Upload First Document
                  </button>
                </div>
              ) : (
                materials.slice(0, 3).map((mat) => (
                  <div key={mat.id} className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold font-mono">
                        {mat.fileType}
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-200">{mat.fileName}</div>
                        <div className="text-[10px] text-zinc-500">{mat.totalChunks || 0} Chunks • {mat.totalPages || 1} Pages</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold uppercase">
                      {mat.processingStatus}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STUDY MATERIALS */}
      {activeTab === 'materials' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white">Study Materials</h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Upload, replace, rename, and manage syllabus documents for AI knowledge extraction.
              </p>
            </div>

            <button
              onClick={() => {
                setShowUploadModal(true);
                setErrorMsg(null);
              }}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-2 transition shadow-lg shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Upload New Material</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-zinc-500" />
              <span className="text-xs text-zinc-400 font-medium">Type:</span>
              {['ALL', 'PDF', 'DOCX', 'PPTX', 'TXT'].map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition ${
                    typeFilter === type
                      ? 'bg-indigo-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Materials Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMaterials.length === 0 ? (
              <div className="col-span-full p-12 text-center rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 space-y-3">
                <FileText className="w-10 h-10 text-zinc-600 mx-auto" />
                <div className="text-sm font-semibold text-zinc-300">No matching study materials found</div>
                <p className="text-xs text-zinc-500">Upload syllabus files or clear search filters.</p>
              </div>
            ) : (
              filteredMaterials.map((mat) => (
                <div key={mat.id} className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4 flex flex-col justify-between hover:border-zinc-700 transition">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs font-mono">
                          {mat.fileType}
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-white line-clamp-1">{mat.fileName}</h3>
                          <span className="text-[10px] text-zinc-500 block mt-0.5">
                            {new Date(mat.uploadDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold capitalize">
                        {mat.processingStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-zinc-950/80 text-[11px] text-zinc-400 border border-zinc-800/80">
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase font-mono">Pages</span>
                        <span className="font-semibold text-zinc-200">{mat.totalPages || 1} Pages</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase font-mono">Chunks</span>
                        <span className="font-semibold text-zinc-200">{mat.totalChunks || 0} Chunks</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs">
                    <button
                      onClick={() => handleInspectChunks(mat)}
                      className="text-indigo-400 hover:underline flex items-center space-x-1 font-medium"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Knowledge Units</span>
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setReplaceTargetMat(mat);
                          setShowUploadModal(true);
                          setUploadFileName(mat.fileName);
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-300 hover:bg-zinc-800"
                        title="Replace File"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setShowRenameModal(mat);
                          setRenameInput(mat.fileName);
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                        title="Rename"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <a
                        href={`/api/study-materials/${mat.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>

                      <button
                        onClick={() => handleDeleteMaterial(mat.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: KNOWLEDGE BASE PAGE */}
      {activeTab === 'knowledge' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">AI Knowledge Base</h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Educational Knowledge Units structured for Gemma Socratic Probing & Oral Examination strategy.
              </p>
            </div>

            <button
              onClick={handleReindexKnowledgeBase}
              disabled={indexing}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-2 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${indexing ? 'animate-spin' : ''}`} />
              <span>{indexing ? 'Re-Indexing...' : 'Re-Index Knowledge Base'}</span>
            </button>
          </div>

          {/* Key Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold">Documents</span>
              <div className="text-xl font-bold text-white">{knowledgeBase?.totalDocuments || 0}</div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold">Total Pages</span>
              <div className="text-xl font-bold text-white">{knowledgeBase?.totalPages || 0}</div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold">Knowledge Units</span>
              <div className="text-xl font-bold text-emerald-400">{knowledgeBase?.totalChunks || 0} Units</div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold">AI Ready Status</span>
              <div className="text-sm font-bold text-emerald-400 uppercase tracking-wider">{knowledgeBase?.aiStatus === 'ready' ? 'Active & Ready' : 'Pending'}</div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold">Last Synchronized</span>
              <div className="text-xs font-mono text-zinc-300">
                {knowledgeBase?.lastIndexed ? new Date(knowledgeBase.lastIndexed).toLocaleTimeString() : 'Just now'}
              </div>
            </div>
          </div>

          {/* AI Readiness Panel */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-zinc-900 to-zinc-900 border border-emerald-500/30 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Knowledge Grounding Verification</h3>
                <p className="text-xs text-zinc-400">
                  This subject curriculum is converted into verified educational knowledge units for Gemma Socratic oral questioning.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase font-mono">Knowledge Base Status</span>
                <span className="font-bold text-emerald-400">{knowledgeBase?.totalChunks ? 'AI READY' : 'PENDING'}</span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase font-mono">Documents Indexed</span>
                <span className="font-bold text-zinc-200">{knowledgeBase?.totalDocuments || 0} Files</span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase font-mono">Topics Covered</span>
                <span className="font-bold text-indigo-400">Multi-Topic Socratic Grid</span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase font-mono">Latest Update</span>
                <span className="font-mono text-zinc-300 text-[11px]">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Educational Knowledge Units Cards in Knowledge Base */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">Ingested Curriculum Knowledge Units</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {materials.map((m) => (
                <div key={m.id} className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold font-mono">
                      {m.fileType}
                    </div>
                    <div>
                      <div className="font-semibold text-zinc-200">{m.fileName}</div>
                      <div className="text-[10px] text-zinc-500">{m.totalPages || 1} Pages • {m.totalChunks || 0} Educational Knowledge Units</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleInspectChunks(m)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium flex items-center space-x-1"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-400" />
                    <span>View Units</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: VIVA WORKSPACE & MANAGEMENT */}
      {activeTab === 'viva' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white">Viva Workspace & Examination Management</h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Create, edit, duplicate, publish, archive, and manage viva oral examinations for students.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setEditingViva(null);
                  setVivaTitleInput('');
                  setVivaDateInput('');
                  setShowVivaModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-lg shadow-violet-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Create Viva</span>
              </button>

              <button
                onClick={handleGenerateBlueprint}
                disabled={generatingBp}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-2 transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{generatingBp ? 'Generating Blueprint...' : 'Generate AI Blueprint'}</span>
              </button>
            </div>
          </div>

          {/* Status Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-mono">Total Viva Sessions</span>
              <div className="text-xl font-bold text-white">{vivaSessions.length} Scheduled</div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-mono">AI Blueprints</span>
              <div className="text-xl font-bold text-indigo-400">{blueprints.length} Generated</div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-mono">Active / Published</span>
              <div className="text-xl font-bold text-emerald-400">
                {vivaSessions.filter((v) => v.status === 'active' || v.status === 'published' || v.status === 'scheduled').length} Vivas
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-mono">Completed Attempts</span>
              <div className="text-xl font-bold text-amber-400">
                {vivaSessions.filter((v) => v.status === 'completed').length} Reports
              </div>
            </div>
          </div>

          {/* Viva Sessions Management List */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">Scheduled & Active Oral Viva Examinations</h3>
            {vivaSessions.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 space-y-3">
                <Calendar className="w-8 h-8 text-violet-400 mx-auto" />
                <div className="text-xs font-semibold text-zinc-300">No Viva Examination Scheduled</div>
                <p className="text-[11px] text-zinc-500 max-w-md mx-auto">
                  Create a new viva examination or generate an AI Examination Blueprint to publish for your students.
                </p>
              </div>
            ) : (
              vivaSessions.map((viva) => (
                <div key={viva.id} className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-white">{viva.title}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                          viva.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : viva.status === 'archived'
                            ? 'bg-zinc-800 text-zinc-400'
                            : 'bg-violet-500/10 text-violet-300 border border-violet-500/20'
                        }`}
                      >
                        {viva.status}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 flex items-center space-x-2">
                      <span>{viva.subject_name}</span>
                      <span>•</span>
                      <span className="font-mono">{new Date(viva.scheduled_date).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setEditingViva(viva);
                        setVivaTitleInput(viva.title);
                        setVivaDateInput(viva.scheduled_date);
                        setShowVivaModal(true);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center space-x-1"
                      title="Edit Viva"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDuplicateVivaSession(viva.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center space-x-1"
                      title="Duplicate Viva"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Duplicate</span>
                    </button>

                    {viva.status !== 'archived' ? (
                      <button
                        onClick={() => handleUpdateVivaStatus(viva.id, 'archived')}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-medium"
                        title="Archive Viva"
                      >
                        Archive
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateVivaStatus(viva.id, 'scheduled')}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-medium"
                        title="Publish / Unarchive Viva"
                      >
                        Publish
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteVivaSession(viva.id)}
                      className="p-1.5 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-zinc-800"
                      title="Delete Viva"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Blueprints List */}
          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <h3 className="text-sm font-bold text-white">Gemma Examination Blueprints</h3>
            {blueprints.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 space-y-3">
                <Sparkles className="w-8 h-8 text-indigo-400 mx-auto" />
                <div className="text-xs font-semibold text-zinc-300">No Examination Blueprint Generated Yet</div>
                <p className="text-[11px] text-zinc-500 max-w-md mx-auto">
                  Click "Generate Examination Blueprint" to invoke Gemma PlannerAgent to build an adaptive testing strategy based on your Knowledge Base.
                </p>
                <button
                  onClick={handleGenerateBlueprint}
                  disabled={generatingBp}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
                >
                  Generate Blueprint
                </button>
              </div>
            ) : (
              blueprints.map((bp) => (
                <div key={bp.id} className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white">{bp.title}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                            bp.status === 'published'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {bp.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Generated by Gemma PlannerAgent on {new Date(bp.generatedAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowBlueprintModal(bp)}
                        className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Preview Blueprint</span>
                      </button>

                      {bp.status !== 'published' && (
                        <button
                          onClick={() => handlePublishBlueprint(bp.id)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                        >
                          Publish Viva
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Blueprint Strategy Tags */}
                  <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs space-y-2">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold block">Gemma Testing Topics</span>
                    <div className="flex flex-wrap gap-1.5">
                      {bp.strategyData?.topics?.map((topic, idx) => (
                        <span key={idx} className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-[11px]">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: STUDENTS */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-bold text-white">Enrolled Students</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Students enrolled in {subject.class_name}.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {students.length === 0 ? (
              <div className="col-span-full p-8 text-center text-xs text-zinc-500 bg-zinc-900/40 rounded-2xl border border-zinc-800">
                No students currently enrolled in this class.
              </div>
            ) : (
              students.map((st) => (
                <div key={st.student_id} className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center text-xs">
                    {st.full_name?.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{st.full_name}</div>
                    <div className="text-[11px] text-zinc-400">{st.email}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: REPORTS & STUDENT MONITORING */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {selectedReportToView ? (
            <FacultyReportView
              report={selectedReportToView.report_json as any}
              onBack={() => setSelectedReportToView(null)}
            />
          ) : (
            <>
              <div>
                <h1 className="text-xl font-bold text-white">Student Viva Monitoring & Reports</h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Track student oral assessment progress, completion status, scorecards, and AI evaluation reports for {subject.subject_name}.
                </p>
              </div>

              {reports.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 space-y-3">
                  <FileText className="w-10 h-10 text-zinc-600 mx-auto" />
                  <div className="text-sm font-semibold text-zinc-300">No Student Viva Reports Submitted Yet</div>
                  <p className="text-xs text-zinc-500 max-w-md mx-auto">
                    When students take published oral vivas for this subject, their real-time performance scorecards and faculty reports will automatically appear here.
                  </p>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-400 font-mono uppercase text-[10px]">
                          <th className="pb-3 font-semibold">Student Name</th>
                          <th className="pb-3 font-semibold">Viva Examination</th>
                          <th className="pb-3 font-semibold">Status</th>
                          <th className="pb-3 font-semibold">Score</th>
                          <th className="pb-3 font-semibold">Completion Date</th>
                          <th className="pb-3 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60">
                        {reports.map((rep) => (
                          <tr key={rep.id} className="hover:bg-zinc-800/30 transition">
                            <td className="py-3.5 font-bold text-white flex items-center space-x-2.5">
                              <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center text-xs">
                                {rep.student_name?.charAt(0) || 'S'}
                              </div>
                              <span>{rep.student_name || 'Alex Rivera'}</span>
                            </td>
                            <td className="py-3.5 text-zinc-300">{rep.viva_title || 'Mid-Term Oral Assessment'}</td>
                            <td className="py-3.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Completed
                              </span>
                            </td>
                            <td className="py-3.5 font-mono font-bold text-indigo-300">{rep.score} / 100</td>
                            <td className="py-3.5 text-zinc-400 font-mono">{new Date(rep.created_at).toLocaleString()}</td>
                            <td className="py-3.5 text-right">
                              <button
                                onClick={() => setSelectedReportToView(rep)}
                                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 ml-auto transition"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View AI Report</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* UPLOAD STUDY MATERIAL MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Upload Study Material</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleFileDrop}
                className={`p-6 rounded-2xl border-2 border-dashed text-center transition cursor-pointer ${
                  dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                }`}
              >
                <input
                  type="file"
                  id="file-upload-input"
                  className="hidden"
                  accept=".pdf,.docx,.pptx,.txt"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
                  }}
                />
                <label htmlFor="file-upload-input" className="cursor-pointer space-y-2 block">
                  <Upload className="w-8 h-8 text-indigo-400 mx-auto" />
                  <div className="text-xs font-semibold text-zinc-200">
                    {uploadFileName ? `Selected: ${uploadFileName}` : 'Drag & Drop document here or click to browse'}
                  </div>
                  <p className="text-[11px] text-zinc-500">Supports PDF, DOCX, PPTX, TXT</p>
                </label>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Transformer Attention Mechanics Handbook"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {uploadFileType === 'TXT' && (
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Text Content Paste (Optional)</label>
                  <textarea
                    rows={4}
                    placeholder="Paste raw curriculum or syllabus text..."
                    value={uploadText}
                    onChange={(e) => setUploadText(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Process & Add to Knowledge Base
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENAME MATERIAL MODAL */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-base font-bold text-white">Rename Material</h2>
            <form onSubmit={handleRenameMaterial} className="space-y-3">
              <input
                type="text"
                required
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRenameModal(null)}
                  className="px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
                >
                  Save Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE OR EDIT VIVA SESSION MODAL */}
      {showVivaModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-white">
              {editingViva ? 'Edit Viva Examination' : 'Create & Schedule Viva Examination'}
            </h2>
            <form onSubmit={handleSaveVivaSession} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Viva Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midterm Oral Examination - Advanced Deep Learning"
                  value={vivaTitleInput}
                  onChange={(e) => setVivaTitleInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Scheduled Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={vivaDateInput}
                  onChange={(e) => setVivaDateInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowVivaModal(false);
                    setEditingViva(null);
                  }}
                  className="px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
                >
                  {editingViva ? 'Update Viva' : 'Publish Viva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT KNOWLEDGE UNITS MODAL */}
      {showChunkModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-3xl max-h-[80vh] flex flex-col space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <BrainCircuit className="w-5 h-5 text-indigo-400" />
                  <span>Educational Knowledge Units Inspector</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Document: <span className="font-semibold text-zinc-200">{showChunkModal.fileName}</span> • {chunksPreview.length || showChunkModal.totalChunks || 0} Knowledge Units Ingested
                </p>
              </div>
              <button onClick={() => setShowChunkModal(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {chunksPreview.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-500">Loading educational knowledge units...</div>
              ) : (
                chunksPreview.map((chunk, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2.5 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-2 border-b border-zinc-800/60 text-[11px] font-mono">
                      <div>
                        <span className="text-zinc-500 block uppercase text-[9px]">Document</span>
                        <span className="text-zinc-300 font-semibold truncate block">{showChunkModal.fileName}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block uppercase text-[9px]">Chapter</span>
                        <span className="text-indigo-400 font-semibold">Chapter {Math.ceil((idx + 1) / 2)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block uppercase text-[9px]">Topic / Section</span>
                        <span className="text-zinc-200 font-semibold truncate block">{chunk.heading || 'Theoretical Principles'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block uppercase text-[9px]">Page & Status</span>
                        <span className="text-emerald-400 font-semibold">Page {chunk.pageNumber || 1} • Ready</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-mono block mb-1">Knowledge Unit Content</span>
                      <p className="text-zinc-300 leading-relaxed font-sans bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/40">{chunk.chunkContent}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-xs">
              <span className="text-emerald-400 font-mono font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>AI Grounding Verified for Gemma Socratic Probing</span>
              </span>
              <button
                onClick={() => setShowChunkModal(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-200 text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW & APPROVE EXAMINATION BLUEPRINT SCREEN */}
      {showBlueprintModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 w-full max-w-3xl space-y-6 shadow-2xl my-8">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono uppercase">
                    Gemma 4 Planner Agent
                  </span>
                  <span className="text-xs text-zinc-500">Generated {new Date(showBlueprintModal.generatedAt).toLocaleDateString()}</span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1">{showBlueprintModal.title}</h2>
              </div>
              <button onClick={() => setShowBlueprintModal(null)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overview */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-1.5">
              <span className="text-[10px] text-indigo-400 font-mono uppercase font-bold tracking-wider">Strategy Overview</span>
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                {showBlueprintModal.strategyData?.overview || 'Autonomous oral examination plan generated based on syllabus knowledge base mechanics.'}
              </p>
            </div>

            {/* Key Metrics Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase font-mono">Estimated Duration</span>
                <span className="font-bold text-amber-400">{showBlueprintModal.strategyData?.estimatedDuration || '15 - 20 Mins'}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase font-mono">Exam Status</span>
                <span className={`font-bold uppercase ${showBlueprintModal.status === 'published' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {showBlueprintModal.status}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-zinc-500 block uppercase font-mono">Testing Topics</span>
                <span className="font-bold text-indigo-400">{showBlueprintModal.strategyData?.topics?.length || 4} Core Topics</span>
              </div>
            </div>

            {/* Topics & Weightages */}
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                <span>Core Topics & Weightage Distribution</span>
                <span className="text-[10px] text-zinc-500 font-normal">Gemma Curriculum Analysis</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {showBlueprintModal.strategyData?.topics?.map((top: string, idx: number) => {
                  const weight = showBlueprintModal.strategyData?.topicWeightages?.[top] || Math.round(100 / (showBlueprintModal.strategyData?.topics?.length || 4));
                  return (
                    <div key={idx} className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-zinc-200">{top}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">Module #{idx + 1}</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 font-mono font-bold text-xs border border-indigo-500/20">
                        {weight}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bloom's Taxonomy Distribution */}
            <div className="space-y-2.5 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800">
              <div className="text-xs font-bold text-white uppercase tracking-wider">Bloom's Taxonomy Coverage</div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                {Object.entries(showBlueprintModal.strategyData?.bloomTaxonomyDistribution || {
                  Remembering: 15,
                  Understanding: 25,
                  Applying: 30,
                  Analyzing: 20,
                  Evaluating: 10,
                }).map(([level, pct]) => (
                  <div key={level} className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-500 uppercase block font-mono">{level}</span>
                    <span className="text-sm font-bold text-indigo-300 font-mono">{String(pct)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Difficulty Flow */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-white uppercase tracking-wider">Difficulty Progression Flow</div>
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                {(showBlueprintModal.strategyData?.difficultyProgression || [
                  '1. Foundational Recall & Core Definitions',
                  '2. Intermediate Conceptual Mechanism & Workflow',
                  '3. Advanced Application & Failure Scenarios',
                  '4. Critical Synthesis & System Trade-offs',
                ]).map((step: string, i: number) => (
                  <div key={i} className="flex items-center space-x-2.5 text-zinc-300">
                    <span className="w-5 h-5 rounded-full bg-indigo-600/20 text-indigo-400 font-bold font-mono text-[10px] flex items-center justify-center border border-indigo-500/30 shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-xs">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Question Strategy & Sample Probing Angles */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-white uppercase tracking-wider">Gemma Probing Angles</div>
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                <p className="text-zinc-400 italic text-[11px] mb-2">{showBlueprintModal.strategyData?.questionStrategy}</p>
                <ul className="space-y-1.5 text-zinc-300 list-disc pl-4 font-sans">
                  {showBlueprintModal.strategyData?.sampleProbingAngles?.map((angle: string, i: number) => (
                    <li key={i}>{angle}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-4 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => {
                  setShowBlueprintModal(null);
                  handleGenerateBlueprint();
                }}
                disabled={generatingBp}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center space-x-2 border border-zinc-700"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>{generatingBp ? 'Regenerating...' : 'Regenerate Blueprint'}</span>
              </button>

              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => setShowBlueprintModal(null)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white text-xs font-medium"
                >
                  Close
                </button>

                {showBlueprintModal.status !== 'published' ? (
                  <button
                    onClick={() => {
                      handlePublishBlueprint(showBlueprintModal.id);
                      setShowBlueprintModal(null);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-500 hover:from-indigo-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center space-x-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Publish Viva</span>
                  </button>
                ) : (
                  <span className="px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Published & Active</span>
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
