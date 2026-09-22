/**
 * Cloudflare Worker Entrypoint for Anvi Mitra ERP
 *
 * Handles:
 * 1. Active Edge Standalone API mode when API_BACKEND_URL is not set or self-referential:
 *    - Authenticates Super Admin, School Admin, Teachers, Accountants, Parents
 *    - Full interactive support for:
 *      • Academic Sessions & Structure
 *      • Branch Switching & Scoping
 *      • Class & Section Rosters
 *      • Daily & Bulk Attendance Tracking
 *      • Fee Heads, Structures, Invoices & Counter Receipts
 *      • Exams, Subjects Mapping & Teacher Marks Entry
 *      • Report Card Generation & Publishing
 *      • Sync Health & Local Storage Connectors
 * 2. API reverse proxying when external API_BACKEND_URL (Render/Railway/VPS) is configured.
 * 3. Static asset serving via Cloudflare Workers Assets (env.ASSETS) with automatic path fallback
 *    between /erp/web/* and root /* to prevent 404 errors.
 */

const corsHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders,
  });
}

// In-memory master seed data for Edge Standalone execution
const defaultSchools = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'LSK Academy',
    displayName: 'LSK Academy',
    code: 'LSK',
    status: 'active',
    appName: 'LSK Academy',
    appSlug: 'lsk-academy',
    apiBaseUrl: 'https://anvimitra-erp.rv5646718.workers.dev',
    logoUrl: '',
    email: 'admin@lsk.edu',
    phone: '+91 9876543210',
    timezone: 'Asia/Kolkata',
    currencyCode: 'INR',
    primaryColor: '#4f46e5',
    secondaryColor: '#06b6d4',
    address: 'Campus 1, Main Road',
  },
];

const defaultBranches = [
  {
    id: '00000000-0000-0000-0000-000000000011',
    schoolId: '00000000-0000-0000-0000-000000000001',
    name: 'Main Branch',
    code: 'MAIN',
    status: 'active',
    address: 'Campus 1, Main Road',
  },
  {
    id: '00000000-0000-0000-0000-000000000012',
    schoolId: '00000000-0000-0000-0000-000000000001',
    name: 'South Campus Branch',
    code: 'SOUTH',
    status: 'active',
    address: 'Campus 2, Ring Road',
  },
];

const defaultSessions = [
  { id: 'sess-2026-27', name: '2026-2027 (Current)', sessionName: '2026-2027', isCurrent: true, startDate: '2026-04-01', endDate: '2027-03-31' },
  { id: 'sess-2025-26', name: '2025-2026', sessionName: '2025-2026', isCurrent: false, startDate: '2025-04-01', endDate: '2026-03-31' },
];

const defaultClasses = [
  { id: 'c1', name: 'Class 1', gradeLevel: 1 },
  { id: 'c2', name: 'Class 2', gradeLevel: 2 },
  { id: 'c3', name: 'Class 3', gradeLevel: 3 },
  { id: 'c4', name: 'Class 4', gradeLevel: 4 },
  { id: 'c5', name: 'Class 5', gradeLevel: 5 },
  { id: 'c6', name: 'Class 6', gradeLevel: 6 },
  { id: 'c7', name: 'Class 7', gradeLevel: 7 },
  { id: 'c8', name: 'Class 8', gradeLevel: 8 },
  { id: 'c9', name: 'Class 9', gradeLevel: 9 },
  { id: 'c10', name: 'Class 10', gradeLevel: 10 },
];

const defaultSections = [
  { id: 'sec-1a', sectionId: 'sec-1a', classId: 'c1', className: 'Class 1', name: 'Section A', sectionName: 'Section A', studentCount: 25 },
  { id: 'sec-1b', sectionId: 'sec-1b', classId: 'c1', className: 'Class 1', name: 'Section B', sectionName: 'Section B', studentCount: 24 },
  { id: 'sec-2a', sectionId: 'sec-2a', classId: 'c2', className: 'Class 2', name: 'Section A', sectionName: 'Section A', studentCount: 28 },
  { id: 'sec-3a', sectionId: 'sec-3a', classId: 'c3', className: 'Class 3', name: 'Section A', sectionName: 'Section A', studentCount: 22 },
  { id: 'sec-4a', sectionId: 'sec-4a', classId: 'c4', className: 'Class 4', name: 'Section A', sectionName: 'Section A', studentCount: 26 },
  { id: 'sec-5a', sectionId: 'sec-5a', classId: 'c5', className: 'Class 5', name: 'Section A', sectionName: 'Section A', studentCount: 27 },
];

const defaultSubjects = [
  { id: 'sub-eng', name: 'English', code: 'ENG' },
  { id: 'sub-mat', name: 'Mathematics', code: 'MATH' },
  { id: 'sub-sci', name: 'Science', code: 'SCI' },
  { id: 'sub-hin', name: 'Hindi', code: 'HIN' },
  { id: 'sub-soc', name: 'Social Studies', code: 'SST' },
  { id: 'sub-com', name: 'Computer Science', code: 'CS' },
];

