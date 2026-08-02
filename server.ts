import express from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import { db } from './src/server/db';
import { generateToken, authMiddleware, AuthenticatedRequest } from './src/server/auth';
import { analyzeSyllabusText, evaluateVivaTurn, generateFacultyReport, getGeminiClient } from './src/server/gemini';
import { Modality } from '@google/genai';
import { User, Teacher, Student, ClassModel, SubjectModel, VivaSessionModel, ReportModel, StudyMaterial, KnowledgeBase, ExaminationBlueprint } from './src/types';
import { processDocumentUpload, getChunksBySubjectId, getProcessedChunks } from './src/server/documentProcessor';
import { gemmaService } from './src/services/gemma';
import { SupabaseService } from './src/server/supabase';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'KIA - Knowledge Intelligence Assessor API',
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // ==========================================
  // AUTHENTICATION ENDPOINTS
  // ==========================================

  // Register Endpoint
  app.post('/api/auth/register', (req, res) => {
    try {
      const { full_name, email, password, role } = req.body;

      if (!full_name || !email || !password || !role) {
        return res.status(400).json({ error: 'All fields (full_name, email, password, role) are required' });
      }

      if (role !== 'teacher' && role !== 'student') {
        return res.status(400).json({ error: 'Role must be teacher or student' });
      }

      const existingUser = db.findUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      const passwordHash = bcrypt.hashSync(password, 10);
      const userId = `usr-${Date.now()}`;
      const newUser: User = {
        id: userId,
        full_name,
        email,
        role,
        created_at: new Date().toISOString(),
      };

      db.createUser(newUser, passwordHash);

      if (role === 'teacher') {
        const teacher: Teacher = {
          teacher_id: `tch-${Date.now()}`,
          user_id: userId,
          full_name,
          email,
        };
        db.createTeacher(teacher);
      } else {
        const student: Student = {
          student_id: `std-${Date.now()}`,
          user_id: userId,
          full_name,
          email,
        };
        db.createStudent(student);
      }

      const token = generateToken(newUser);
      return res.json({ user: newUser, token });
    } catch (err: any) {
      console.error('Registration error:', err);
      return res.status(500).json({ error: err.message || 'Registration failed' });
    }
  });

  // Login Endpoint
  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = db.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const passwordHash = db.getUserPasswordHash(user.id);
      if (!passwordHash || !bcrypt.compareSync(password, passwordHash)) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = generateToken(user);
      return res.json({ user, token });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ error: err.message || 'Login failed' });
    }
  });

  // Get Current User
  app.get('/api/auth/me', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const user = db.findUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  });

  // ==========================================
  // CLASS MANAGEMENT ENDPOINTS
  // ==========================================

  // Get All Classes
  app.get('/api/classes', authMiddleware, (req: AuthenticatedRequest, res) => {
    const classes = db.getClasses();
    if (req.user?.role === 'student') {
      const student = db.getStudentByUserId(req.user.id);
      const enrollments = db.getEnrollments().filter((e) => e.student_id === student?.student_id);
      const enrolledClassIds = enrollments.map((e) => e.class_id);
      const studentClasses = classes.filter((c) => enrolledClassIds.includes(c.id));
      return res.json(studentClasses);
    }
    return res.json(classes);
  });

  // Create Class (Teacher Only)
  app.post('/api/classes', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (req.user?.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can create classes' });
    }

    const { class_name, semester, department } = req.body;
    if (!class_name || !semester || !department) {
      return res.status(400).json({ error: 'class_name, semester, and department are required' });
    }

    const teacher = db.getTeacherByUserId(req.user.id);
    
    // Auto-generate Class Code (e.g. CS2027A or AI8492X)
    const codePrefix = department.substring(0, 2).toUpperCase() || 'CS';
    const codeNum = Math.floor(1000 + Math.random() * 9000);
    const class_code = `${codePrefix}${codeNum}`;

    const newClass: ClassModel = {
      id: `cls-${Date.now()}`,
      class_name,
      class_code,
      semester,
      department,
      teacher_id: teacher?.teacher_id || req.user.id,
      teacher_name: req.user.full_name,
      created_at: new Date().toISOString(),
    };

    const created = db.createClass(newClass);
    return res.json(created);
  });

  // Join Class by Class Code (Student Only)
  app.post('/api/classes/join', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (req.user?.role !== 'student') {
      return res.status(403).json({ error: 'Only students can join classes' });
    }

    const { class_code } = req.body;
    if (!class_code) {
      return res.status(400).json({ error: 'class_code is required' });
    }

    const targetClass = db.getClassByCode(class_code.trim());
    if (!targetClass) {
      return res.status(404).json({ error: 'Class not found. Please check the class code.' });
    }

    const student = db.getStudentByUserId(req.user.id);
    if (!student) {
      return res.status(400).json({ error: 'Student record not found' });
    }

    db.enrollStudentInClass(student.student_id, targetClass.id);
    return res.json({ message: 'Successfully joined class', class: targetClass });
  });

  // ==========================================
  // SUBJECT MANAGEMENT ENDPOINTS
  // ==========================================

  // Get Subjects
  app.get('/api/subjects', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { class_id } = req.query;
    let subjects = db.getSubjects();

    if (class_id && typeof class_id === 'string') {
      subjects = subjects.filter((s) => s.class_id === class_id);
    }

    if (req.user?.role === 'student') {
      const student = db.getStudentByUserId(req.user.id);
      const enrollments = db.getEnrollments().filter((e) => e.student_id === student?.student_id);
      const classIds = enrollments.map((e) => e.class_id);
      subjects = subjects.filter((s) => classIds.includes(s.class_id));
    }

    return res.json(subjects);
  });

  // Create Subject (Teacher Only)
  app.post('/api/subjects', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (req.user?.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can create subjects' });
    }

    const { subject_name, subject_code, class_id } = req.body;
    if (!subject_name || !subject_code || !class_id) {
      return res.status(400).json({ error: 'subject_name, subject_code, and class_id are required' });
    }

    const targetClass = db.getClassById(class_id);
    if (!targetClass) {
      return res.status(404).json({ error: 'Selected class does not exist' });
    }

    const newSubject: SubjectModel = {
      id: `sbj-${Date.now()}`,
      subject_name,
      subject_code,
      class_id,
      class_name: targetClass.class_name,
      teacher_name: req.user.full_name,
      created_at: new Date().toISOString(),
    };

    const created = db.createSubject(newSubject);
    return res.json(created);
  });

  // Edit Subject (Teacher Only)
  app.put('/api/subjects/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (req.user?.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can edit subjects' });
    }

    const { id } = req.params;
    const { subject_name, subject_code } = req.body;

    const updated = db.updateSubject(id, { subject_name, subject_code });
    if (!updated) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    return res.json(updated);
  });

  // Delete Subject (Teacher Only)
  app.delete('/api/subjects/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (req.user?.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can delete subjects' });
    }

    const { id } = req.params;
    db.deleteSubject(id);
    return res.json({ success: true });
  });

  // Get Enrolled Students for a Subject/Class
  app.get('/api/subjects/:id/students', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const subjects = db.getSubjects();
    const subject = subjects.find((s) => s.id === id);

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const students = db.getStudentsForClass(subject.class_id);
    const users = db.getUsers();

    const studentList = students.map((std) => {
      const u = users.find((usr) => usr.id === std.user_id);
      return {
        student_id: std.student_id,
        full_name: u?.full_name || std.full_name || 'Student',
        email: u?.email || std.email || '',
        joined_at: std.user_id,
      };
    });

    return res.json(studentList);
  });

  // ==========================================
  // PHASE 2: STUDY MATERIALS & KNOWLEDGE BASE
  // ==========================================

  // Get Study Materials for a Subject
  app.get('/api/subjects/:subjectId/materials', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { subjectId } = req.params;
      // Fetch from Supabase first, fallback to local DB
      let materials = await SupabaseService.getStudyMaterials(subjectId);
      if (materials.length === 0) {
        // Fallback to local DB
        console.log('No materials in Supabase, falling back to local DB');
        materials = db.getStudyMaterials(subjectId);
      }
      return res.json(materials);
    } catch (error) {
      console.error('Error fetching materials:', error);
      return res.status(500).json({ error: 'Failed to fetch materials' });
    }
  });

  // Upload Study Material (Teacher Only)
  app.post('/api/study-materials/upload', authMiddleware, async (req: AuthenticatedRequest, res) => {
    if (req.user?.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can upload study materials' });
    }

    try {
      const { subjectId, fileName, fileType, fileContentBase64, fileText } = req.body;
      if (!subjectId || !fileName) {
        return res.status(400).json({ error: 'subjectId and fileName are required' });
      }

      const { material, chunks } = await processDocumentUpload({
        subjectId,
        fileName,
        fileType,
        fileContentBase64,
        fileText,
      });

      // Always persist to local DB so the session survives a restart
      db.createStudyMaterial(material);

      // Refresh Knowledge Base metadata in local DB
      const allMaterials = db.getStudyMaterials(subjectId);
      const kb: KnowledgeBase = {
        id: `kb-${subjectId}`,
        subjectId,
        materialIds: allMaterials.map((m) => m.id),
        totalDocuments: allMaterials.length,
        totalChunks: allMaterials.reduce((acc, m) => acc + (m.totalChunks || 0), 0),
        totalPages: allMaterials.reduce((acc, m) => acc + (m.totalPages || 0), 0),
        aiStatus: 'ready',
        lastIndexed: new Date().toISOString(),
      };
      db.upsertKnowledgeBase(kb);

      return res.json({ material, chunksCount: chunks.length, knowledgeBase: kb });
    } catch (err: any) {
      console.error('Error uploading study material:', err);
      return res.status(500).json({ error: err.message || 'Failed to process document upload' });
    }
  });

  // Rename or Update Study Material
  app.put('/api/study-materials/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (req.user?.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can edit study materials' });
    }

    const { id } = req.params;
    const { fileName } = req.body;
    if (!fileName) return res.status(400).json({ error: 'fileName is required' });

    const updated = db.updateStudyMaterial(id, { fileName });
    if (!updated) return res.status(404).json({ error: 'Material not found' });
    return res.json(updated);
  });

  // Delete Study Material
  app.delete('/api/study-materials/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (req.user?.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can delete study materials' });
    }

    const { id } = req.params;
    const mat = db.getStudyMaterialById(id);
    if (!mat) return res.status(404).json({ error: 'Material not found' });

    db.deleteStudyMaterial(id);

    // Update Knowledge Base
    const remaining = db.getStudyMaterials(mat.subjectId);
    const kb: KnowledgeBase = {
      id: `kb-${mat.subjectId}`,
      subjectId: mat.subjectId,
      materialIds: remaining.map((m) => m.id),
      totalDocuments: remaining.length,
      totalChunks: remaining.reduce((acc, m) => acc + (m.totalChunks || 0), 0),
      totalPages: remaining.reduce((acc, m) => acc + (m.totalPages || 0), 0),
      aiStatus: remaining.length > 0 ? 'ready' : 'pending',
      lastIndexed: new Date().toISOString(),
    };
    db.upsertKnowledgeBase(kb);

    return res.json({ success: true, knowledgeBase: kb });
  });

  // Download Study Material
  app.get('/api/study-materials/:id/download', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const mat = db.getStudyMaterialById(id);
    if (!mat) return res.status(404).json({ error: 'Material not found' });

    if (fs.existsSync(mat.storagePath)) {
      return res.download(mat.storagePath, mat.fileName);
    } else {
      return res.status(404).json({ error: 'Original file not found on disk' });
    }
  });

  // Get Chunks for a Study Material
  app.get('/api/study-materials/:id/chunks', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const mat = db.getStudyMaterialById(id);
    if (!mat) return res.status(404).json({ error: 'Material not found' });

    const chunks = getProcessedChunks(mat.processedPath);
    return res.json(chunks);
  });

  // Get Knowledge Base Metadata for a Subject
  app.get('/api/subjects/:subjectId/knowledge-base', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { subjectId } = req.params;
    const kb = db.getKnowledgeBaseBySubjectId(subjectId);
    return res.json(kb);
  });

  // Re-index Knowledge Base (Triggers Gemma Service)
  app.post('/api/subjects/:subjectId/knowledge-base/index', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const { subjectId } = req.params;

    // Load materials and chunks via unified loader
    let materials = await SupabaseService.getStudyMaterials(subjectId);
    if (materials.length === 0) materials = db.getStudyMaterials(subjectId);

    const allChunks = await getChunksBySubjectId(subjectId, materials);

    const analysis = await gemmaService.analyzeKnowledgeBase(
      subjectId,
      materials.map((m) => m.id),
      allChunks
    );

    const kb: KnowledgeBase = {
      id: `kb-${subjectId}`,
      subjectId,
      materialIds: materials.map((m) => m.id),
      totalDocuments: materials.length,
      totalChunks: allChunks.length,
      totalPages: materials.reduce((acc, m) => acc + (m.totalPages || 0), 0),
      aiStatus: materials.length > 0 ? 'ready' : 'pending',
      lastIndexed: new Date().toISOString(),
    };
    db.upsertKnowledgeBase(kb);

    return res.json({ knowledgeBase: kb, analysis });
  });

  // ==========================================
  // SYLLABUS ANALYSIS (Gemma — real knowledge from uploads)
  // ==========================================

  // Analyze uploaded study material and return a structured SyllabusData
  // object grounded in the actual uploaded chunks for this subject.
  app.get('/api/subjects/:subjectId/syllabus', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const { subjectId } = req.params;

    try {
      const subjects = db.getSubjects();
      const subject = subjects.find((s) => s.id === subjectId);
      const subjectName = subject?.subject_name || 'Course Curriculum';

      // Try Supabase first for materials
      let materials = await SupabaseService.getStudyMaterials(subjectId);
      if (materials.length === 0) {
        // Fallback to local DB
        console.log('No materials in Supabase, falling back to local DB');
        materials = db.getStudyMaterials(subjectId);
      }

      if (!materials || materials.length === 0) {
        return res.status(404).json({ error: 'No study materials found for this subject. Please upload material first.' });
      }

      // Aggregate raw text from all processed chunks - fetch via unified loader
      const allChunks = await getChunksBySubjectId(subjectId, materials);
      if (allChunks.length === 0) {
        return res.status(404).json({ error: 'Study materials found but no chunks processed yet.' });
      }

      // Build a single raw text string from all chunks (cap at ~8000 chars to stay within token limits)
      const rawText = allChunks
        .map((c) => `[${c.heading}]\n${c.chunkContent}`)
        .join('\n\n')
        .substring(0, 8000);

      const syllabusData = await analyzeSyllabusText(
        subjectName,
        subject?.subject_code || 'COURSE-101',
        'Academic Curriculum',
        rawText
      );

      // Attach subject ID so the frontend can correlate
      syllabusData.id = subjectId;

      return res.json(syllabusData);
    } catch (err: any) {
      console.error('Error generating syllabus from uploaded material:', err);
      return res.status(500).json({ error: err.message || 'Failed to analyze study material' });
    }
  });

  // ==========================================
  // EXAMINATION BLUEPRINTS (Gemma Planner)
  // ==========================================

  // Get Blueprints for Subject
  app.get('/api/subjects/:subjectId/blueprints', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { subjectId } = req.params;
    const blueprints = db.getBlueprints(subjectId);
    return res.json(blueprints);
  });

  // Generate Examination Blueprint
  app.post('/api/subjects/:subjectId/blueprints', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const { subjectId } = req.params;
    const subjects = db.getSubjects();
    const subject = subjects.find((s) => s.id === subjectId);

    const materials = db.getStudyMaterials(subjectId);
    let allChunks: any[] = [];
    materials.forEach((m) => {
      allChunks = allChunks.concat(getProcessedChunks(m.processedPath));
    });

    const bp = await gemmaService.generateBlueprint(
      subjectId,
      subject?.subject_name || 'Subject Curriculum',
      allChunks
    );

    db.createBlueprint(bp);
    return res.json(bp);
  });

  // Publish/Update Blueprint Status
  app.put('/api/blueprints/:id/publish', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const updated = db.updateBlueprint(id, { status: 'published' });
    if (!updated) return res.status(404).json({ error: 'Blueprint not found' });
    return res.json(updated);
  });

  // ==========================================
  // VIVA SESSIONS ENDPOINTS
  // ==========================================

  app.get('/api/viva-sessions', authMiddleware, (req: AuthenticatedRequest, res) => {
    const sessions = db.getVivaSessions();
    return res.json(sessions);
  });

  app.post('/api/viva-sessions', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (req.user?.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can schedule viva sessions' });
    }

    const { subject_id, title, scheduled_date } = req.body;
    if (!subject_id || !title || !scheduled_date) {
      return res.status(400).json({ error: 'subject_id, title, and scheduled_date are required' });
    }

    const subjects = db.getSubjects();
    const subject = subjects.find((s) => s.id === subject_id);

    const newViva: VivaSessionModel = {
      id: `viva-${Date.now()}`,
      subject_id,
      subject_name: subject?.subject_name || 'General Subject',
      title,
      status: 'scheduled',
      scheduled_date,
      created_at: new Date().toISOString(),
    };

    const created = db.createVivaSession(newViva);
    return res.json(created);
  });

  app.put('/api/viva-sessions/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const updated = db.updateVivaSession(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Viva session not found' });
    return res.json(updated);
  });

  app.delete('/api/viva-sessions/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    db.deleteVivaSession(id);
    return res.json({ success: true, message: 'Viva session deleted' });
  });

  app.post('/api/viva-sessions/:id/duplicate', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const existing = db.getVivaSessions().find((v) => v.id === id);
    if (!existing) return res.status(404).json({ error: 'Viva session not found' });

    const duplicated: VivaSessionModel = {
      ...existing,
      id: `viva-${Date.now()}`,
      title: `${existing.title} (Copy)`,
      status: 'scheduled',
      created_at: new Date().toISOString(),
    };
    db.createVivaSession(duplicated);
    return res.json(duplicated);
  });

  // ==========================================
  // BACKEND READINESS STANDARDIZED ENDPOINTS
  // (Ready for local Gemma / FastAPI backend proxy)
  // ==========================================

  app.post('/api/upload', authMiddleware, (req: AuthenticatedRequest, res) => {
    return res.json({ status: 'success', message: 'Document uploaded successfully', fileId: `doc-${Date.now()}` });
  });

  app.post('/api/process-document', authMiddleware, (req: AuthenticatedRequest, res) => {
    return res.json({ status: 'completed', pages: 12, knowledgeUnits: 8, aiReadyStatus: 'Ready' });
  });

  app.post('/api/generate-blueprint', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const { subjectId, title } = req.body;
    return res.json({
      id: `bp-${Date.now()}`,
      subjectId: subjectId || 'subj-1',
      title: title || 'Oral Examination Blueprint',
      status: 'draft',
      generatedAt: new Date().toISOString(),
      strategyData: {
        overview: 'Automated Socratic testing plan generated by Gemma Planner.',
        estimatedDuration: '15-20 Mins',
        topics: ['Neural Networks', 'Attention Mechanics', 'Optimization', 'Loss Functions'],
      },
    });
  });

  app.post('/api/start-viva', authMiddleware, (req: AuthenticatedRequest, res) => {
    return res.json({
      status: 'IN_PROGRESS',
      sessionId: `sess-${Date.now()}`,
      initialQuestion: {
        questionId: 'q-1',
        topicTested: 'Foundational Concepts',
        questionText: 'Can you explain the mathematical foundation of attention mechanisms?',
        difficulty: 'Intermediate',
      },
    });
  });

  app.post('/api/next-question', authMiddleware, (req: AuthenticatedRequest, res) => {
    return res.json({
      questionId: `q-${Date.now()}`,
      topicTested: 'Self-Attention & Scaling',
      questionText: 'How does scaled dot-product attention prevent vanishing gradients during Softmax computation?',
      difficulty: 'Advanced',
    });
  });

  app.post('/api/evaluate-answer', authMiddleware, (req: AuthenticatedRequest, res) => {
    return res.json({
      isCorrect: true,
      conceptualAccuracy: 88,
      technicalRigor: 85,
      examinerNote: 'Good understanding demonstrated with solid precision.',
    });
  });

  app.post('/api/generate-report', authMiddleware, (req: AuthenticatedRequest, res) => {
    return res.json({
      status: 'generated',
      overallScore: 88,
      verdict: 'STRONG_PASS',
      readinessSummary: 'Demonstrated exceptional theoretical foundation and analytical reasoning.',
    });
  });

  // ==========================================
  // REPORTS ENDPOINTS
  // ==========================================

  app.get('/api/reports', authMiddleware, (req: AuthenticatedRequest, res) => {
    const reports = db.getReports();
    return res.json(reports);
  });

  app.post('/api/reports', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { student_id, student_name, viva_session_id, viva_title, score, report_json } = req.body;
    const newReport: ReportModel = {
      id: `rep-${Date.now()}`,
      student_id: student_id || req.user?.id || 'std-1',
      student_name: student_name || req.user?.full_name || 'Alex Rivera',
      viva_session_id: viva_session_id || 'viva-1',
      viva_title: viva_title || 'Oral Examination',
      score: score || 85,
      report_json: report_json || {},
      created_at: new Date().toISOString(),
    };
    const created = db.createReport(newReport);
    return res.json(created);
  });

  // ==========================================
  // LEGACY / SYLLABUS / AI ENDPOINTS
  // ==========================================

  app.post('/api/syllabus/analyze', async (req, res) => {
    try {
      const { title, code, domain, rawText } = req.body;
      if (!rawText || typeof rawText !== 'string') {
        return res.status(400).json({ error: 'rawText is required' });
      }
      const analyzed = await analyzeSyllabusText(title, code, domain, rawText);
      res.json(analyzed);
    } catch (error: any) {
      console.error('Error analyzing syllabus:', error);
      res.status(500).json({ error: error.message || 'Failed to analyze syllabus' });
    }
  });

  app.post('/api/viva/evaluate-turn', async (req, res) => {
    try {
      const { syllabus, persona, candidateName, academicLevel, history, candidateLatestAnswer, subjectId } = req.body;
      if (!syllabus || !persona || !candidateLatestAnswer) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      // Load chunks via unified loader (Supabase → in-memory cache → local files)
      const subjectChunks = subjectId
        ? await getChunksBySubjectId(subjectId, db.getStudyMaterials(subjectId))
        : [];
      const evaluationResult = await evaluateVivaTurn(
        syllabus,
        persona,
        candidateName || 'Candidate',
        academicLevel || 'Undergraduate',
        history || [],
        candidateLatestAnswer,
        subjectChunks   // ← grounding chunks passed through
      );
      res.json(evaluationResult);
    } catch (error: any) {
      console.error('Error evaluating turn:', error);
      res.status(500).json({ error: error.message || 'Failed to evaluate turn' });
    }
  });

  app.post('/api/viva/generate-report', async (req, res) => {
    try {
      const { syllabus, persona, candidateName, candidateId, academicLevel, turns, subjectId } = req.body;
      if (!syllabus || !persona || !turns) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      // Load chunks via unified loader (Supabase → in-memory cache → local files)
      const subjectChunks = subjectId
        ? await getChunksBySubjectId(subjectId, db.getStudyMaterials(subjectId))
        : [];

      const report = await generateFacultyReport(
        syllabus,
        persona,
        candidateName || 'Candidate',
        candidateId || 'STU-001',
        academicLevel || 'Undergraduate',
        turns,
        subjectChunks   // ← grounding chunks passed through
      );
      res.json(report);
    } catch (error: any) {
      console.error('Error generating report:', error);
      res.status(500).json({ error: error.message || 'Failed to generate report' });
    }
  });

  app.post('/api/viva/tts', async (req, res) => {
    try {
      const { text, voiceName } = req.body;
      if (!text) return res.status(400).json({ error: 'Text required' });
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: [{ parts: [{ text: `Speak as an academic examiner: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName || 'Zephyr' },
            },
          },
        },
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        res.json({ audio: base64Audio, mimeType: 'audio/pcm' });
      } else {
        res.json({ audio: null });
      }
    } catch (error: any) {
      console.warn('TTS API fallback:', error.message);
      res.json({ audio: null, fallback: true });
    }
  });

  // Mount Vite or Static middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KIA Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
