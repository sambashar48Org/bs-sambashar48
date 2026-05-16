-- ═══════════════════════════════════════════════════════════════════════
-- B.S Evaluation — تحديث سريع لكلمة المرور وإصلاح السياسات
-- شغّل هذا في: Supabase Dashboard → SQL Editor → New query
--
-- هذا السكريبت:
-- 1. يحدّث كلمة مرور المدير
-- 2. يصلح سياسات RLS (يحذف القديمة ثم ينشئ الجديدة)
-- 3. آمن للتشغيل المتكرر
-- ═══════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 1: تحديث كلمة مرور المدير
-- ═══════════════════════════════════════════════════════════════
UPDATE users
SET password_hash = '$2b$12$X/EHxTVXvPSKJ4o/uvR.Du1AMbFXTeN6D/Ew1.RlMWngdfUvIXiiG',
    must_change_password = false,
    password_version = password_version + 1
WHERE username = 'admin';

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 2: حذف جميع السياسات القديمة ثم إنشاؤها من جديد
-- ═══════════════════════════════════════════════════════════════

-- حذف السياسات المتساهلة القديمة
DROP POLICY IF EXISTS "Service role can do everything on users" ON users;
DROP POLICY IF EXISTS "Service role can do everything on devices" ON devices;
DROP POLICY IF EXISTS "Service role can do everything on projects" ON projects;
DROP POLICY IF EXISTS "Anon can read public user fields" ON users;
DROP POLICY IF EXISTS "Anon can read devices" ON devices;
DROP POLICY IF EXISTS "Anon can read projects" ON projects;

-- حذف السياسات الصارمة الموجودة
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

-- إنشاء سياسات RLS صارمة
-- الكود من جهة الخادم يستخدم service_role الذي يتجاوز RLS
-- هذه السياسات تضمن أن مفتاح anon المسروق لا يمكنه قراءة البيانات

-- Users
CREATE POLICY "Anon cannot read users" ON users FOR SELECT USING (false);
CREATE POLICY "Anon cannot insert users" ON users FOR INSERT WITH CHECK (false);
CREATE POLICY "Anon cannot update users" ON users FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "Anon cannot delete users" ON users FOR DELETE USING (false);

-- Devices
CREATE POLICY "Anon cannot read devices" ON devices FOR SELECT USING (false);
CREATE POLICY "Anon cannot insert devices" ON devices FOR INSERT WITH CHECK (false);
CREATE POLICY "Anon cannot update devices" ON devices FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "Anon cannot delete devices" ON devices FOR DELETE USING (false);

-- Projects
CREATE POLICY "Anon cannot read projects" ON projects FOR SELECT USING (false);
CREATE POLICY "Anon cannot insert projects" ON projects FOR INSERT WITH CHECK (false);
CREATE POLICY "Anon cannot update projects" ON projects FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "Anon cannot delete projects" ON projects FOR DELETE USING (false);

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 3: التحقق من النتيجة
-- ═══════════════════════════════════════════════════════════════
SELECT username, role, must_change_password, password_version FROM users WHERE username = 'admin';
