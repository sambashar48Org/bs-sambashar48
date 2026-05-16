-- B.S Evaluation Database Setup — SECURE EDITION v2
-- Run this in Supabase SQL Editor
-- This version replaces permissive RLS policies with secure ones

-- ═══════════════════════════════════════════════════════════════
-- Enable UUID extension
-- ═══════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════
-- Create users table
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  max_devices INTEGER NOT NULL DEFAULT 2,
  cloud_sync_enabled BOOLEAN NOT NULL DEFAULT false,
  must_change_password BOOLEAN NOT NULL DEFAULT false,  -- إجبار تغيير كلمة المرور عند أول دخول
  password_version INTEGER NOT NULL DEFAULT 1,  -- يتم زيادته عند تغيير كلمة المرور لإبطال الجلسات القديمة
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- Create devices table (Hybrid Device ID system)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS devices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,                            -- Hybrid Fingerprint (SHA-256)
  device_fingerprint TEXT NOT NULL DEFAULT '',        -- البصمة الهجينة الكاملة
  device_name TEXT NOT NULL DEFAULT 'Unknown Device', -- وصف الجهاز للعرض
  is_active BOOLEAN NOT NULL DEFAULT false,           -- يحتاج موافقة المدير أولاً
  is_approved BOOLEAN NOT NULL DEFAULT false,          -- تمت الموافقة من المدير
  approved_by UUID REFERENCES users(id),               -- من وافق (المدير)
  approved_at TIMESTAMPTZ,                             -- وقت الموافقة
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),    -- آخر استخدام
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

-- ═══════════════════════════════════════════════════════════════
-- Create projects table
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'مشروع جديد',
  is_current BOOLEAN NOT NULL DEFAULT false,
  building_data JSONB NOT NULL DEFAULT '{}',
  architectural_report JSONB NOT NULL DEFAULT '{}',
  structural_report JSONB NOT NULL DEFAULT '{}',
  foundations JSONB NOT NULL DEFAULT '{}',
  columns_walls JSONB NOT NULL DEFAULT '{}',
  beam_slab JSONB NOT NULL DEFAULT '{}',
  electrical JSONB NOT NULL DEFAULT '{}',
  plumbing JSONB NOT NULL DEFAULT '{}',
  technical_notes JSONB NOT NULL DEFAULT '{}',
  final_report JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- Create indexes
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);

-- ═══════════════════════════════════════════════════════════════
-- Enable Row Level Security
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- DROP OLD PERMISSIVE POLICIES IF THEY EXIST
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Service role can do everything on users" ON users;
DROP POLICY IF EXISTS "Service role can do everything on devices" ON devices;
DROP POLICY IF EXISTS "Service role can do everything on projects" ON projects;

-- ═══════════════════════════════════════════════════════════════
-- SECURE POLICIES
-- Server-side code uses service_role which bypasses RLS.
-- These policies ensure that even if anon key is leaked,
-- an attacker cannot read passwords or modify data.
-- ═══════════════════════════════════════════════════════════════

-- Users: anon CANNOT read any user data directly
-- All user reads go through server-side API routes using supabaseAdmin (service_role)
-- which bypasses RLS. This prevents data leaks if anon key is compromised.
CREATE POLICY "Anon cannot read users" ON users
  FOR SELECT USING (false);

-- Users: no INSERT/UPDATE/DELETE via anon key
CREATE POLICY "Anon cannot insert users" ON users
  FOR INSERT WITH CHECK (false);

CREATE POLICY "Anon cannot update users" ON users
  FOR UPDATE USING (false) WITH CHECK (false);

CREATE POLICY "Anon cannot delete users" ON users
  FOR DELETE USING (false);

-- Devices: anon CANNOT read device data
-- All device reads go through server-side API routes using supabaseAdmin
CREATE POLICY "Anon cannot read devices" ON devices
  FOR SELECT USING (false);

CREATE POLICY "Anon cannot insert devices" ON devices
  FOR INSERT WITH CHECK (false);

CREATE POLICY "Anon cannot update devices" ON devices
  FOR UPDATE USING (false) WITH CHECK (false);

CREATE POLICY "Anon cannot delete devices" ON devices
  FOR DELETE USING (false);

-- Projects: anon CANNOT read project data
-- All project reads go through server-side API routes using supabaseAdmin
CREATE POLICY "Anon cannot read projects" ON projects
  FOR SELECT USING (false);

CREATE POLICY "Anon cannot insert projects" ON projects
  FOR INSERT WITH CHECK (false);

CREATE POLICY "Anon cannot update projects" ON projects
  FOR UPDATE USING (false) WITH CHECK (false);

CREATE POLICY "Anon cannot delete projects" ON projects
  FOR DELETE USING (false);

-- ═══════════════════════════════════════════════════════════════
-- Insert default admin user
-- IMPORTANT: The default password MUST be changed on first login.
-- must_change_password = true forces the password change flow.
-- To generate a new hash: node -e "console.log(require('bcryptjs').hashSync('YOUR_PASSWORD', 12))"
-- ═══════════════════════════════════════════════════════════════
INSERT INTO users (username, password_hash, full_name, role, must_change_password)
VALUES (
  'admin',
  '$2b$12$Oo7QMXXJurEedYdqM5eSU.Yqzzm6kfuc3Rqufr6w8VmTfJnDlNm32',
  'بشار السليمان',
  'admin',
  true
) ON CONFLICT (username) DO NOTHING;
