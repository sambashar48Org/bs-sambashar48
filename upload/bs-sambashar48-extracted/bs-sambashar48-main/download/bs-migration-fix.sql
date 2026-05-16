-- ============================================================
-- B.S Evaluation — إصلاح قاعدة البيانات
-- تشغيل هذا السكريبت في Supabase SQL Editor خطوة بخطوة
-- ============================================================

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 1: إضافة الأعمدة المفقودة
-- شغّل هذا أولاً — إذا ظهر "already exists" فهذا طبيعي
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_version INTEGER NOT NULL DEFAULT 1;

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 2: تحديث كلمة مرور المدير وإجبار تغييرها
-- شغّل هذا بعد الخطوة 1 فقط
-- ═══════════════════════════════════════════════════════════════
UPDATE users
SET password_hash = '$2b$12$Oo7QMXXJurEedYdqM5eSU.Yqzzm6kfuc3Rqufr6w8VmTfJnDlNm32',
    must_change_password = true,
    password_version = password_version + 1
WHERE username = 'admin';

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 3: تأمين سياسات RLS — منع anon من قراءة البيانات
-- شغّل هذا بعد الخطوة 2
-- ═══════════════════════════════════════════════════════════════

-- حذف السياسات القديمة المتساهلة
DROP POLICY IF EXISTS "Anon can read public user fields" ON users;
DROP POLICY IF EXISTS "Anon can read devices" ON devices;
DROP POLICY IF EXISTS "Anon can read projects" ON projects;

-- منع anon من قراءة بيانات المستخدمين
CREATE POLICY "Anon cannot read users" ON users
  FOR SELECT USING (false);

-- منع anon من قراءة بيانات الأجهزة
CREATE POLICY "Anon cannot read devices" ON devices
  FOR SELECT USING (false);

-- منع anon من قراءة بيانات المشاريع
CREATE POLICY "Anon cannot read projects" ON projects
  FOR SELECT USING (false);

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 4: التحقق — شغّل هذا للتأكد من نجاح العملية
-- ═══════════════════════════════════════════════════════════════
SELECT username, must_change_password, password_version FROM users WHERE username = 'admin';
