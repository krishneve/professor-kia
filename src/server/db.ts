import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { User, Teacher, Student, ClassModel, SubjectModel, EnrollmentModel, VivaSessionModel, ReportModel, StudyMaterial, KnowledgeBase, ExaminationBlueprint } from '../types';

interface DBData {
  users: User[];
  passwords: Record<string, string>; // userId -> hash
  teachers: Teacher[];
  students: Student[];
  classes: ClassModel[];
  subjects: SubjectModel[];
  enrollments: EnrollmentModel[];
  vivaSessions: VivaSessionModel[];
  reports: ReportModel[];
  studyMaterials: StudyMaterial[];
  knowledgeBases: KnowledgeBase[];
  blueprints: ExaminationBlueprint[];
}

const DB_FILE = path.join(process.cwd(), 'data', 'kia_db.json');

function ensureDirectoryExists(filePath: string) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

function loadDB(): DBData {
  try {
    ensureDirectoryExists(DB_FILE);
    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialSeedData();
      saveDB(initial);
      return initial;
    }
    const dataStr = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(dataStr);
    parsed.studyMaterials = parsed.studyMaterials || [];
    parsed.knowledgeBases = parsed.knowledgeBases || [];
    parsed.blueprints = parsed.blueprints || [];
    return parsed;
  } catch (err) {
    console.error('Failed to load DB, creating fresh seed:', err);
    const initial = getInitialSeedData();
    saveDB(initial);
    return initial;
  }
}

function saveDB(data: DBData): void {
  try {
    ensureDirectoryExists(DB_FILE);
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save DB:', err);
  }
}

function getInitialSeedData(): DBData {
  const teacherPassHash = bcrypt.hashSync('password123', 10);
  const studentPassHash = bcrypt.hashSync('password123', 10);

  const teacherUser: User = {
    id: 'usr-teacher-1',
    full_name: 'Prof. Sarah Jenkins',
    email: 'teacher@kia.edu',
    role: 'teacher',
    created_at: new Date().toISOString(),
  };

  const studentUser: User = {
    id: 'usr-student-1',
    full_name: 'Alex Rivera',
    email: 'student@kia.edu',
    role: 'student',
    created_at: new Date().toISOString(),
  };

  const teacher: Teacher = {
    teacher_id: 'tch-1',
    user_id: teacherUser.id,
    full_name: teacherUser.full_name,
    email: teacherUser.email,
  };

  const initialClass: ClassModel = {
    id: 'cls-1',
    class_name: 'AI & Machine Learning Batch 2027',
    class_code: 'AI2027A',
    semester: 'Semester 6',
    department: 'Computer Science & AI',
    teacher_id: teacher.teacher_id,
    teacher_name: teacherUser.full_name,
    created_at: new Date().toISOString(),
  };

  const student: Student = {
    student_id: 'std-1',
    user_id: studentUser.id,
    class_id: initialClass.id,
    full_name: studentUser.full_name,
    email: studentUser.email,
  };

  const subject1: SubjectModel = {
    id: 'sbj-1',
    subject_name: 'Deep Learning & Transformer Architectures',
    subject_code: 'CS-801',
    class_id: initialClass.id,
    class_name: initialClass.class_name,
    teacher_name: teacherUser.full_name,
    created_at: new Date().toISOString(),
  };

  const subject2: SubjectModel = {
    id: 'sbj-2',
    subject_name: 'Distributed Systems & Consensus',
    subject_code: 'CS-702',
    class_id: initialClass.id,
    class_name: initialClass.class_name,
    teacher_name: teacherUser.full_name,
    created_at: new Date().toISOString(),
  };

  const enrollment: EnrollmentModel = {
    id: 'enr-1',
    student_id: student.student_id,
    class_id: initialClass.id,
    created_at: new Date().toISOString(),
  };

  const viva1: VivaSessionModel = {
    id: 'viva-1',
    subject_id: subject1.id,
    subject_name: subject1.subject_name,
    title: 'Mid-Term Oral Assessment: Attention Mechanics',
    status: 'scheduled',
    scheduled_date: new Date(Date.now() + 86400000 * 2).toISOString(),
    created_at: new Date().toISOString(),
  };

  const viva2: VivaSessionModel = {
    id: 'viva-2',
    subject_id: subject2.id,
    subject_name: subject2.subject_name,
    title: 'Raft Protocol & Fault Tolerance Viva',
    status: 'completed',
    scheduled_date: new Date(Date.now() - 86400000 * 5).toISOString(),
    created_at: new Date().toISOString(),
  };

  const report1: ReportModel = {
    id: 'rep-1',
    student_id: student.student_id,
    student_name: studentUser.full_name,
    viva_session_id: viva2.id,
    viva_title: viva2.title,
    score: 88,
    report_json: {
      grade: 'Distinction',
      verdict: 'Passed Oral Examination with Distinction',
      readinessSummary: 'The candidate demonstrated outstanding conceptual understanding of Raft leader election and split-brain resolution.',
      keyStrengths: ['Accurate analysis of quorum requirements', 'Clear explanation of term monotonicity'],
      criticalMisconceptions: [],
    },
    created_at: new Date().toISOString(),
  };

  return {
    users: [teacherUser, studentUser],
    passwords: {
      [teacherUser.id]: teacherPassHash,
      [studentUser.id]: studentPassHash,
    },
    teachers: [teacher],
    students: [student],
    classes: [initialClass],
    subjects: [subject1, subject2],
    enrollments: [enrollment],
    vivaSessions: [viva1, viva2],
    reports: [report1],
    studyMaterials: [],
    knowledgeBases: [],
    blueprints: [],
  };
}