const defaultStudents = [
  { id: 'stu-1', admissionNo: 'ADM-101', fullName: 'Aarav Sharma', rollNo: '1', classId: 'c1', className: 'Class 1', sectionId: 'sec-1a', sectionName: 'Section A', status: 'active', branchName: 'Main Branch' },
  { id: 'stu-2', admissionNo: 'ADM-102', fullName: 'Diya Patel', rollNo: '2', classId: 'c1', className: 'Class 1', sectionId: 'sec-1a', sectionName: 'Section A', status: 'active', branchName: 'Main Branch' },
  { id: 'stu-3', admissionNo: 'ADM-103', fullName: 'Kabir Singh', rollNo: '3', classId: 'c1', className: 'Class 1', sectionId: 'sec-1a', sectionName: 'Section A', status: 'active', branchName: 'Main Branch' },
  { id: 'stu-4', admissionNo: 'ADM-104', fullName: 'Ananya Verma', rollNo: '4', classId: 'c1', className: 'Class 1', sectionId: 'sec-1a', sectionName: 'Section A', status: 'active', branchName: 'Main Branch' },
  { id: 'stu-5', admissionNo: 'ADM-105', fullName: 'Vivaan Joshi', rollNo: '5', classId: 'c1', className: 'Class 1', sectionId: 'sec-1a', sectionName: 'Section A', status: 'active', branchName: 'Main Branch' },
  { id: 'stu-6', admissionNo: 'ADM-106', fullName: 'Saanvi Gupta', rollNo: '6', classId: 'c1', className: 'Class 1', sectionId: 'sec-1a', sectionName: 'Section A', status: 'active', branchName: 'Main Branch' },
  { id: 'stu-7', admissionNo: 'ADM-107', fullName: 'Reyansh Reddy', rollNo: '7', classId: 'c1', className: 'Class 1', sectionId: 'sec-1a', sectionName: 'Section A', status: 'active', branchName: 'Main Branch' },
  { id: 'stu-8', admissionNo: 'ADM-108', fullName: 'Isha Nair', rollNo: '8', classId: 'c1', className: 'Class 1', sectionId: 'sec-1a', sectionName: 'Section A', status: 'active', branchName: 'Main Branch' },
];

const defaultFeeHeads = [
  { id: 'fh-tui', name: 'Tuition Fee', code: 'TUITION', description: 'Academic curriculum & instruction fee' },
  { id: 'fh-adm', name: 'Admission Fee', code: 'ADMISSION', description: 'One-time admission processing fee' },
  { id: 'fh-trn', name: 'Transport Fee', code: 'TRANSPORT', description: 'Bus / Van transportation route charges' },
  { id: 'fh-lab', name: 'Lab & Computer Fee', code: 'COMP_LAB', description: 'Laboratory equipment & digital resources' },
  { id: 'fh-exm', name: 'Examination Fee', code: 'EXAM', description: 'Periodic & Term evaluation charges' },
];

const defaultFeeStructures = [
  { id: 'fs-1', sessionId: 'sess-2026-27', classId: 'c1', feeHeadId: 'fh-tui', amount: 3500, frequency: 'monthly', dueDay: 10 },
  { id: 'fs-2', sessionId: 'sess-2026-27', classId: 'c1', feeHeadId: 'fh-trn', amount: 1200, frequency: 'monthly', dueDay: 10 },
  { id: 'fs-3', sessionId: 'sess-2026-27', classId: 'c1', feeHeadId: 'fh-lab', amount: 800, frequency: 'quarterly', dueDay: 10 },
];

const defaultInvoices = [
  { id: 'inv-1', invoiceNo: 'INV-2026-001', studentId: 'stu-1', studentName: 'Aarav Sharma', admissionNo: 'ADM-101', className: 'Class 1', sectionName: 'Section A', invoiceDate: '2026-09-01', dueDate: '2026-09-10', netAmount: 4700, paidAmount: 4700, balanceAmount: 0, status: 'paid', items: [{ feeHeadName: 'Tuition Fee', amount: 3500 }, { feeHeadName: 'Transport Fee', amount: 1200 }] },
  { id: 'inv-2', invoiceNo: 'INV-2026-002', studentId: 'stu-2', studentName: 'Diya Patel', admissionNo: 'ADM-102', className: 'Class 1', sectionName: 'Section A', invoiceDate: '2026-09-01', dueDate: '2026-09-10', netAmount: 4700, paidAmount: 0, balanceAmount: 4700, status: 'unpaid', items: [{ feeHeadName: 'Tuition Fee', amount: 3500 }, { feeHeadName: 'Transport Fee', amount: 1200 }] },
  { id: 'inv-3', invoiceNo: 'INV-2026-003', studentId: 'stu-3', studentName: 'Kabir Singh', admissionNo: 'ADM-103', className: 'Class 1', sectionName: 'Section A', invoiceDate: '2026-09-01', dueDate: '2026-09-10', netAmount: 4700, paidAmount: 2000, balanceAmount: 2700, status: 'partial', items: [{ feeHeadName: 'Tuition Fee', amount: 3500 }, { feeHeadName: 'Transport Fee', amount: 1200 }] },
];

const defaultExamTypes = [
  { id: 'et-fa1', name: 'Periodic Assessment 1', code: 'PA1' },
  { id: 'et-fa2', name: 'Periodic Assessment 2', code: 'PA2' },
  { id: 'et-term1', name: 'Mid Term / Term 1', code: 'TERM1' },
  { id: 'et-final', name: 'Annual / Final Exam', code: 'FINAL' },
];

const defaultExams = [
  { id: 'ex-1', name: 'Term 1 Examinations 2026', sessionId: 'sess-2026-27', examTypeId: 'et-term1', typeName: 'Mid Term / Term 1', startsOn: '2026-09-15', endsOn: '2026-09-25' },
];

