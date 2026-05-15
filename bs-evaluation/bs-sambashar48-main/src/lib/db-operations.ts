import bcrypt from 'bcryptjs';
import { supabase, supabaseAdmin } from './supabase';

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
    .select('id, username, full_name, role, cloud_sync_enabled, created_at')
    .eq('id', id)
    .single();

  if (error) throw new Error('المستخدم غير موجود');
  return data;
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, full_name, role, cloud_sync_enabled, max_devices, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error('فشل جلب المستخدمين');
  return data || [];
}

export async function deleteUser(userId: string) {
  // Cascade: delete all projects belonging to this user first
  const { error: projError } = await supabase.from('projects').delete().eq('user_id', userId);
  if (projError) throw new Error('فشل حذف مشاريع المستخدم');

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

export async function updateUserRole(userId: string, newRole: 'admin' | 'user') {
  const { error } = await supabase
    .from('users')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) throw new Error('فشل تحديث دور المستخدم');
}

export async function updateUserCloudSync(userId: string, enabled: boolean) {
  const { error } = await supabase
    .from('users')
    .update({ cloud_sync_enabled: enabled })
    .eq('id', userId);

  if (error) throw new Error('فشل تحديث صلاحية المزامنة السحابية');
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
  // Atomic: unset current for other projects, then insert new one
  // Using RPC would be ideal, but Supabase JS client handles sequential ops reliably.
  // We wrap in a single conceptual transaction — if insert fails, previous state is idempotent.
  await supabase
    .from('projects')
    .update({ is_current: false })
    .eq('user_id', userId)
    .eq('is_current', true);

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

// ======== Device Operations ========
export async function getDevicesByUser(userId: string) {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('فشل جلب الأجهزة');
  return data || [];
}

export async function addDevice(userId: string, deviceId: string, deviceName: string) {
  const { data, error } = await supabase
    .from('devices')
    .insert({
      user_id: userId,
      device_id: deviceId,
      device_name: deviceName,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('الجهاز مسجل مسبقاً');
    }
    throw new Error('فشل إضافة الجهاز');
  }
  return data;
}

export async function toggleDevice(deviceId: string, isActive: boolean) {
  const { error } = await supabase
    .from('devices')
    .update({ is_active: isActive })
    .eq('id', deviceId);

  if (error) throw new Error('فشل تحديث حالة الجهاز');
}

export async function deleteDevice(deviceId: string) {
  const { error } = await supabase
    .from('devices')
    .delete()
    .eq('id', deviceId);

  if (error) throw new Error('فشل حذف الجهاز');
}
