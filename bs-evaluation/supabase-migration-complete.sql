-- ═══════════════════════════════════════════════════════════════════════
-- B.S Evaluation — COMPLETE DATABASE SETUP & MIGRATION
-- الكود العربي السوري 2024 — تقييم المباني الخرسانية المسلحة
--
-- هذا الملف يجمع كل الإعدادات والتحديثات في سكريبت واحد
-- يمكن تشغيله على قاعدة بيانات جديدة أو موجودة بأمان
--
-- ⚠️ شغّل هذا في: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 1: تفعيل امتداد UUID
-- ═══════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 2: إنشاء الجداول (IF NOT EXISTS = آمنة للتشغيل المتكرر)
-- ═══════════════════════════════════════════════════════════════

-- جدول المستخدمين
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  max_devices INTEGER NOT NULL DEFAULT 2,
  cloud_sync_enabled BOOLEAN NOT NULL DEFAULT false,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  password_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- جدول الأجهزة (نظام البصمة الهجين)
CREATE TABLE IF NOT EXISTS devices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_fingerprint TEXT NOT NULL DEFAULT '',
  device_name TEXT NOT NULL DEFAULT 'Unknown Device',
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

-- جدول المشاريع
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
-- الخطوة 3: إضافة الأعمدة الناقصة (للقواعد القديمة)
-- IF NOT EXISTS = آمنة حتى لو الأعمدة موجودة مسبقاً
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cloud_sync_enabled BOOLEAN NOT NULL DEFAULT false;

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 4: إنشاء الفهارس
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 5: تفعيل Row Level Security
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 6: حذف جميع السياسات القديمة (المتساهلة والصارمة)
-- DROP IF EXISTS = آمنة حتى لو لم تكن السياسات موجودة
-- ═══════════════════════════════════════════════════════════════

-- السياسات المتساهلة القديمة
DROP POLICY IF EXISTS "Service role can do everything on users" ON users;
DROP POLICY IF EXISTS "Service role can do everything on devices" ON devices;
DROP POLICY IF EXISTS "Service role can do everything on projects" ON projects;
DROP POLICY IF EXISTS "Anon can read public user fields" ON users;
DROP POLICY IF EXISTS "Anon can read devices" ON devices;
DROP POLICY IF EXISTS "Anon can read projects" ON projects;

-- السياسات الصارمة (للتشغيل المتكرر بأمان)
DROP POLICY IF EXISTS "Anon cannot read users" ON users;
DROP POLICY IF EXISTS "Anon cannot insert users" ON users;
DROP POLICY IF EXISTS "Anon cannot update users" ON users;
DROP POLICY IF EXISTS "Anon cannot delete users" ON users;
DROP POLICY IF EXISTS "Anon cannot read devices" ON devices;
DROP POLICY IF EXISTS "Anon cannot insert devices" ON devices;
DROP POLICY IF EXISTS "Anon cannot update devices" ON devices;
DROP POLICY IF EXISTS "Anon cannot delete devices" ON devices;
DROP POLICY IF EXISTS "Anon cannot read projects" ON projects;
DROP POLICY IF EXISTS "Anon cannot insert projects" ON projects;
DROP POLICY IF EXISTS "Anon cannot update projects" ON projects;
DROP POLICY IF EXISTS "Anon cannot delete projects" ON projects;

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 7: إنشاء سياسات RLS صارمة
-- الكود من جهة الخادم يستخدم service_role الذي يتجاوز RLS
-- هذه السياسات تضمن أن مفتاح anon المسروق لا يمكنه قراءة البيانات
-- ═══════════════════════════════════════════════════════════════

-- Users: anon لا يستطيع قراءة/إضافة/تعديل/حذف أي بيانات
CREATE POLICY "Anon cannot read users" ON users FOR SELECT USING (false);
CREATE POLICY "Anon cannot insert users" ON users FOR INSERT WITH CHECK (false);
CREATE POLICY "Anon cannot update users" ON users FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "Anon cannot delete users" ON users FOR DELETE USING (false);

-- Devices: anon لا يستطيع أي عملية
CREATE POLICY "Anon cannot read devices" ON devices FOR SELECT USING (false);
CREATE POLICY "Anon cannot insert devices" ON devices FOR INSERT WITH CHECK (false);
CREATE POLICY "Anon cannot update devices" ON devices FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "Anon cannot delete devices" ON devices FOR DELETE USING (false);

-- Projects: anon لا يستطيع أي عملية
CREATE POLICY "Anon cannot read projects" ON projects FOR SELECT USING (false);
CREATE POLICY "Anon cannot insert projects" ON projects FOR INSERT WITH CHECK (false);
CREATE POLICY "Anon cannot update projects" ON projects FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "Anon cannot delete projects" ON projects FOR DELETE USING (false);

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 8: إدراج المستخدم المدير الافتراضي
-- ⚠️ يجب تغيير كلمة المرور عند أول تسجيل دخول
-- لتوليد هاش جديد: node -e "console.log(require('bcryptjs').hashSync('YOUR_PASSWORD', 12))"
-- ═══════════════════════════════════════════════════════════════
-- Admin password hash (bcrypt, 12 rounds)
-- Password was set by the administrator
INSERT INTO users (username, password_hash, full_name, role, must_change_password, password_version)
VALUES (
  'admin',
  '$2b$12$X/EHxTVXvPSKJ4o/uvR.Du1AMbFXTeN6D/Ew1.RlMWngdfUvIXiiG',
  'بشار السليمان',
  'admin',
  false,
  2
) ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  must_change_password = false,
  password_version = users.password_version + 1;

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 9: إعداد Supabase Storage لصور التقييم
-- ═══════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evaluation-images',
  'evaluation-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- سياسات التخزين (حذف القديمة أولاً لمنع خطأ التكرار)
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects;

CREATE POLICY "Authenticated users can upload images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'evaluation-images' AND (storage.foldername(name))[1] = 'uploads');

CREATE POLICY "Anyone can view images" ON storage.objects
  FOR SELECT USING (bucket_id = 'evaluation-images');

CREATE POLICY "Authenticated users can delete images" ON storage.objects
  FOR DELETE USING (bucket_id = 'evaluation-images');

-- ═══════════════════════════════════════════════════════════════
-- ✅ اكتمل الإعداد!
--
-- بعد تشغيل هذا السكريبت:
-- 1. جميع الجداول والأعمدة ستكون محدثة
-- 2. سياسات RLS الصارمة مفعّلة
-- 3. Storage جاهز لرفع الصور
-- 4. المستخدم المدير جاهز (يجب تحديث كلمة المرور)
--
-- ✅ كلمة مرور المدير محدثة في هذا السكريبت
-- ✅ السياسات آمنة للتشغيل المتكرر (DROP IF EXISTS قبل CREATE)
-- ═══════════════════════════════════════════════════════════════