export const db = {
  getUsers: () => loadDB().users,
  findUserByEmail: (email: string) => loadDB().users.find((u) => u.email.toLowerCase() === email.toLowerCase()),
  findUserById: (id: string) => loadDB().users.find((u) => u.id === id),
  getUserPasswordHash: (userId: string) => loadDB().passwords[userId],
  
  createUser: (user: User, passwordHash: string) => {
    const current = loadDB();
    current.users.push(user);
    current.passwords[user.id] = passwordHash;
    saveDB(current);
    return user;
  },

  createTeacher: (teacher: Teacher) => {
    const current = loadDB();
    current.teachers.push(teacher);
    saveDB(current);
    return teacher;
  },

  createStudent: (student: Student) => {
    const current = loadDB();
    current.students.push(student);
    saveDB(current);
    return student;
  },

  getTeacherByUserId: (userId: string) => loadDB().teachers.find((t) => t.user_id === userId),
  getStudentByUserId: (userId: string) => loadDB().students.find((s) => s.user_id === userId),

  getClasses: () => {
    const current = loadDB();
    return current.classes.map((cls) => {
      const studentCount = current.enrollments.filter((e) => e.class_id === cls.id).length;
      return { ...cls, student_count: studentCount };
    });
  },

  getClassById: (id: string) => {
    const classes = db.getClasses();
    return classes.find((c) => c.id === id);
  },

  getClassByCode: (code: string) => {
    const classes = db.getClasses();
    return classes.find((c) => c.class_code.toUpperCase() === code.toUpperCase());
  },

  createClass: (newClass: ClassModel) => {
    const current = loadDB();
    current.classes.push(newClass);
    saveDB(current);
    return newClass;
  },

  getSubjects: () => loadDB().subjects,
  
  createSubject: (subject: SubjectModel) => {
    const current = loadDB();
    current.subjects.push(subject);
    saveDB(current);
    return subject;
  },

  updateSubject: (id: string, update: Partial<SubjectModel>) => {
    const current = loadDB();
    const idx = current.subjects.findIndex((s) => s.id === id);
    if (idx !== -1) {
      current.subjects[idx] = { ...current.subjects[idx], ...update };
      saveDB(current);
      return current.subjects[idx];
    }
    return null;
  },

  deleteSubject: (id: string) => {
    const current = loadDB();
    current.subjects = current.subjects.filter((s) => s.id !== id);
    saveDB(current);
    return true;
  },

  getEnrollments: () => loadDB().enrollments,

  enrollStudentInClass: (studentId: string, classId: string) => {
    const current = loadDB();
    const existing = current.enrollments.find((e) => e.student_id === studentId && e.class_id === classId);
    if (existing) return existing;

    const newEnrollment: EnrollmentModel = {
      id: `enr-${Date.now()}`,
      student_id: studentId,
      class_id: classId,
      created_at: new Date().toISOString(),
    };
    current.enrollments.push(newEnrollment);

    // Update student's class_id
    const stdIdx = current.students.findIndex((s) => s.student_id === studentId);
    if (stdIdx !== -1) {
      current.students[stdIdx].class_id = classId;
    }

    saveDB(current);
    return newEnrollment;
  },

  getStudentsForClass: (classId: string) => {
    const current = loadDB();
    const enrolledIds = current.enrollments.filter((e) => e.class_id === classId).map((e) => e.student_id);
    return current.students.filter((s) => enrolledIds.includes(s.student_id));
  },

  getVivaSessions: () => loadDB().vivaSessions,

  createVivaSession: (viva: VivaSessionModel) => {
    const current = loadDB();
    current.vivaSessions.push(viva);
    saveDB(current);
    return viva;
  },

  updateVivaSession: (id: string, update: Partial<VivaSessionModel>) => {
    const current = loadDB();
    const idx = current.vivaSessions.findIndex((v) => v.id === id);
    if (idx !== -1) {
      current.vivaSessions[idx] = { ...current.vivaSessions[idx], ...update };
      saveDB(current);
      return current.vivaSessions[idx];
    }
    return null;
  },

  deleteVivaSession: (id: string) => {
    const current = loadDB();
    current.vivaSessions = current.vivaSessions.filter((v) => v.id !== id);
    saveDB(current);
    return true;
  },

  getReports: () => loadDB().reports,

  createReport: (report: ReportModel) => {
    const current = loadDB();
    current.reports.push(report);
    saveDB(current);
    return report;
  },

  // Study Materials Methods
  getStudyMaterials: (subjectId?: string) => {
    const current = loadDB();
    if (subjectId) {
      return current.studyMaterials.filter((m) => m.subjectId === subjectId);
    }
    return current.studyMaterials;
  },

  getStudyMaterialById: (id: string) => {
    const current = loadDB();
    return current.studyMaterials.find((m) => m.id === id);
  },

  createStudyMaterial: (material: StudyMaterial) => {
    const current = loadDB();
    current.studyMaterials.push(material);
    saveDB(current);
    return material;
  },

  updateStudyMaterial: (id: string, update: Partial<StudyMaterial>) => {
    const current = loadDB();
    const idx = current.studyMaterials.findIndex((m) => m.id === id);
    if (idx !== -1) {
      current.studyMaterials[idx] = { ...current.studyMaterials[idx], ...update };
      saveDB(current);
      return current.studyMaterials[idx];
    }
    return null;
  },

  deleteStudyMaterial: (id: string) => {
    const current = loadDB();
    current.studyMaterials = current.studyMaterials.filter((m) => m.id !== id);
    saveDB(current);
    return true;
  },

  // Knowledge Base Methods
  getKnowledgeBaseBySubjectId: (subjectId: string): KnowledgeBase => {
    const current = loadDB();
    const existing = current.knowledgeBases.find((kb) => kb.subjectId === subjectId);
    if (existing) return existing;

    const materials = current.studyMaterials.filter((m) => m.subjectId === subjectId);
    const totalDocs = materials.length;
    const totalPages = materials.reduce((acc, m) => acc + (m.totalPages || 0), 0);
    const totalChunks = materials.reduce((acc, m) => acc + (m.totalChunks || 0), 0);

    const newKb: KnowledgeBase = {
      id: `kb-${subjectId}`,
      subjectId,
      materialIds: materials.map((m) => m.id),
      totalDocuments: totalDocs,
      totalChunks,
      totalPages,
      aiStatus: totalDocs > 0 ? 'ready' : 'pending',
      lastIndexed: new Date().toISOString(),
    };
    current.knowledgeBases.push(newKb);
    saveDB(current);
    return newKb;
  },

  upsertKnowledgeBase: (kb: KnowledgeBase) => {
    const current = loadDB();
    const idx = current.knowledgeBases.findIndex((item) => item.subjectId === kb.subjectId);
    if (idx !== -1) {
      current.knowledgeBases[idx] = kb;
    } else {
      current.knowledgeBases.push(kb);
    }
    saveDB(current);
    return kb;
  },

  // Examination Blueprint Methods
  getBlueprints: (subjectId?: string) => {
    const current = loadDB();
    if (subjectId) {
      return current.blueprints.filter((bp) => bp.subjectId === subjectId);
    }
    return current.blueprints;
  },

  getBlueprintById: (id: string) => {
    const current = loadDB();
    return current.blueprints.find((bp) => bp.id === id);
  },

  createBlueprint: (blueprint: ExaminationBlueprint) => {
    const current = loadDB();
    current.blueprints.push(blueprint);
    saveDB(current);
    return blueprint;
  },

  updateBlueprint: (id: string, update: Partial<ExaminationBlueprint>) => {
    const current = loadDB();
    const idx = current.blueprints.findIndex((bp) => bp.id === id);
    if (idx !== -1) {
      current.blueprints[idx] = { ...current.blueprints[idx], ...update };
      saveDB(current);
      return current.blueprints[idx];
    }
    return null;
  },
};
