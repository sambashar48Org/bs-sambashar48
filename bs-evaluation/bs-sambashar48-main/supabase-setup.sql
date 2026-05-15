-- B.S Evaluation Database Setup
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  max_devices INTEGER NOT NULL DEFAULT 2,
  cloud_sync_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT NOT NULL DEFAULT 'Unknown Device',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

-- Create projects table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policies for anon (authenticated via JWT in cookies, using service role for server-side)
-- Since we use service_role key on server, we need permissive policies

-- Users policies
CREATE POLICY "Service role can do everything on users" ON users
  FOR ALL USING (true) WITH CHECK (true);

-- Devices policies
CREATE POLICY "Service role can do everything on devices" ON devices
  FOR ALL USING (true) WITH CHECK (true);

-- Projects policies
CREATE POLICY "Service role can do everything on projects" ON projects
  FOR ALL USING (true) WITH CHECK (true);

-- Insert default admin user
-- Password: admin123 (bcrypt hash)
-- IMPORTANT: Change this password after first login!
INSERT INTO users (username, password_hash, full_name, role)
VALUES (
  'admin',
  '$2b$12$fQV4LdRWFiHqY6.8eLrDDeEQeJ/GsUnOfQ/vlXoU68X0UOAe6Jm.e',
  'بشار السليمان',
  'admin'
) ON CONFLICT (username) DO NOTHING;