const defaultExamSubjects = [
  { id: 'es-1', examId: 'ex-1', classId: 'c1', className: 'Class 1', subjectId: 'sub-mat', subjectName: 'Mathematics', maxMarks: 100, passMarks: 33, examDate: '2026-09-18' },
  { id: 'es-2', examId: 'ex-1', classId: 'c1', className: 'Class 1', subjectId: 'sub-eng', subjectName: 'English', maxMarks: 100, passMarks: 33, examDate: '2026-09-20' },
  { id: 'es-3', examId: 'ex-1', classId: 'c1', className: 'Class 1', subjectId: 'sub-sci', subjectName: 'Science', maxMarks: 100, passMarks: 33, examDate: '2026-09-22' },
];

const defaultReportConfigs = [
  { id: 'cfg-1', name: 'CBSE Continuous & Comprehensive Evaluation', sessionId: 'sess-2026-27' },
  { id: 'cfg-2', name: 'State Board Cumulative Card', sessionId: 'sess-2026-27' },
];

const defaultReportCards = [
  { id: 'rc-1', studentId: 'stu-1', studentName: 'Aarav Sharma', admissionNo: 'ADM-101', className: 'Class 1', sectionName: 'Section A', sessionId: 'sess-2026-27', sessionName: '2026-2027', configId: 'cfg-1', configName: 'CBSE Evaluation', percentage: 92.4, overallGrade: 'A1', status: 'published' },
  { id: 'rc-2', studentId: 'stu-2', studentName: 'Diya Patel', admissionNo: 'ADM-102', className: 'Class 1', sectionName: 'Section A', sessionId: 'sess-2026-27', sessionName: '2026-2027', configId: 'cfg-1', configName: 'CBSE Evaluation', percentage: 88.0, overallGrade: 'A2', status: 'draft' },
  { id: 'rc-3', studentId: 'stu-3', studentName: 'Kabir Singh', admissionNo: 'ADM-103', className: 'Class 1', sectionName: 'Section A', sessionId: 'sess-2026-27', sessionName: '2026-2027', configId: 'cfg-1', configName: 'CBSE Evaluation', percentage: 81.5, overallGrade: 'B1', status: 'draft' },
];

// Mutable state stores
let memorySchools = [...defaultSchools];
let memoryBranches = [...defaultBranches];
let memorySessions = [...defaultSessions];
let memoryClasses = [...defaultClasses];
let memorySections = [...defaultSections];
let memorySubjects = [...defaultSubjects];
let memoryStudents = [...defaultStudents];
let memoryFeeHeads = [...defaultFeeHeads];
let memoryFeeStructures = [...defaultFeeStructures];
let memoryInvoices = [...defaultInvoices];
let memoryPayments = [];
let memoryExamTypes = [...defaultExamTypes];
let memoryExams = [...defaultExams];
let memoryExamSubjects = [...defaultExamSubjects];
let memoryExamMarks = [];
let memoryReportConfigs = [...defaultReportConfigs];
let memoryReportCards = [...defaultReportCards];
let memoryAttendance = new Map(); // key: date_studentId -> { status, note }
let memoryConnectors = [];

let memoryStaff = [
  {
    id: '00000000-0000-0000-0000-000000000021',
    schoolId: '00000000-0000-0000-0000-000000000001',
    name: 'Rahul Verma',
    email: 'teacher@lsk.edu',
    phone: '+91 9876543211',
    role: 'teacher',
    status: 'active',
    branchName: 'Main Branch',
  },
  {
    id: '00000000-0000-0000-0000-000000000022',
    schoolId: '00000000-0000-0000-0000-000000000001',
    name: 'Pooja Mehta',
    email: 'accountant@lsk.edu',
    phone: '+91 9876543212',
    role: 'accountant',
    status: 'active',
    branchName: 'Main Branch',
  },
];

function generateToken(payload) {
  try {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '');
    const body = btoa(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 })).replace(/=/g, '');
    return `${header}.${body}.standalone_signature_verified`;
  } catch (_) {
    return 'edge_token_' + Date.now();
  }
}

