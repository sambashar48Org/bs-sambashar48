-- B.S Evaluation — Migration: Add password_version & must_change_password columns
-- Run this in Supabase SQL Editor to update existing database
-- This enables JWT session invalidation on password change + forced password change

-- ═══════════════════════════════════════════════════════════════
-- Step 1: Add missing columns (safe — IF NOT EXISTS won't error if already present)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_version INTEGER NOT NULL DEFAULT 1;

-- ═══════════════════════════════════════════════════════════════
-- Step 2: Update RLS policies — drop old permissive policies first
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Anon can read public user fields" ON users;
DROP POLICY IF EXISTS "Anon can read devices" ON devices;
DROP POLICY IF EXISTS "Anon can read projects" ON projects;

-- Users: anon CANNOT read any user data
CREATE POLICY "Anon cannot read users" ON users
  FOR SELECT USING (false);

-- Devices: anon CANNOT read device data
CREATE POLICY "Anon cannot read devices" ON devices
  FOR SELECT USING (false);

-- Projects: anon CANNOT read project data
CREATE POLICY "Anon cannot read projects" ON projects
  FOR SELECT USING (false);

-- ═══════════════════════════════════════════════════════════════
-- Step 3: Update admin password hash and force password change on next login
-- ═══════════════════════════════════════════════════════════════
UPDATE users 
SET password_hash = '$2b$12$Oo7QMXXJurEedYdqM5eSU.Yqzzm6kfuc3Rqufr6w8VmTfJnDlNm32',
    must_change_password = true,
    password_version = password_version + 1
WHERE username = 'admin';
