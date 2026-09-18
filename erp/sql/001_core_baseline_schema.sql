-- Anvi Mitra ERP: Core baseline schema
-- Creates base multi-school tables, relations, and indexes with idempotent IF NOT EXISTS checks.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Schools & Settings
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS school_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE UNIQUE,
  display_name VARCHAR(200),
  logo_url TEXT,
  primary_color VARCHAR(30) DEFAULT '#4f46e5',
  secondary_color VARCHAR(30) DEFAULT '#06b6d4',
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(120),
  website VARCHAR(200),
  timezone VARCHAR(60) NOT NULL DEFAULT 'Asia/Kolkata',
  currency_code VARCHAR(10) NOT NULL DEFAULT 'INR',
  locale VARCHAR(20) NOT NULL DEFAULT 'en-IN',
  date_format VARCHAR(30) NOT NULL DEFAULT 'DD-MM-YYYY',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Branches
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(120),
  logo_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  is_main BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, code)
);

-- 3. Mobile App Configs
CREATE TABLE IF NOT EXISTS mobile_app_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE UNIQUE,
  app_name VARCHAR(200) NOT NULL,
  app_slug VARCHAR(100) NOT NULL UNIQUE,
  android_package VARCHAR(200),
  ios_bundle_id VARCHAR(200),
  api_base_url TEXT,
  logo_url TEXT,
  primary_color VARCHAR(30) DEFAULT '#4f46e5',
  secondary_color VARCHAR(30) DEFAULT '#06b6d4',
  support_email VARCHAR(120),
  support_phone VARCHAR(50),
  min_app_version VARCHAR(30) DEFAULT '1.0.0',
  force_update BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  email VARCHAR(160),
  phone VARCHAR(40),
  password_hash TEXT NOT NULL,
  role VARCHAR(40) NOT NULL CHECK(role IN ('super_admin','principal','admin','teacher','student','parent','accountant','office_staff','driver')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','suspended')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_school_email_idx ON users(school_id, lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_school_phone_idx ON users(school_id, phone) WHERE phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_school_idx ON audit_logs(school_id, created_at DESC);

-- 5. Academics (Sessions, Classes, Sections, Subjects)
CREATE TABLE IF NOT EXISTS academic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, name)
);

CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, class_id, name)
);

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. People: Teachers, Students, Parents, Enrollments
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  employee_no VARCHAR(60),
  full_name VARCHAR(160) NOT NULL,
  phone VARCHAR(40),
  email VARCHAR(160),
  qualification VARCHAR(200),
  joining_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  admission_no VARCHAR(60) NOT NULL,
  roll_no VARCHAR(40),
  full_name VARCHAR(160) NOT NULL,
  date_of_birth DATE,
  gender VARCHAR(20),
  photo_url TEXT,
  admission_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','graduated','transferred')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, admission_no)
);

CREATE TABLE IF NOT EXISTS parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  full_name VARCHAR(160) NOT NULL,
  phone VARCHAR(40),
  email VARCHAR(160),
  occupation VARCHAR(120),
  address TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  roll_no VARCHAR(40),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','transferred')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, session_id)
);
CREATE INDEX IF NOT EXISTS enrollments_school_session_idx ON enrollments(school_id, session_id, section_id, status);

CREATE TABLE IF NOT EXISTS student_portal_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relation VARCHAR(40) DEFAULT 'guardian',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, user_id)
);

CREATE TABLE IF NOT EXISTS student_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL,
  document_no VARCHAR(100),
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Exams & Marks
CREATE TABLE IF NOT EXISTS exam_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,
  display_order INT DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, code)
);

CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  exam_type_id UUID REFERENCES exam_types(id) ON DELETE SET NULL,
  name VARCHAR(160) NOT NULL,
  starts_on DATE,
  ends_on DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK(status IN ('draft','scheduled','ongoing','completed','published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exam_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  max_marks NUMERIC(8,2) NOT NULL DEFAULT 100 CHECK(max_marks > 0),
  pass_marks NUMERIC(8,2) DEFAULT 33,
  exam_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_id, class_id, subject_id)
);

CREATE TABLE IF NOT EXISTS exam_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  exam_subject_id UUID NOT NULL REFERENCES exam_subjects(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  marks NUMERIC(8,2) CHECK(marks >= 0),
  grade VARCHAR(10),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, exam_subject_id, student_id)
);

-- 8. Admissions Desk
CREATE TABLE IF NOT EXISTS admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  application_no VARCHAR(80) NOT NULL,
  session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  applied_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  student_name VARCHAR(160) NOT NULL,
  date_of_birth DATE,
  gender VARCHAR(20),
  father_name VARCHAR(160),
  mother_name VARCHAR(160),
  guardian_phone VARCHAR(40),
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','enrolled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, application_no)
);

-- 9. Report Cards
CREATE TABLE IF NOT EXISTS report_card_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  name VARCHAR(160) NOT NULL,
  template_key VARCHAR(60) NOT NULL DEFAULT 'standard',
  layout JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_card_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  name VARCHAR(160) NOT NULL,
  template_id UUID REFERENCES report_card_templates(id) ON DELETE SET NULL,
  session_id UUID REFERENCES academic_sessions(id) ON DELETE SET NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  config_id UUID REFERENCES report_card_configs(id) ON DELETE SET NULL,
  total_marks NUMERIC(10,2) DEFAULT 0,
  percentage NUMERIC(6,2) DEFAULT 0,
  overall_grade VARCHAR(20),
  remarks TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_card_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  report_card_id UUID NOT NULL REFERENCES report_cards(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  marks_obtained NUMERIC(8,2) DEFAULT 0,
  max_marks NUMERIC(8,2) DEFAULT 100,
  percentage NUMERIC(6,2) DEFAULT 0,
  grade VARCHAR(10),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