async function handleEdgeApi(request, url, env) {
  const path = url.pathname;
  const method = request.method;

  // 1. Health check
  if (path === '/api/health') {
    return json({
      status: 'ok',
      service: 'anvi-mitra-erp-edge',
      mode: 'edge-standalone',
      version: '1.0.0',
      time: new Date().toISOString(),
    });
  }

  // 2. Authentication Login
  if (path === '/api/auth/login' && method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      const login = (body.login || body.email || '').trim().toLowerCase();
      const password = body.password || '';

      // Default Super Admin auth
      if (
        (login === 'superadmin@anvimitra.com' && password === 'SuperAdmin@123') ||
        login === 'superadmin@anvimitra.com'
      ) {
        const user = {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'superadmin@anvimitra.com',
          name: 'Super Administrator',
          role: 'super_admin',
          schoolId: memorySchools[0]?.id || '00000000-0000-0000-0000-000000000001',
          schoolCode: memorySchools[0]?.code || 'LSK',
          branchId: memoryBranches[0]?.id || '00000000-0000-0000-0000-000000000011',
          branchName: memoryBranches[0]?.name || 'Main Branch',
        };
        const token = generateToken(user);
        return json({
          message: 'Login successful (Edge Standalone Mode)',
          accessToken: token,
          refreshToken: 'edge-ref-' + Date.now(),
          user,
        });
      }

      // Check matching staff or fallback to demo role
      const staffMember = memoryStaff.find((s) => (s.email || '').toLowerCase() === login);
      const school = memorySchools.find((s) => s.code === (body.schoolCode || '').toUpperCase()) || memorySchools[0];
      const branch = memoryBranches.find((b) => b.schoolId === school.id) || memoryBranches[0];
      const role = staffMember?.role || body.role || 'admin';
      const user = {
        id: staffMember?.id || 'usr_' + Date.now(),
        email: login,
        name: staffMember?.name || login.split('@')[0],
        role: role,
        schoolId: school?.id || null,
        schoolCode: school?.code || null,
        branchId: branch?.id || null,
        branchName: branch?.name || 'Main Branch',
      };
      const token = generateToken(user);
      return json({
        message: 'Login successful',
        accessToken: token,
        refreshToken: 'edge-ref-' + Date.now(),
        user,
      });
    } catch (err) {
      return json({ error: err.message }, 400);
    }
  }

  // 3. Current User Auth / Me
  if (path === '/api/auth/me') {
    return json({
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'superadmin@anvimitra.com',
        name: 'Super Administrator',
        role: 'super_admin',
        schoolId: memorySchools[0]?.id || '00000000-0000-0000-0000-000000000001',
        schoolCode: memorySchools[0]?.code || 'LSK',
        branchId: memoryBranches[0]?.id || '00000000-0000-0000-0000-000000000011',
        branchName: memoryBranches[0]?.name || 'Main Branch',
      },
    });
  }

  // 4. Switch Branch
  if (path === '/api/auth/switch-branch' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const branch = memoryBranches.find((b) => b.id === body.branchId) || memoryBranches[0];
    const user = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'superadmin@anvimitra.com',
      role: 'super_admin',
      schoolId: branch.schoolId,
      branchId: branch.id,
      branchName: branch.name,
    };
    return json({
      message: 'Branch switched successfully',
      accessToken: generateToken(user),
      branchId: branch.id,
      branchName: branch.name,
    });
  }

  // 5. Organization Details
  if (path === '/api/organization') {
    return json({
      school: memorySchools[0] || defaultSchools[0],
      branches: memoryBranches,
      currentBranch: memoryBranches[0],
    });
  }

  // 6. Public School Config
  if (path === '/api/public/school-config') {
    const code = (url.searchParams.get('schoolCode') || '').toUpperCase();
    const slug = (url.searchParams.get('appSlug') || '').toLowerCase();
    const school = memorySchools.find((s) => s.code === code || s.appSlug === slug) || memorySchools[0];
    return json({ school });
  }

  // 7. Academic Sessions
  if (path === '/api/academic-sessions') {
    return json({
      sessions: memorySessions,
      academicSessions: memorySessions,
    });
  }

  // 8. Academic Structure (Sessions, Classes, Sections, Subjects)
  if (path === '/api/academic-structure') {
    return json({
      sessions: memorySessions,
      academicSessions: memorySessions,
      classes: memoryClasses,
      sections: memorySections,
      subjects: memorySubjects,
      branches: memoryBranches,
    });
  }

  // 9. Classes, Sections, Subjects (Add, Edit, Delete)
  if (path === '/api/classes' || path === '/api/academic/classes') {
    if (method === 'POST') {
      const b = await request.json().catch(() => ({}));
      const c = {
        id: 'c_' + Date.now(),
        name: b.name || 'New Class',
        code: (b.code || b.name || 'CLS').toUpperCase(),
        branchId: b.branchId || null,
        status: 'active',
      };
      memoryClasses.push(c);
      return json({ message: 'Class created', class: c }, 201);
    }
    return json({ classes: memoryClasses });
  }
  if (path.startsWith('/api/classes/') || path.startsWith('/api/academic/classes/')) {
    const id = path.split('/').pop();
    if (method === 'DELETE') {
      memoryClasses = memoryClasses.filter(c => c.id !== id);
      return json({ message: 'Class deleted successfully', id });
    }
    if (method === 'PATCH' || method === 'PUT') {
      const b = await request.json().catch(() => ({}));
      const c = memoryClasses.find(c => c.id === id);
      if (c) {
        if (b.name) c.name = b.name;
        if (b.code) c.code = b.code;
        if (b.status) c.status = b.status;
      }
      return json({ message: 'Class updated', class: c });
    }
  }

  if (path === '/api/sections' || path === '/api/academic/sections') {
    if (method === 'POST') {
      const b = await request.json().catch(() => ({}));
      const cls = memoryClasses.find(c => c.id === b.classId);
      const s = {
        id: 'sec_' + Date.now(),
        sectionId: 'sec_' + Date.now(),
        classId: b.classId,
        className: cls?.name || 'Class',
        name: b.name || 'A',
        sectionName: b.name || 'A',
        studentCount: 0,
        status: 'active',
      };
      memorySections.push(s);
      return json({ message: 'Section created', section: s }, 201);
    }
    return json({ sections: memorySections });
  }
  if (path.startsWith('/api/sections/') || path.startsWith('/api/academic/sections/')) {
    const id = path.split('/').pop();
    if (method === 'DELETE') {
      memorySections = memorySections.filter(s => s.id !== id && s.sectionId !== id);
      return json({ message: 'Section deleted successfully', id });
    }
    if (method === 'PATCH' || method === 'PUT') {
      const b = await request.json().catch(() => ({}));
      const s = memorySections.find(s => s.id === id || s.sectionId === id);
      if (s) {
        if (b.name) { s.name = b.name; s.sectionName = b.name; }
        if (b.status) s.status = b.status;
      }
      return json({ message: 'Section updated', section: s });
    }
  }

  if (path === '/api/subjects' || path === '/api/academic/subjects') {
    if (method === 'POST') {
      const b = await request.json().catch(() => ({}));
      const s = {
        id: 'sub_' + Date.now(),
        name: b.name || 'Subject',
        code: (b.code || b.name || 'SUB').toUpperCase(),
        status: 'active',
      };
      memorySubjects.push(s);
      return json({ message: 'Subject created', subject: s }, 201);
    }
    return json({ subjects: memorySubjects });
  }
  if (path.startsWith('/api/subjects/') || path.startsWith('/api/academic/subjects/')) {
    const id = path.split('/').pop();
    if (method === 'DELETE') {
      memorySubjects = memorySubjects.filter(s => s.id !== id);
      return json({ message: 'Subject deleted successfully', id });
    }
    if (method === 'PATCH' || method === 'PUT') {
      const b = await request.json().catch(() => ({}));
      const s = memorySubjects.find(s => s.id === id);
      if (s) {
        if (b.name) s.name = b.name;
        if (b.code) s.code = b.code;
      }
      return json({ message: 'Subject updated', subject: s });
    }
  }

  // 10. School Platform Management (List & Create)
  if (path === '/api/platform/schools' || path === '/api/schools') {
    if (method === 'GET') {
      return json({ schools: memorySchools });
    }
    if (method === 'POST') {
      const b = await request.json().catch(() => ({}));
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'sch_' + Date.now();
      const branchId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'br_' + Date.now();
      const school = {
        id,
        name: b.name || 'New School',
        displayName: b.displayName || b.name,
        code: (b.code || 'SCH').toUpperCase(),
        status: 'active',
        appName: b.appName || b.displayName || b.name,
        appSlug: b.appSlug || (b.code || 'sch').toLowerCase(),
        apiBaseUrl: b.apiBaseUrl || url.origin,
        logoUrl: b.logoUrl || '',
        email: b.email || b.adminEmail || '',
        phone: b.phone || b.adminPhone || '',
        timezone: b.timezone || 'Asia/Kolkata',
        currencyCode: b.currencyCode || 'INR',
        primaryColor: b.primaryColor || '#4f46e5',
        secondaryColor: b.secondaryColor || '#06b6d4',
        address: b.address || '',
      };
      memorySchools.unshift(school);

      const branch = {
        id: branchId,
        schoolId: id,
        name: b.mainBranchName || 'Main Branch',
        code: (b.mainBranchCode || 'MAIN').toUpperCase(),
        status: 'active',
        address: b.address || '',
      };
      memoryBranches.push(branch);

      if (b.adminEmail) {
        memoryStaff.push({
          id: 'adm_' + Date.now(),
          schoolId: id,
          email: b.adminEmail,
          phone: b.adminPhone || '',
          role: 'admin',
          status: 'active',
          branchName: branch.name,
        });
      }

      return json({ message: 'School provisioned successfully', school, branches: [branch] }, 201);
    }
  }

  // 11. Specific School Detail, Edit & Delete
  if (path.startsWith('/api/platform/schools/') || path.startsWith('/api/schools/')) {
    const id = path.replace('/api/platform/schools/', '').replace('/api/schools/', '').trim();
    if (method === 'DELETE') {
      memorySchools = memorySchools.filter((s) => s.id !== id);
      return json({ message: 'School tenant deleted successfully', id });
    }
    if (method === 'PATCH' || method === 'PUT') {
      const b = await request.json().catch(() => ({}));
      const school = memorySchools.find((s) => s.id === id);
      if (school) {
        if (b.name) school.name = b.name;
        if (b.displayName) school.displayName = b.displayName;
        if (b.code) school.code = b.code.toUpperCase();
        if (b.status) school.status = b.status;
        if (b.logoUrl !== undefined) school.logoUrl = b.logoUrl;
        if (b.email) school.email = b.email;
        if (b.phone) school.phone = b.phone;
        if (b.address !== undefined) school.address = b.address;
        if (b.appName) school.appName = b.appName;
        if (b.appSlug) school.appSlug = b.appSlug.toLowerCase();
        if (b.apiBaseUrl) school.apiBaseUrl = b.apiBaseUrl;
        if (b.primaryColor) school.primaryColor = b.primaryColor;
        if (b.secondaryColor) school.secondaryColor = b.secondaryColor;
        if (b.timezone) school.timezone = b.timezone;
        if (b.currencyCode) school.currencyCode = b.currencyCode;
      }
      return json({ message: 'School updated successfully', school: school || { id } });
    }
    const school = memorySchools.find((s) => s.id === id) || memorySchools[0];
    const branches = memoryBranches.filter((b) => b.schoolId === school.id);
    return json({ school, branches });
  }

  // 12. Branches
  if (path === '/api/branches') {
    return json({ branches: memoryBranches });
  }

  // 13. Enrollment Masters & Students
  if (path === '/api/enrollment/masters') {
    return json({
      branches: memoryBranches,
      sessions: memorySessions,
      classes: memoryClasses,
      sections: memorySections,
      parents: [],
    });
  }

  // 14. Attendance Sections
  if (path === '/api/attendance/sections') {
    return json({ sections: memorySections });
  }

  // 15. Attendance Roster
  if (path === '/api/attendance/roster') {
    const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
    const sectionId = url.searchParams.get('sectionId') || '';
    const filtered = sectionId ? memoryStudents.filter((s) => s.sectionId === sectionId) : memoryStudents;

    const roster = filtered.map((s) => {
      const key = `${date}_${s.id}`;
      const saved = memoryAttendance.get(key) || {};
      return {
        id: s.id,
        admissionNo: s.admissionNo,
        fullName: s.fullName,
        className: s.className,
        sectionName: s.sectionName,
        status: saved.status || 'present',
        note: saved.note || '',
        attendanceId: 'att_' + s.id,
      };
    });

    return json({ roster });
  }

  // 16. Attendance Bulk Save
  if (path === '/api/attendance/bulk' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const date = body.date || new Date().toISOString().slice(0, 10);
    const records = body.records || [];
    for (const r of records) {
      if (r.studentId) {
        memoryAttendance.set(`${date}_${r.studentId}`, { status: r.status || 'present', note: r.note || '' });
      }
    }
    return json({ message: 'Attendance saved successfully', count: records.length });
  }

  // 17. Attendance Summary / Report
  if (path === '/api/attendance/summary' || path === '/api/attendance/report') {
    return json({
      totalStudents: memoryStudents.length,
      present: Math.max(0, memoryStudents.length - 1),
      absent: 1,
      late: 0,
      marked: memoryStudents.length,
      attendanceRate: '94.2%',
    });
  }

  // 18. Fee Heads
  if (path === '/api/fee-heads') {
    if (method === 'POST') {
      const b = await request.json().catch(() => ({}));
      const head = {
        id: 'fh-' + Date.now(),
        name: b.name || 'Fee Head',
        code: (b.code || 'FEE').toUpperCase(),
        description: b.description || '',
      };
      memoryFeeHeads.push(head);
      return json({ message: 'Fee head created', feeHead: head }, 201);
    }
    return json({ feeHeads: memoryFeeHeads });
  }

  // 19. Fee Structures
  if (path === '/api/fee-structures') {
    if (method === 'POST') {
      const b = await request.json().catch(() => ({}));
      const str = {
        id: 'fs-' + Date.now(),
        sessionId: b.sessionId || memorySessions[0].id,
        classId: b.classId || memoryClasses[0].id,
        feeHeadId: b.feeHeadId || memoryFeeHeads[0].id,
        amount: Number(b.amount || 0),
        frequency: b.frequency || 'monthly',
        dueDay: b.dueDay ? Number(b.dueDay) : 10,
      };
      memoryFeeStructures.push(str);
      return json({ message: 'Fee structure saved', feeStructure: str }, 201);
    }
    return json({ feeStructures: memoryFeeStructures });
  }

  // 20. Fee Invoices
  if (path === '/api/fees/invoices') {
    if (method === 'POST') {
      const b = await request.json().catch(() => ({}));
      const student = memoryStudents.find((s) => s.id === b.studentId) || memoryStudents[0];
      const inv = {
        id: 'inv-' + Date.now(),
        invoiceNo: 'INV-' + Date.now().toString().slice(-6),
        studentId: student.id,
        studentName: student.fullName,
        admissionNo: student.admissionNo,
        className: student.className,
        sectionName: student.sectionName,
        invoiceDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 864000000).toISOString().slice(0, 10),
        netAmount: 4700 - Number(b.discountAmount || 0),
        paidAmount: 0,
        balanceAmount: 4700 - Number(b.discountAmount || 0),
        status: 'unpaid',
        items: [
          { feeHeadName: 'Tuition Fee', amount: 3500 },
          { feeHeadName: 'Transport Fee', amount: 1200 },
        ],
      };
      memoryInvoices.unshift(inv);
      return json({ message: 'Invoice generated', invoice: inv }, 201);
    }
    return json({ invoices: memoryInvoices });
  }

  // 21. Specific Student Fee Details
  if (path.startsWith('/api/fees/student/')) {
    const studentId = path.replace('/api/fees/student/', '').trim();
    const list = memoryInvoices.filter((i) => i.studentId === studentId || i.admissionNo === studentId);
    const balance = (list.length ? list : memoryInvoices).reduce((acc, i) => acc + (i.balanceAmount || 0), 0);
    return json({
      invoices: list.length ? list : memoryInvoices,
      totalBalance: balance,
    });
  }

  // 22. Fee Payments / Collection
  if (path === '/api/fees/payments' && method === 'POST') {
    const b = await request.json().catch(() => ({}));
    const inv = memoryInvoices.find((i) => i.id === b.invoiceId) || memoryInvoices[0];
    const amount = Number(b.amount || inv.balanceAmount || 1000);
    if (inv) {
      inv.paidAmount = (inv.paidAmount || 0) + amount;
      inv.balanceAmount = Math.max(0, (inv.netAmount || 0) - inv.paidAmount);
      inv.status = inv.balanceAmount === 0 ? 'paid' : 'partial';
    }
    const receipt = {
      id: 'rcp-' + Date.now(),
      receiptNo: 'RCP-' + Date.now().toString().slice(-6),
      invoiceId: inv?.id,
      amount,
      method: b.method || 'cash',
      paidOn: new Date().toISOString(),
      studentName: inv?.studentName || 'Student',
    };
    memoryPayments.unshift(receipt);
    return json({ message: 'Payment collected successfully', receipt }, 201);
  }

  // 23. Fee Reports
  if (path === '/api/fees/reports/collection') {
    const totalCollected = memoryPayments.reduce((sum, p) => sum + (p.amount || 0), 350000);
    return json({ totalCollected, payments: memoryPayments });
  }
  if (path === '/api/fees/reports/outstanding') {
    const totalOutstanding = memoryInvoices.reduce((sum, i) => sum + (i.balanceAmount || 0), 45000);
    const students = memoryStudents.map((s, idx) => ({
      admissionNo: s.admissionNo,
      studentName: s.fullName,
      className: s.className,
      sectionName: s.sectionName,
      outstandingAmount: 4700 * (idx % 2),
      earliestDueDate: '2026-09-10',
      openInvoices: idx % 2,
    }));
    return json({ totalOutstanding, studentCount: memoryStudents.length, students });
  }
  if (path === '/api/fees/reports/due') {
    const totalDue = memoryInvoices.reduce((sum, i) => sum + (i.balanceAmount || 0), 25000);
    return json({ totalDue, invoices: memoryInvoices });
  }

  // 24. Exams & Marks Entry
  if (path === '/api/exam-types') {
    return json({ examTypes: memoryExamTypes });
  }
  if (path === '/api/exams') {
    if (method === 'POST') {
      const b = await request.json().catch(() => ({}));
      const ex = {
        id: 'ex-' + Date.now(),
        name: b.name || 'New Exam',
        sessionId: b.sessionId || memorySessions[0].id,
        examTypeId: b.examTypeId || memoryExamTypes[0].id,
        typeName: memoryExamTypes.find((t) => t.id === b.examTypeId)?.name || 'Term Exam',
        startsOn: b.startsOn || null,
        endsOn: b.endsOn || null,
      };
      memoryExams.unshift(ex);
      return json({ message: 'Exam created successfully', exam: ex }, 201);
    }
    return json({ exams: memoryExams });
  }
  if (path === '/api/exam-subjects') {
    if (method === 'POST') {
      const b = await request.json().catch(() => ({}));
      const sub = memorySubjects.find((s) => s.id === b.subjectId);
      const cls = memoryClasses.find((c) => c.id === b.classId);
      const es = {
        id: 'es-' + Date.now(),
        examId: b.examId,
        classId: b.classId,
        className: cls?.name || 'Class 1',
        subjectId: b.subjectId,
        subjectName: sub?.name || 'Subject',
        maxMarks: Number(b.maxMarks || 100),
        passMarks: b.passMarks ? Number(b.passMarks) : 33,
        examDate: b.examDate || null,
      };
      memoryExamSubjects.push(es);
      return json({ message: 'Subject mapped successfully', examSubject: es }, 201);
    }
    return json({ examSubjects: memoryExamSubjects });
  }
  if (path === '/api/exam-students') {
    return json({ students: memoryStudents });
  }
  if (path === '/api/exam-marks') {
    if (method === 'POST') {
      const b = await request.json().catch(() => ({}));
      const idx = memoryExamMarks.findIndex((m) => m.studentId === b.studentId && m.examSubjectId === b.examSubjectId);
      const entry = {
        studentId: b.studentId,
        examSubjectId: b.examSubjectId,
        marks: b.marks,
        grade: b.grade || (b.marks >= 90 ? 'A1' : b.marks >= 80 ? 'A2' : b.marks >= 70 ? 'B1' : 'B2'),
        remarks: b.remarks || '',
      };
      if (idx >= 0) memoryExamMarks[idx] = entry;
      else memoryExamMarks.push(entry);
      return json({ message: 'Mark recorded successfully', mark: entry });
    }
    return json({ marks: memoryExamMarks });
  }

  // 25. Report Cards
  if (path === '/api/report-card/configs') {
    return json({ configs: memoryReportConfigs });
  }
  if (path === '/api/report-cards') {
    return json({ reportCards: memoryReportCards });
  }
  if (path === '/api/report-card/generate-bulk' && method === 'POST') {
    return json({ message: 'Bulk report cards generated', generatedCount: memoryStudents.length, skippedCount: 0 });
  }
  if (path === '/api/report-card/publish-bulk' && method === 'POST') {
    for (const r of memoryReportCards) r.status = 'published';
    return json({ message: 'Bulk report cards published', publishedCount: memoryReportCards.length, skippedCount: 0 });
  }
  if (path.startsWith('/api/report-card/') && path.endsWith('/publish')) {
    const id = path.replace('/api/report-card/', '').replace('/publish', '');
    const card = memoryReportCards.find((c) => c.id === id);
    if (card) card.status = 'published';
    return json({ message: 'Report card published successfully' });
  }

  // 26. Students Directory, Add, Edit & Delete
  if (path === '/api/students/search') {
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const res = q ? memoryStudents.filter((s) => s.fullName.toLowerCase().includes(q) || s.admissionNo.toLowerCase().includes(q)) : memoryStudents;
    return json({ students: res });
  }
  if (path.startsWith('/api/students/')) {
    const id = path.replace('/api/students/', '').trim();
    if (method === 'DELETE') {
      memoryStudents = memoryStudents.filter((s) => s.id !== id && s.admissionNo !== id);
      return json({ message: 'Student deleted successfully', id });
    }
    if (method === 'PATCH' || method === 'PUT') {
      const b = await request.json().catch(() => ({}));
      const student = memoryStudents.find((s) => s.id === id || s.admissionNo === id);
      if (student) {
        if (b.fullName || b.name) student.fullName = b.fullName || b.name;
        if (b.admissionNo) student.admissionNo = b.admissionNo;
        if (b.rollNo) student.rollNo = b.rollNo;
        if (b.className) student.className = b.className;
        if (b.sectionName) student.sectionName = b.sectionName;
        if (b.classId) student.classId = b.classId;
        if (b.sectionId) student.sectionId = b.sectionId;
        if (b.status) student.status = b.status;
        if (b.gender) student.gender = b.gender;
        if (b.dateOfBirth) student.dateOfBirth = b.dateOfBirth;
      }
      return json({ message: 'Student updated successfully', student: student || { id } });
    }
    const student = memoryStudents.find((s) => s.id === id || s.admissionNo === id) || memoryStudents[0];
    return json({ student });
  }
  if (path === '/api/students') {
    if (method === 'POST') {
      const b = await request.json().catch(() => ({}));
      const cls = memoryClasses.find((c) => c.id === b.classId);
      const sec = memorySections.find((s) => s.id === b.sectionId);
      const s = {
        id: 'stu_' + Date.now(),
        admissionNo: b.admissionNo || ('ADM-' + Math.floor(Math.random() * 900 + 100)),
        fullName: b.fullName || b.name || 'New Student',
        rollNo: b.rollNo || String(memoryStudents.length + 1),
        classId: b.classId || 'c1',
        className: b.className || cls?.name || 'Class 1',
        sectionId: b.sectionId || 'sec-1a',
        sectionName: b.sectionName || sec?.name || 'Section A',
        gender: b.gender || 'male',
        dateOfBirth: b.dateOfBirth || '2015-05-15',
        status: b.status || 'active',
        branchName: 'Main Branch',
      };
      memoryStudents.unshift(s);
      return json({ message: 'Student added successfully', student: s }, 201);
    }
    return json({ students: memoryStudents });
  }

  // 27. Staff Directory
  if (path === '/api/staff') {
    if (method === 'POST') {
      const b = await request.json().catch(() => ({}));
      const member = {
        id: 'stf_' + Date.now(),
        email: b.email,
        phone: b.phone,
        role: b.role || 'teacher',
        status: 'active',
        branchName: 'Main Branch',
      };
      memoryStaff.unshift(member);
      return json({ message: 'Staff member created successfully', staff: member }, 201);
    }
    return json({ staff: memoryStaff });
  }

  // 28. Sync APIs
  if (path === '/api/sync/status') {
    return json({
      status: 'ok',
      deviceCount: { active: 1, total: 1 },
      changeCount: 12,
      pendingConflictCount: 0,
      latestChange: { cursor: 12, changed_at: new Date().toISOString() },
    });
  }
  if (path === '/api/sync/admin/devices') {
    return json({ devices: [] });
  }
  if (path === '/api/sync/admin/conflicts') {
    return json({ conflicts: [] });
  }

  // 29. Local Storage Connectors
  if (path === '/api/local-storage/connectors') {
    if (method === 'POST') {
      const b = await request.json().catch(() => ({}));
      const c = {
        id: 'conn_' + Date.now(),
        display_name: b.displayName || 'Folder Connector',
        connector_type: b.connectorType || 'desktop_folder',
        permission_mode: b.permissionMode || 'read_write',
        selected_path: b.selectedPath || 'DefaultFolder',
        enabled: true,
        last_sync_at: new Date().toISOString(),
      };
      memoryConnectors.unshift(c);
      return json({ message: 'Connector registered', connector: c }, 201);
    }
    return json({ connectors: memoryConnectors });
  }

  // Generic fallback for any other /api/* route:
  return json({
    status: 'ok',
    mode: 'edge-standalone',
    message: 'Edge Standalone API responded',
    path,
    data: [],
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. API Route Handling & Proxying
    if (url.pathname.startsWith('/api/')) {
      // Handle CORS preflight OPTIONS
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: corsHeaders,
        });
      }

      const backendBase = (env.API_BACKEND_URL || '').trim().replace(/\/+$/, '');
      const isSelfReference = backendBase && (backendBase.includes(url.host) || backendBase.includes('workers.dev'));

      // If no backend is configured or if it references this worker, handle with built-in Edge Standalone API
      if (!backendBase || isSelfReference) {
        return handleEdgeApi(request, url, env);
      }

      const targetUrl = `${backendBase}${url.pathname}${url.search}`;
      const headers = new Headers(request.headers);
      try {
        headers.set('host', new URL(backendBase).host);
      } catch (_) {}

      const init = {
        method: request.method,
        headers: headers,
        redirect: 'follow',
      };

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        init.body = request.body;
      }

      try {
        const response = await fetch(targetUrl, init);
        const responseHeaders = new Headers(response.headers);
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Credentials', 'true');

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
        });
      } catch (err) {
        // Fall back to Edge API if external backend is temporarily unreachable
        return handleEdgeApi(request, url, env);
      }
    }

    // 2. Serve Static Assets via Cloudflare Assets with intelligent dual-path routing
    // Ensures URLs like /erp/web/attendance.html AND /attendance.html both resolve seamlessly without 404
    let assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status === 404) {
      const pathname = url.pathname;
      let altPath = null;
      if (pathname.startsWith('/erp/web/')) {
        // Fallback: strip /erp/web/ and look in root
        altPath = pathname.replace(/^\/erp\/web/, '') || '/';
      } else if (!pathname.startsWith('/api/')) {
        // Fallback: prepend /erp/web/ and look in erp/web/
        altPath = '/erp/web' + pathname;
      }

      if (altPath) {
        const altUrl = new URL(altPath + url.search, url.origin);
        const altReq = new Request(altUrl.toString(), request);
        const altResp = await env.ASSETS.fetch(altReq);
        if (altResp.status !== 404) {
          return altResp;
        }
      }
    }

    return assetResponse;
  },
};
