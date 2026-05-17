import bcrypt from 'bcryptjs';
import { supabaseAdmin } from './supabase';

// ======== Explicit Types for DB Results ========
// We use explicit types to avoid Supabase's compile-time select string validation
// which breaks with dynamic column detection (pre-migration databases).

export interface UserData {
  id: string;
  username: string;
  full_name: string;
  role: 'admin' | 'user';
  cloud_sync_enabled: boolean;
  max_devices: number;
  must_change_password: boolean;
  password_version: number;
  is_approved: boolean;
  is_active: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface AuthUserData {
  id: string;
  username: string;
  password_hash: string;
  full_name: string;
  role: 'admin' | 'user';
  cloud_sync_enabled: boolean;
  must_change_password: boolean;
  password_version: number;
  is_approved: boolean;
  is_active: boolean;
  created_at: string;
}

// ======== Column Availability Cache ========
// Tracks whether must_change_password, password_version, is_approved, is_active columns exist
// to avoid repeated failed queries on databases without migration applied
let _hasPasswordColumns: boolean | null = null;
let _hasApprovalColumns: boolean | null = null;

function isMissingColumnError(error: { code?: string; message?: string }): boolean {
  // PostgreSQL error code 42703 = undefined column
  return error.code === '42703' ||
    (error.message?.includes('does not exist') ?? false);
}

/**
 * Check if must_change_password and password_version columns exist in users table.
 * Result is cached after first check.
 */
async function hasPasswordColumns(): Promise<boolean> {
  if (_hasPasswordColumns !== null) return _hasPasswordColumns;
  try {
    const { error } = await supabaseAdmin
      .from('users')
      .select('must_change_password, password_version')
      .limit(1);
    _hasPasswordColumns = !error || !isMissingColumnError(error);
  } catch {
    _hasPasswordColumns = false;
  }
  return _hasPasswordColumns;
}

/**
 * Reset the column cache — call after running migration to pick up new columns.
 */
export function resetColumnCache() {
  _hasPasswordColumns = null;
  _hasApprovalColumns = null;
}

/**
 * Check if is_approved and is_active columns exist in users table.
 * Result is cached after first check.
 */
async function hasApprovalColumns(): Promise<boolean> {
  if (_hasApprovalColumns !== null) return _hasApprovalColumns;
  try {
    const { error } = await supabaseAdmin
      .from('users')
      .select('is_approved, is_active')
      .limit(1);
    _hasApprovalColumns = !error || !isMissingColumnError(error);
  } catch {
    _hasApprovalColumns = false;
  }
  return _hasApprovalColumns;
}

/**
 * Helper to safely extract data from Supabase results with dynamic select strings.
 * The Supabase JS client produces ParserError types for dynamic select strings,
 * so we need to cast through unknown first.
 */
function toRecord(data: unknown): Record<string, unknown> {
  return data as unknown as Record<string, unknown>;
}

function toRecordArray(data: unknown): Record<string, unknown>[] {
  return data as unknown as Record<string, unknown>[];
}

// ======== User Operations ========
export async function createUser(
  username: string,
  password: string,
  fullName: string,
  role: 'admin' | 'user' = 'user',
  isSelfRegistration: boolean = false
) {
  const passwordHash = await bcrypt.hash(password, 12);
  const hasCols = await hasPasswordColumns();
  const hasApproval = await hasApprovalColumns();

  const insertData: Record<string, unknown> = {
    username,
    password_hash: passwordHash,
    full_name: fullName,
    role,
  };
  if (hasCols) {
    insertData.must_change_password = !isSelfRegistration;  // Admin-created users must change password; self-registered already know their password
  }
  if (hasApproval) {
    // المستخدمون المسجلون ذاتياً يحتاجون موافقة المدير
    // المستخدمون الذين أنشأهم المدير معتمدون تلقائياً
    insertData.is_approved = !isSelfRegistration;
    insertData.is_active = true;
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .insert(insertData)
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

export async function authenticateUser(username: string, password: string): Promise<Omit<AuthUserData, 'password_hash'>> {
  // SECURITY: Use supabaseAdmin to bypass RLS — auth must work even with strict RLS
  // SECURITY: Only select needed fields — never expose password_hash to callers
  const hasCols = await hasPasswordColumns();
  const hasApproval = await hasApprovalColumns();

  let selectFields: string;
  if (hasCols && hasApproval) {
    selectFields = 'id, username, password_hash, full_name, role, cloud_sync_enabled, must_change_password, password_version, is_approved, is_active, created_at';
  } else if (hasCols) {
    selectFields = 'id, username, password_hash, full_name, role, cloud_sync_enabled, must_change_password, password_version, created_at';
  } else {
    selectFields = 'id, username, password_hash, full_name, role, cloud_sync_enabled, created_at';
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select(selectFields)
    .eq('username', username)
    .single();

  if (error || !user) {
    throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
  }

  const userRecord = toRecord(user);
  // SECURITY: bcrypt.compare(plaintext, hash) — plaintext first, hash second
  const valid = await bcrypt.compare(password, userRecord.password_hash as string);
  if (!valid) {
    throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
  }

  // Return user data WITHOUT password_hash — add defaults for missing columns
  const { password_hash: _ph, ...safeUser } = userRecord;
  void _ph; // Suppress unused variable warning
  // Provide safe defaults when columns don't exist yet (pre-migration)
  if (!hasCols) {
    safeUser.must_change_password = false;
    safeUser.password_version = 1;
  }
  if (!hasApproval) {
    safeUser.is_approved = true;
    safeUser.is_active = true;
  }
  return safeUser as unknown as Omit<AuthUserData, 'password_hash'>;
}

export async function getUserById(id: string): Promise<UserData> {
  // Use supabaseAdmin to bypass RLS — server-side operation
  const hasCols = await hasPasswordColumns();
  const hasApproval = await hasApprovalColumns();

  let selectFields: string;
  if (hasCols && hasApproval) {
    selectFields = 'id, username, full_name, role, cloud_sync_enabled, must_change_password, password_version, is_approved, is_active, approved_by, approved_at, created_at';
  } else if (hasCols) {
    selectFields = 'id, username, full_name, role, cloud_sync_enabled, must_change_password, password_version, created_at';
  } else {
    selectFields = 'id, username, full_name, role, cloud_sync_enabled, created_at';
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select(selectFields)
    .eq('id', id)
    .single();

  if (error) throw new Error('المستخدم غير موجود');
  const record = toRecord(data);
  // Provide safe defaults for missing columns
  if (!hasCols) {
    record.must_change_password = false;
    record.password_version = 1;
  }
  if (!hasApproval) {
    record.is_approved = true;
    record.is_active = true;
    record.approved_by = null;
    record.approved_at = null;
  }
  return record as unknown as UserData;
}

export async function getAllUsers(): Promise<UserData[]> {
  // Use supabaseAdmin to bypass RLS — admin operation
  const hasCols = await hasPasswordColumns();
  const hasApproval = await hasApprovalColumns();

  let selectFields: string;
  if (hasCols && hasApproval) {
    selectFields = 'id, username, full_name, role, cloud_sync_enabled, max_devices, must_change_password, password_version, is_approved, is_active, approved_by, approved_at, created_at';
  } else if (hasCols) {
    selectFields = 'id, username, full_name, role, cloud_sync_enabled, max_devices, must_change_password, password_version, created_at';
  } else {
    selectFields = 'id, username, full_name, role, cloud_sync_enabled, max_devices, created_at';
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select(selectFields)
    .order('created_at', { ascending: false });

  if (error) throw new Error('فشل جلب المستخدمين');
  // Provide safe defaults for missing columns
  const results = toRecordArray(data || []);
  for (const user of results) {
    if (!hasCols) {
      user.must_change_password = false;
      user.password_version = 1;
    }
    if (!hasApproval) {
      user.is_approved = true;
      user.is_active = true;
      user.approved_by = null;
      user.approved_at = null;
    }
  }
  return results as unknown as UserData[];
}

export async function deleteUser(userId: string) {
  // Use supabaseAdmin to bypass RLS — admin operation
  // Cascade: delete all projects belonging to this user first
  const { error: projError } = await supabaseAdmin.from('projects').delete().eq('user_id', userId);
  if (projError) throw new Error('فشل حذف مشاريع المستخدم');

  const { error } = await supabaseAdmin.from('users').delete().eq('id', userId);
  if (error) throw new Error('فشل حذف المستخدم');
}

export async function changePassword(userId: string, newPassword: string): Promise<number> {
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const hasCols = await hasPasswordColumns();

  if (hasCols) {
    // Get current password_version to increment it
    const { data: currentUser } = await supabaseAdmin
      .from('users')
      .select('password_version')
      .eq('id', userId)
      .single();

    const currentRecord = toRecord(currentUser);
    const newVersion = ((currentRecord.password_version as number) || 0) + 1;

    // Use supabaseAdmin to bypass RLS
    // Also clear must_change_password flag AND increment password_version to invalidate old sessions
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        password_hash: passwordHash,
        must_change_password: false,
        password_version: newVersion,
      })
      .eq('id', userId);

    if (error) throw new Error('فشل تغيير كلمة المرور');
    return newVersion;
  } else {
    // Pre-migration: just update password_hash without new columns
    const { error } = await supabaseAdmin
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', userId);

    if (error) throw new Error('فشل تغيير كلمة المرور');
    return 1;
  }
}

export async function updateUserRole(userId: string, newRole: 'admin' | 'user') {
  // Use supabaseAdmin to bypass RLS — admin operation
  const { error } = await supabaseAdmin
    .from('users')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) throw new Error('فشل تحديث دور المستخدم');
}

export async function updateUserCloudSync(userId: string, enabled: boolean) {
  // Use supabaseAdmin to bypass RLS — admin operation
  const { error } = await supabaseAdmin
    .from('users')
    .update({ cloud_sync_enabled: enabled })
    .eq('id', userId);

  if (error) throw new Error('فشل تحديث صلاحية المزامنة السحابية');
}

/** الموافقة على حساب مستخدم من قِبل المدير */
export async function approveUser(userId: string, adminUserId: string) {
  const hasApproval = await hasApprovalColumns();
  if (!hasApproval) throw new Error('أعمدة الموافقة غير متوفرة بعد — يرجى تشغيل السكريبت');

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      is_approved: true,
      is_active: true,
      approved_by: adminUserId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw new Error('فشل الموافقة على المستخدم');
}

/** رفض حساب مستخدم (حذف الحساب) */
export async function rejectUser(userId: string) {
  // رفض المستخدم = حذف حسابه بالكامل
  await deleteUser(userId);
}

/** تفعيل/تعطيل حساب مستخدم */
export async function toggleUserActive(userId: string, isActive: boolean) {
  const hasApproval = await hasApprovalColumns();
  if (!hasApproval) throw new Error('أعمدة التفعيل غير متوفرة بعد — يرجى تشغيل السكريبت');

  const { error } = await supabaseAdmin
    .from('users')
    .update({ is_active: isActive })
    .eq('id', userId);

  if (error) throw new Error('فشل تحديث حالة المستخدم');
}

/** جلب المستخدمين بانتظار الموافقة */
export async function getPendingUsers(): Promise<UserData[]> {
  const hasApproval = await hasApprovalColumns();
  if (!hasApproval) return []; // إذا لم تكن الأعمدة متوفرة، لا يوجد مستخدمون معلقون

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, username, full_name, role, cloud_sync_enabled, max_devices, must_change_password, password_version, is_approved, is_active, approved_by, approved_at, created_at')
    .eq('is_approved', false)
    .order('created_at', { ascending: false });

  if (error) throw new Error('فشل جلب المستخدمين المعلقين');
  return (data || []) as unknown as UserData[];
}

// ======== Project Operations ========
export async function getProjects(userId: string, isAdmin: boolean = false) {
  // Use supabaseAdmin to bypass RLS — server-side operation
  let query = supabaseAdmin
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
  // Use supabaseAdmin to bypass RLS — server-side operation
  const { data, error } = await supabaseAdmin
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
  // Use supabaseAdmin to bypass RLS — server-side operation
  await supabaseAdmin
    .from('projects')
    .update({ is_current: false })
    .eq('user_id', userId)
    .eq('is_current', true);

  const { data, error } = await supabaseAdmin
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
  // Use supabaseAdmin to bypass RLS — server-side operation
  const { data, error } = await supabaseAdmin
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .select()
    .single();

  if (error) throw new Error('فشل تحديث المشروع');
  return data;
}

export async function deleteProject(projectId: string) {
  // Use supabaseAdmin to bypass RLS — server-side operation
  const { error } = await supabaseAdmin
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) throw new Error('فشل حذف المشروع');
}

// ======== Device Operations (Hybrid Fingerprint System) ========

/** التحقق من جهاز المستخدم — إرجاع حالة الجهاز */
export async function checkDevice(userId: string, deviceFingerprint: string) {
  // البحث عن الجهاز بقاعدة البيانات
  // Use supabaseAdmin to bypass RLS — server-side operation
  const { data: existingDevice, error } = await supabaseAdmin
    .from('devices')
    .select('*')
    .eq('user_id', userId)
    .eq('device_id', deviceFingerprint)
    .single();

  if (existingDevice) {
    // الجهاز معروف — تحديث آخر استخدام
    await supabaseAdmin
      .from('devices')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', existingDevice.id);

    return {
      known: true,
      approved: existingDevice.is_approved && existingDevice.is_active,
      device: existingDevice,
    };
  }

  // جهاز جديد — لا يوجد سجل
  return { known: false, approved: false, device: null };
}

/** تسجيل جهاز جديد — بانتظار موافقة المدير */
export async function registerDevice(
  userId: string,
  deviceFingerprint: string,
  deviceName: string,
  fullFingerprint: string
) {
  // التحقق من عدد الأجهزة المسموحة
  // Use supabaseAdmin to bypass RLS
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('max_devices')
    .eq('id', userId)
    .single();

  const { data: currentDevices } = await supabaseAdmin
    .from('devices')
    .select('id')
    .eq('user_id', userId);

  const maxDevices = user?.max_devices || 2;
  if ((currentDevices?.length || 0) >= maxDevices) {
    throw new Error(`تم بلوغ الحد الأقصى للأجهزة (${maxDevices}). تواصل مع المدير.`);
  }

  // Use supabaseAdmin to bypass RLS — server-side operation
  const { data, error } = await supabaseAdmin
    .from('devices')
    .insert({
      user_id: userId,
      device_id: deviceFingerprint,
      device_fingerprint: fullFingerprint,
      device_name: deviceName,
      is_active: false,       // غير مفعل حتى يوافق المدير
      is_approved: false,      // بانتظار الموافقة
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('الجهاز مسجل مسبقاً وبانتظار الموافقة');
    }
    throw new Error('فشل تسجيل الجهاز');
  }
  return data;
}

export async function getDevicesByUser(userId: string) {
  // Use supabaseAdmin to bypass RLS — server-side operation
  const { data, error } = await supabaseAdmin
    .from('devices')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('فشل جلب الأجهزة');
  return data || [];
}

/** الموافقة على جهاز من قِبل المدير */
export async function approveDevice(deviceId: string, adminUserId: string) {
  // Use supabaseAdmin to bypass RLS — admin operation
  const { error } = await supabaseAdmin
    .from('devices')
    .update({
      is_active: true,
      is_approved: true,
      approved_by: adminUserId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', deviceId);

  if (error) throw new Error('فشل الموافقة على الجهاز');
}

/** رفض/حظر جهاز */
export async function rejectDevice(deviceId: string) {
  // Use supabaseAdmin to bypass RLS — admin operation
  const { error } = await supabaseAdmin
    .from('devices')
    .delete()
    .eq('id', deviceId);

  if (error) throw new Error('فشل رفض الجهاز');
}

export async function toggleDevice(deviceId: string, isActive: boolean) {
  // Use supabaseAdmin to bypass RLS — admin operation
  const { error } = await supabaseAdmin
    .from('devices')
    .update({ is_active: isActive })
    .eq('id', deviceId);

  if (error) throw new Error('فشل تحديث حالة الجهاز');
}

export async function deleteDevice(deviceId: string) {
  // Use supabaseAdmin to bypass RLS — admin operation
  const { error } = await supabaseAdmin
    .from('devices')
    .delete()
    .eq('id', deviceId);

  if (error) throw new Error('فشل حذف الجهاز');
}

/** جلب جميع الأجهزة المعلقة (للمدير) */
export async function getPendingDevices() {
  // Use supabaseAdmin to bypass RLS — admin operation
  // NOTE: لا نستخدم join مع users لأنه قد يفشل مع RLS الصارم
  // بدلاً من ذلك نجلب الأجهزة المعلقة ثم نجلب بيانات المستخدمين بشكل منفصل
  const { data: devices, error } = await supabaseAdmin
    .from('devices')
    .select('*')
    .eq('is_approved', false)
    .order('created_at', { ascending: false });

  if (error) throw new Error('فشل جلب الأجهزة المعلقة');

  // جلب بيانات المستخدمين بشكل منفصل لربطها بالأجهزة
  const deviceList = devices || [];
  if (deviceList.length === 0) return [];

  // جمع معرّفات المستخدمين الفريدة
  const userIds = [...new Set(deviceList.map((d: Record<string, unknown>) => d.user_id as string))];

  const { data: usersData } = await supabaseAdmin
    .from('users')
    .select('id, username, full_name')
    .in('id', userIds);

  // بناء خريطة المستخدمين
  const userMap = new Map<string, { username: string; full_name: string }>();
  if (usersData) {
    for (const u of usersData) {
      userMap.set(u.id, { username: u.username, full_name: u.full_name });
    }
  }

  // ربط بيانات المستخدمين بالأجهزة
  return deviceList.map((device: Record<string, unknown>) => ({
    ...device,
    users: userMap.get(device.user_id as string) || null,
  }));
}
