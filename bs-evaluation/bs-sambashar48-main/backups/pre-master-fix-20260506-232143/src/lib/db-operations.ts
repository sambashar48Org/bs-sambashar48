import bcrypt from 'bcryptjs';
import { supabase, supabaseAdmin } from './supabase';

// ======== Supabase Table Setup ========
export async function setupSupabaseTables() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS projects (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
    )`,
    `CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)`,
  ];

  const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: '' }).catch(() => ({ error: true }));

  // Try direct table creation via REST
  for (const sql of tables) {
    try {
      // We'll use the service role to create tables via Supabase Management API
      // For initial setup, we'll handle this differently
    } catch (e) {
      // Table might already exist
    }
  }
}

// ======== User Operations ========
export async function createUser(
  username: string,
  password: string,
  fullName: string,
  role: 'admin' | 'user' = 'user'
) {
  const passwordHash = await bcrypt.hash(password, 12);

  const { data, error } = await supabase
    .from('users')
    .insert({
      username,
      password_hash: passwordHash,
      full_name: fullName,
      role,
    })
    .select('id, username, full_name, role, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('اسم المستخدم موجود بالفعل');
    }
    throw new Error('فشل إنشاء المستخدم');
  }

  return data;
}

export async function authenticateUser(username: string, password: string) {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !user) {
    throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
  }

  return user;
}

export async function getUserById(id: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, full_name, role, created_at')
    .eq('id', id)
    .single();

  if (error) throw new Error('المستخدم غير موجود');
  return data;
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, full_name, role, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error('فشل جلب المستخدمين');
  return data || [];
}

export async function deleteUser(userId: string) {
  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) throw new Error('فشل حذف المستخدم');
}

export async function changePassword(userId: string, newPassword: string) {
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const { error } = await supabase
    .from('users')
    .update({ password_hash: passwordHash })
    .eq('id', userId);

  if (error) throw new Error('فشل تغيير كلمة المرور');
}

// ======== Project Operations ========
export async function getProjects(userId: string, isAdmin: boolean = false) {
  let query = supabase
    .from('projects')
    .select('id, user_id, name, is_current, created_at, updated_at');

  if (!isAdmin) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.order('updated_at', { ascending: false });

  if (error) throw new Error('فشل جلب المشاريع');
  return data || [];
}

export async function getProjectById(projectId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) throw new Error('المشروع غير موجود');
  return data;
}

export async function createProject(userId: string, name: string) {
  // Unset current for other projects
  await supabase
    .from('projects')
    .update({ is_current: false })
    .eq('user_id', userId);

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      name,
      is_current: true,
    })
    .select()
    .single();

  if (error) throw new Error('فشل إنشاء المشروع');
  return data;
}

export async function updateProject(projectId: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .select()
    .single();

  if (error) throw new Error('فشل تحديث المشروع');
  return data;
}

export async function deleteProject(projectId: string) {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) throw new Error('فشل حذف المشروع');
}

export async function setCurrentProject(userId: string, projectId: string) {
  await supabase
    .from('projects')
    .update({ is_current: false })
    .eq('user_id', userId);

  const { error } = await supabase
    .from('projects')
    .update({ is_current: true })
    .eq('id', projectId);

  if (error) throw new Error('فشل تحديد المشروع الحالي');
}
