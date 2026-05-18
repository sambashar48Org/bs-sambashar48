'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, Plus, Trash2, LogOut, ArrowRight, Loader2, Users, RefreshCw, AlertCircle,
  Smartphone, Monitor, CheckCircle2, XCircle, Power, PowerOff, Cloud, CloudOff,
  ChevronDown, Clock, Hash, KeyRound, UserCog, Ban, UserCheck, UserX,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/lib/i18n';

// ═══════════════════════════════════════════════════════════════
// الأنواع
// ═══════════════════════════════════════════════════════════════

interface User {
  id: string;
  username: string;
  full_name: string;
  role: 'admin' | 'user';
  cloud_sync_enabled: boolean;
  max_devices: number;
  must_change_password: boolean;
  is_approved: boolean;
  is_active: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

interface Device {
  id: string;
  user_id: string;
  device_id: string;
  device_fingerprint: string;
  device_name: string;
  is_active: boolean;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  users?: { username: string; full_name: string };
}

// ═══════════════════════════════════════════════════════════════
// المكون الرئيسي
// ═══════════════════════════════════════════════════════════════

export default function AdminContent() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const { t, dir } = useTranslation();

  // ─── حالة المستخدمين ───
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [error, setError] = useState('');
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ username: '', password: '', fullName: '' });
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [deleteUserTarget, setDeleteUserTarget] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [userActionLoading, setUserActionLoading] = useState<string | null>(null);

  // ─── حالة إعادة تعيين كلمة المرور ───
  const [resetPasswordTarget, setResetPasswordTarget] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // ─── حالة تغيير الدور ───
  const [roleChangeTarget, setRoleChangeTarget] = useState<User | null>(null);
  const [isChangingRole, setIsChangingRole] = useState(false);

  // ─── حالة تغيير عدد الأجهزة ───
  const [maxDevicesTarget, setMaxDevicesTarget] = useState<User | null>(null);
  const [newMaxDevices, setNewMaxDevices] = useState(2);
  const [isChangingMaxDevices, setIsChangingMaxDevices] = useState(false);

  // ─── حالة الأجهزة ───
  const [pendingDevices, setPendingDevices] = useState<Device[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [userDevices, setUserDevices] = useState<Record<string, Device[]>>({});
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [isLoadingDevices, setIsLoadingDevices] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ─── تبويب نشط ───
  const [activeTab, setActiveTab] = useState<'users' | 'devices'>('users');

  // ─── معرّف المستخدم الحالي (المدير المسجل دخوله) ───
  // يُستخدم لمنع المدير من تعديل/حذف حسابه الخاص فقط، وليس منع إدارة المشرفين الآخرين
  const currentAdminId = user?.id || '';

  // ═══════════════════════════════════════════════════════════════
  // جلب البيانات
  // ═══════════════════════════════════════════════════════════════

  const fetchUsers = useCallback(async (): Promise<User[] | null> => {
    setIsLoadingUsers(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || 'فشل في تحميل المستخدمين');
        return null;
      }
      const data = await res.json();
      setUsers(data);
      return data;
    } catch {
      setError('تعذر الاتصال بالخادم');
      return null;
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  const fetchPendingDevices = useCallback(async () => {
    setIsLoadingPending(true);
    try {
      const res = await fetch('/api/admin/users/00000000-0000-0000-0000-000000000000/devices?pending=all', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setPendingDevices(data.devices || []);
      } else {
        console.warn('[ADMIN] Failed to fetch pending devices:', res.status);
        setPendingDevices([]);
      }
    } catch (err) {
      console.warn('[ADMIN] Error fetching pending devices:', err);
      setPendingDevices([]);
    } finally {
      setIsLoadingPending(false);
    }
  }, []);

  const fetchUserDevices = useCallback(async (userId: string) => {
    setIsLoadingDevices(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/devices`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUserDevices((prev) => ({ ...prev, [userId]: data.devices || [] }));
      }
    } catch {
      // صامت
    } finally {
      setIsLoadingDevices(null);
    }
  }, []);

  // تحميل أجهزة جميع المستخدمين تلقائياً بعد جلب قائمة المستخدمين (بما فيهم المشرفون الآخرون)
  const fetchAllUserDevices = useCallback(async (userList: User[]) => {
    // جلب أجهزة جميع المستخدمين ما عدا المدير الحالي (لا حاجة لعرض أجهزته هو)
    // نحمّل أجهزة جميع المستخدمين بمن فيهم المعلّقون (is_approved = false)
    // لأن أجهزتهم قد تكون مسجلة وبانتظار الموافقة
    const targetUsers = userList.filter((u) => u.id !== currentAdminId);
    // تحميل أجهزة كل المستخدمين بالتوازي
    const devicePromises = targetUsers.map(async (u) => {
      try {
        const res = await fetch(`/api/admin/users/${u.id}/devices`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          return { userId: u.id, devices: data.devices || [] };
        }
      } catch {
        // صامت
      }
      return null;
    });
    const results = await Promise.all(devicePromises);
    const devicesMap: Record<string, Device[]> = {};
    for (const result of results) {
      if (result) {
        devicesMap[result.userId] = result.devices;
      }
    }
    setUserDevices((prev) => ({ ...prev, ...devicesMap }));
  }, [currentAdminId]);

  const refreshAll = useCallback(async () => {
    const usersData = await fetchUsers();
    if (usersData) {
      // جلب الأجهزة المعلقة + أجهزة جميع المستخدمين بالتوازي
      await Promise.all([
        fetchPendingDevices(),
        fetchAllUserDevices(usersData),
      ]);
    }
  }, [fetchUsers, fetchPendingDevices, fetchAllUserDevices]);

  useEffect(() => {
    if (user) refreshAll();
  }, [user, refreshAll]);

  // ─── تحديث تلقائي كل 30 ثانية للأجهزة المعلقة ───
  // يتيح للمدير رؤية طلبات الأجهزة الجديدة دون إعادة تحميل الصفحة
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/admin/users/00000000-0000-0000-0000-000000000000/devices?pending=all', {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          const newPending = data.devices || [];
          setPendingDevices((prev) => {
            // تحديث فقط إذا تغير العدد (تجنب إعادة الرسم غير الضرورية)
            if (prev.length !== newPending.length) return newPending;
            return prev;
          });
        }
      } catch {
        // صامت — أفضل جهد
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // ═══════════════════════════════════════════════════════════════
  // إجراءات المستخدمين
  // ═══════════════════════════════════════════════════════════════

  const handleAddUser = async () => {
    if (!newUserForm.username.trim() || !newUserForm.password.trim() || !newUserForm.fullName.trim()) return;
    setIsAddingUser(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUserForm.username.trim(),
          password: newUserForm.password,
          fullName: newUserForm.fullName.trim(),
        }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'فشل في إضافة المستخدم'); return; }
      setShowAddUserDialog(false);
      setNewUserForm({ username: '', password: '', fullName: '' });
      await fetchUsers();
    } catch { setError('تعذر الاتصال بالخادم'); } finally { setIsAddingUser(false); }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserTarget) return;
    setIsDeletingUser(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${deleteUserTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) { const data = await res.json(); setError(data.error || 'فشل في حذف المستخدم'); return; }
      setDeleteUserTarget(null);
      await fetchUsers();
    } catch { setError('تعذر الاتصال بالخادم'); } finally { setIsDeletingUser(false); }
  };

  const handleToggleCloudSync = async (userId: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloudSyncEnabled: enabled }),
        credentials: 'include',
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) =>
          u.id === userId ? { ...u, cloud_sync_enabled: enabled } : u
        ));
      }
    } catch {
      // صامت
    }
  };

  const handleApproveUser = async (userId: string) => {
    setUserActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved: true }),
        credentials: 'include',
      });
      if (res.ok) {
        await fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || 'فشل في الموافقة على المستخدم');
      }
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleRejectUser = async (userId: string) => {
    setUserActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved: false }),
        credentials: 'include',
      });
      if (res.ok) {
        await fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || 'فشل في رفض المستخدم');
      }
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleToggleUserActive = async (userId: string, isActive: boolean) => {
    setUserActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
        credentials: 'include',
      });
      if (res.ok) {
        await fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || 'فشل في تحديث حالة المستخدم');
      }
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordTarget || !newPassword.trim()) return;
    setIsResettingPassword(true);
    try {
      const res = await fetch(`/api/admin/users/${resetPasswordTarget.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'فشل في إعادة تعيين كلمة المرور'); return; }
      setResetPasswordTarget(null);
      setNewPassword('');
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleRoleChange = async () => {
    if (!roleChangeTarget) return;
    setIsChangingRole(true);
    try {
      const newRole = roleChangeTarget.role === 'admin' ? 'user' : 'admin';
      const res = await fetch(`/api/admin/users/${roleChangeTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'فشل في تغيير الدور'); return; }
      setRoleChangeTarget(null);
      await fetchUsers();
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setIsChangingRole(false);
    }
  };

  const handleMaxDevicesChange = async () => {
    if (!maxDevicesTarget) return;
    setIsChangingMaxDevices(true);
    try {
      const res = await fetch(`/api/admin/users/${maxDevicesTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxDevices: newMaxDevices }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'فشل في تحديث عدد الأجهزة'); return; }
      setMaxDevicesTarget(null);
      await fetchUsers();
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setIsChangingMaxDevices(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // إجراءات الأجهزة
  // ═══════════════════════════════════════════════════════════════

  const handleApproveDevice = async (deviceId: string, userId: string) => {
    setActionLoading(deviceId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', deviceId }),
        credentials: 'include',
      });
      if (res.ok) {
        await Promise.all([fetchPendingDevices(), fetchUserDevices(userId)]);
      }
    } catch {
      // صامت
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectDevice = async (deviceId: string, userId: string) => {
    setActionLoading(deviceId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', deviceId }),
        credentials: 'include',
      });
      if (res.ok) {
        await Promise.all([fetchPendingDevices(), fetchUserDevices(userId)]);
      }
    } catch {
      // صامت
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleDevice = async (deviceId: string, userId: string, isActive: boolean) => {
    setActionLoading(deviceId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/devices`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, isActive }),
        credentials: 'include',
      });
      if (res.ok) {
        await fetchUserDevices(userId);
      }
    } catch {
      // صامت
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteDevice = async (deviceId: string, userId: string) => {
    setActionLoading(deviceId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/devices?deviceId=${deviceId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        await Promise.all([fetchPendingDevices(), fetchUserDevices(userId)]);
      }
    } catch {
      // صامت
    } finally {
      setActionLoading(null);
    }
  };

  const toggleExpandUser = (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userId);
      if (!userDevices[userId]) {
        fetchUserDevices(userId);
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // مساعدات العرض
  // ═══════════════════════════════════════════════════════════════

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('ar-SY', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return dateStr; }
  };

  const formatDateShort = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('ar-SY', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch { return dateStr; }
  };

  const getDeviceIcon = (deviceName: string) => {
    if (/Android|iPhone|iPad|Mobile/i.test(deviceName)) {
      return <Smartphone className="w-4 h-4" />;
    }
    return <Monitor className="w-4 h-4" />;
  };

  // ═══════════════════════════════════════════════════════════════
  // عرض التحميل
  // ═══════════════════════════════════════════════════════════════

  if (authLoading) {
    return (
      <div dir={dir} className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // عدادات
  // ═══════════════════════════════════════════════════════════════

  const totalApprovedDevices = Object.values(userDevices).reduce(
    (sum, devs) => sum + devs.filter((d) => d.is_approved && d.is_active).length, 0
  );
  // is_approved === false فقط (وليس NULL) — المستخدمون القدامى قد يكون is_approved=NULL
  const pendingUsers = users.filter((u) => u.is_approved === false && u.id !== currentAdminId);
  const activeUsers = users.filter((u) => u.is_approved !== false && u.is_active !== false && u.id !== currentAdminId);

  // ═══════════════════════════════════════════════════════════════
  // الرسم
  // ═══════════════════════════════════════════════════════════════

  return (
    <div dir={dir} className="min-h-screen flex flex-col bg-gray-50/80">
      {/* ─── الهيدر ─── */}
      <header className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-600 shadow-md">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-800">{t.userManagement}</h1>
              <p className="text-xs text-gray-500 hidden sm:block">لوحة تحكم المشرفين — B.S Evaluation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshAll} disabled={isLoadingUsers} className="gap-1.5">
              <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">تحديث</span>
            </Button>
            <Button variant="outline" size="sm" asChild className="gap-1.5 text-sm">
              <Link href="/"><ArrowRight className="w-4 h-4" /><span className="hidden sm:inline">الرئيسية</span></Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={logout} className="gap-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50">
              <LogOut className="w-4 h-4" /><span className="hidden sm:inline">خروج</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* ─── رسائل الخطأ ─── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <span className="flex-1">{error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError('')} className="text-red-600 hover:text-red-800 hover:bg-red-100 h-auto px-2">✕</Button>
          </div>
        )}

        {/* ─── بطاقات الإحصائيات ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card className="py-4">
            <CardContent className="px-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{users.length}</p>
                  <p className="text-xs text-gray-500">المستخدمون</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardContent className="px-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{activeUsers.length}</p>
                  <p className="text-xs text-gray-500">مستخدمون فعّالون</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={`py-4 ${pendingUsers.length + pendingDevices.length > 0 ? 'border-2 border-amber-400 shadow-md' : 'border-amber-200'}`}>
            <CardContent className="px-4">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${pendingUsers.length + pendingDevices.length > 0 ? 'bg-amber-200' : 'bg-amber-100'}`}>
                  <Clock className={`w-5 h-5 ${pendingUsers.length + pendingDevices.length > 0 ? 'text-amber-700' : 'text-amber-600'}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${pendingUsers.length + pendingDevices.length > 0 ? 'text-amber-700 animate-pulse' : 'text-amber-700'}`}>{pendingUsers.length + pendingDevices.length}</p>
                  <p className="text-xs text-gray-500">بانتظار الموافقة</p>
                  {pendingUsers.length > 0 && <p className="text-[10px] text-amber-600">{pendingUsers.length} حساب + {pendingDevices.length} جهاز</p>}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardContent className="px-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-100">
                  <Monitor className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{totalApprovedDevices}</p>
                  <p className="text-xs text-gray-500">أجهزة فعّالة</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── قسم طلبات الموافقة العاجلة ─── دائماً ظاهر ─── */}
        <Card className={`border-2 ${pendingUsers.length > 0 || pendingDevices.length > 0 ? 'border-amber-400 bg-amber-50/50 shadow-md' : 'border-gray-200 bg-white'} transition-all`}>
          <CardHeader className="pb-3">
            <CardTitle className={`text-lg font-bold flex items-center gap-2 ${pendingUsers.length > 0 || pendingDevices.length > 0 ? 'text-amber-800' : 'text-gray-600'}`}>
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${pendingUsers.length > 0 || pendingDevices.length > 0 ? 'bg-amber-200 text-amber-700' : 'bg-gray-100 text-gray-400'}`}>
                <AlertCircle className="w-5 h-5" />
              </div>
              طلبات بانتظار الموافقة
              {pendingUsers.length + pendingDevices.length > 0 ? (
                <Badge className="bg-amber-500 text-white animate-pulse">{pendingUsers.length + pendingDevices.length}</Badge>
              ) : (
                <Badge variant="secondary" className="bg-gray-100 text-gray-500">0</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingUsers.length === 0 && pendingDevices.length === 0 && (
              <div className="text-center py-6 text-gray-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">لا توجد طلبات معلقة حالياً</p>
                <p className="text-xs mt-1">جميع الطلبات تمت معالجتها</p>
              </div>
            )}
            {/* مستخدمون بانتظار الموافقة على الحساب */}
            {pendingUsers.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-amber-700 flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> مستخدمون جدد بانتظار الموافقة على الحساب ({pendingUsers.length})
                </p>
                <p className="text-xs text-amber-600 mb-2">⚠ يجب الموافقة على الحساب أولاً قبل أن يتمكن المستخدم من تسجيل جهازه</p>
                {pendingUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-3 bg-white border border-amber-200 rounded-xl shadow-sm">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-700 text-sm font-bold shrink-0">
                      {u.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{u.full_name}</p>
                      <p className="text-xs text-gray-500">@{u.username} — {formatDateShort(u.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleApproveUser(u.id)}
                        disabled={userActionLoading === u.id}
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-3"
                      >
                        {userActionLoading === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                        <span>موافقة</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectUser(u.id)}
                        disabled={userActionLoading === u.id}
                        className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50 h-9 px-3"
                      >
                        {userActionLoading === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
                        <span>رفض</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* أجهزة بانتظار الموافقة */}
            {pendingDevices.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-amber-700 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" /> أجهزة جديدة بانتظار الموافقة ({pendingDevices.length})
                </p>
                {pendingDevices.map((device) => (
                  <div key={device.id} className="flex items-center gap-3 p-3 bg-white border border-amber-200 rounded-xl shadow-sm">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                      {getDeviceIcon(device.device_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{device.device_name || 'جهاز غير معروف'}</p>
                      <p className="text-xs text-gray-500">
                        {device.users?.full_name || device.users?.username || 'مستخدم'} — {formatDateShort(device.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" onClick={() => handleApproveDevice(device.id, device.user_id)} disabled={actionLoading === device.id} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-3">
                        {actionLoading === device.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>موافقة</span>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleRejectDevice(device.id, device.user_id)} disabled={actionLoading === device.id} className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50 h-9 px-3">
                        {actionLoading === device.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>رفض</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── تبويبات التنقل ─── */}
        <div className="flex gap-2 border-b pb-0">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              إدارة المستخدمين
              {pendingUsers.length > 0 && (
                <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                  {pendingUsers.length}
                </Badge>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('devices')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'devices'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              إدارة الأجهزة
              {pendingDevices.length > 0 && (
                <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                  {pendingDevices.length}
                </Badge>
              )}
            </span>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            تبويب إدارة المستخدمين
            ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'users' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                قائمة المستخدمين
              </CardTitle>
              <Button
                size="sm"
                onClick={() => setShowAddUserDialog(true)}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة مستخدم</span>
              </Button>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {isLoadingUsers && users.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-3" />
                  <p className="text-sm">جاري تحميل المستخدمين...</p>
                </div>
              )}
              {!isLoadingUsers && users.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Users className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm font-medium">لا يوجد مستخدمون حالياً</p>
                  <p className="text-xs mt-1">اضغط على &quot;إضافة مستخدم&quot; لإنشاء حساب جديد</p>
                </div>
              )}
              {users.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                        <TableHead className="text-right font-semibold text-gray-600 px-4 py-3">المستخدم</TableHead>
                        <TableHead className="text-center font-semibold text-gray-600 px-4 py-3">الحالة</TableHead>
                        <TableHead className="text-center font-semibold text-gray-600 px-4 py-3">الدور</TableHead>
                        <TableHead className="text-center font-semibold text-gray-600 px-4 py-3 hidden md:table-cell">مزامنة</TableHead>
                        <TableHead className="text-center font-semibold text-gray-600 px-4 py-3 hidden lg:table-cell">أجهزة</TableHead>
                        <TableHead className="text-center font-semibold text-gray-600 px-4 py-3">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => {
                        const devices = userDevices[u.id] || [];
                        const activeDevCount = devices.filter((d) => d.is_approved && d.is_active).length;

                        return (
                          <TableRow key={u.id} className="group">
                            {/* المستخدم */}
                            <TableCell className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-xs font-bold shrink-0">
                                  {u.full_name?.charAt(0) || 'U'}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-800 truncate">{u.full_name}</p>
                                  <p className="text-xs text-gray-500">@{u.username}</p>
                                </div>
                              </div>
                            </TableCell>

                            {/* الحالة — معالجة NULL: المستخدمون القدامى قد يكون is_approved=NULL */}
                            <TableCell className="px-4 py-3 text-center">
                              {u.is_approved === false ? (
                                <Badge className="bg-amber-100 text-amber-700 gap-1">
                                  <Clock className="w-3 h-3" /> معلّق
                                </Badge>
                              ) : u.is_active === false ? (
                                <Badge className="bg-red-100 text-red-700 gap-1">
                                  <Ban className="w-3 h-3" /> معطّل
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-700 gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> فعّال
                                </Badge>
                              )}
                            </TableCell>

                            {/* الدور */}
                            <TableCell className="px-4 py-3 text-center">
                              <Badge
                                variant={u.role === 'admin' ? 'default' : 'secondary'}
                                className={u.role === 'admin' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                              >
                                {u.role === 'admin' ? 'مشرف' : 'مستخدم'}
                              </Badge>
                            </TableCell>

                            {/* مزامنة */}
                            <TableCell className="px-4 py-3 text-center hidden md:table-cell">
                              <Switch
                                checked={u.cloud_sync_enabled}
                                onCheckedChange={(checked) => handleToggleCloudSync(u.id, checked)}
                                disabled={u.id === currentAdminId}
                              />
                            </TableCell>

                            {/* أجهزة */}
                            <TableCell className="px-4 py-3 text-center hidden lg:table-cell">
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Hash className="w-3 h-3" />
                                {activeDevCount}/{u.max_devices || 2}
                              </Badge>
                            </TableCell>

                            {/* الإجراءات */}
                            <TableCell className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1 flex-wrap">
                                {/* موافقة / رفض للمستخدمين المعلقين — is_approved===false فقط وليس NULL */}
                                {u.is_approved === false && u.id !== currentAdminId && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleApproveUser(u.id)}
                                      disabled={userActionLoading === u.id}
                                      title="موافقة على المستخدم"
                                      className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                                    >
                                      {userActionLoading === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRejectUser(u.id)}
                                      disabled={userActionLoading === u.id}
                                      title="رفض المستخدم"
                                      className="h-8 w-8 text-red-500 hover:bg-red-50"
                                    >
                                      <UserX className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}

                                {/* تفعيل/تعطيل للمستخدمين المعتمدين — is_approved !== false يشمل true و NULL؛ يمنع المدير من تعطيل نفسه فقط */}
                                {u.is_approved !== false && u.id !== currentAdminId && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleToggleUserActive(u.id, !u.is_active)}
                                    disabled={userActionLoading === u.id}
                                    title={u.is_active ? 'تعطيل المستخدم' : 'تفعيل المستخدم'}
                                    className={`h-8 w-8 ${u.is_active ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                                  >
                                    {userActionLoading === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : u.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                  </Button>
                                )}

                                {/* تغيير الدور — متاح لجميع المستخدمين ما عدا المدير الحالي (لا يغيّر دور نفسه) */}
                                {u.id !== currentAdminId && u.is_approved !== false && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setRoleChangeTarget(u)}
                                    title="تغيير الدور"
                                    className="h-8 w-8 text-blue-500 hover:bg-blue-50"
                                  >
                                    <UserCog className="w-4 h-4" />
                                  </Button>
                                )}

                                {/* إعادة تعيين كلمة المرور — متاح للجميع ما عدا المدير الحالي */}
                                {u.id !== currentAdminId && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => { setResetPasswordTarget(u); setNewPassword(''); }}
                                    title="إعادة تعيين كلمة المرور"
                                    className="h-8 w-8 text-violet-500 hover:bg-violet-50"
                                  >
                                    <KeyRound className="w-4 h-4" />
                                  </Button>
                                )}

                                {/* عدد الأجهزة — متاح للجميع ما عدا المدير الحالي */}
                                {u.id !== currentAdminId && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => { setMaxDevicesTarget(u); setNewMaxDevices(u.max_devices || 2); }}
                                    title="تعديل عدد الأجهزة المسموحة"
                                    className="h-8 w-8 text-gray-500 hover:bg-gray-100"
                                  >
                                    <Hash className="w-4 h-4" />
                                  </Button>
                                )}

                                {/* حذف — يمنع المدير من حذف نفسه فقط، يمكنه حذف المشرفين الآخرين */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteUserTarget(u)}
                                  disabled={u.id === currentAdminId}
                                  title={u.id === currentAdminId ? 'لا يمكنك حذف حسابك' : 'حذف المستخدم'}
                                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-30"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            تبويب إدارة الأجهزة — مع أزرار واضحة للتفعيل والتعطيل
            ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'devices' && (
          <div className="space-y-6">
            {/* ─── المستخدمون المعلقون (يحتاجون موافقة الحساب أولاً) ─── */}
            {pendingUsers.length > 0 && (
              <Card className="border-2 border-amber-300 bg-amber-50/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold text-amber-800 flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-200">
                      <AlertCircle className="w-5 h-5 text-amber-700" />
                    </div>
                    حسابات معلّقة — تحتاج موافقة
                    <Badge className="bg-amber-500 text-white">{pendingUsers.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-amber-600 mb-3">
                    ⚠ هؤلاء المستخدمون سجّلوا حساباتهم بأنفسهم ولا يستطيعون الدخول حتى توافق على حساباتهم.
                    بعد الموافقة، سيتمكنون من الدخول وتسجيل أجهزتهم.
                  </p>
                  {pendingUsers.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 p-3 bg-white border border-amber-200 rounded-xl shadow-sm">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-700 text-sm font-bold shrink-0">
                        {u.full_name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{u.full_name}</p>
                        <p className="text-xs text-gray-500">@{u.username} — {formatDateShort(u.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleApproveUser(u.id)}
                          disabled={userActionLoading === u.id}
                          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-3"
                        >
                          {userActionLoading === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                          <span>موافقة</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectUser(u.id)}
                          disabled={userActionLoading === u.id}
                          className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50 h-9 px-3"
                        >
                          {userActionLoading === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
                          <span>رفض</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* ─── أجهزة معلقة بانتظار الموافقة ─── قسم بارز دائماً ─── */}
            {pendingDevices.length > 0 && (
              <Card className="border-2 border-amber-400 bg-amber-50/30 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold text-amber-800 flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-200 animate-pulse">
                      <Smartphone className="w-5 h-5 text-amber-700" />
                    </div>
                    أجهزة بانتظار الموافقة
                    <Badge className="bg-amber-500 text-white animate-pulse">{pendingDevices.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-amber-600 mb-3">
                    هذه الأجهزة مسجلة من مستخدمين معتمدين وتحتاج موافقتك للسماح لهم بالدخول.
                  </p>
                  {pendingDevices.map((device) => (
                    <div key={device.id} className="flex items-center gap-3 p-3 bg-white border border-amber-200 rounded-xl shadow-sm">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                        {getDeviceIcon(device.device_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{device.device_name || 'جهاز غير معروف'}</p>
                        <p className="text-xs text-gray-500">
                          المستخدم: {device.users?.full_name || device.users?.username || 'غير معروف'} — {formatDateShort(device.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleApproveDevice(device.id, device.user_id)}
                          disabled={actionLoading === device.id}
                          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-3"
                        >
                          {actionLoading === device.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          <span>موافقة</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectDevice(device.id, device.user_id)}
                          disabled={actionLoading === device.id}
                          className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50 h-9 px-3"
                        >
                          {actionLoading === device.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                          <span>رفض</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* ─── أجهزة كل مستخدم ─── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-emerald-600" />
                  أجهزة المستخدمين
                </CardTitle>
              </CardHeader>
              <CardContent>
                {users.filter((u) => u.id !== currentAdminId).length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">لا يوجد مستخدمون</p>
                    <p className="text-xs mt-1">أضف مستخدمين أو وافق على الحسابات المعلقة</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {users
                      .filter((u) => u.id !== currentAdminId)
                      .map((u) => {
                        const isExpanded = expandedUser === u.id;
                        const devices = userDevices[u.id] || [];
                        const isLoading = isLoadingDevices === u.id;
                        const activeDevCount = devices.filter((d) => d.is_approved && d.is_active).length;
                        const pendingDevCount = devices.filter((d) => !d.is_approved).length;
                        const totalDevCount = devices.length;

                        return (
                          <div key={u.id} className={`border rounded-xl overflow-hidden ${u.is_active === false || u.is_approved === false ? 'opacity-80' : ''}`}>
                            {/* صف المستخدم */}
                            <div
                              className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-right cursor-pointer"
                              onClick={() => toggleExpandUser(u.id)}
                            >
                              <div className={`shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              </div>
                              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-sm font-bold shrink-0">
                                {u.full_name?.charAt(0) || 'U'}
                              </div>
                              <div className="flex-1 min-w-0 text-right">
                                <p className="text-sm font-semibold text-gray-800">
                                  {u.full_name}
                                  {u.is_approved === false && <Badge className="mr-2 bg-amber-100 text-amber-700 text-[10px]">حساب معلّق</Badge>}
                                  {u.is_active === false && u.is_approved !== false && <Badge className="mr-2 bg-red-100 text-red-700 text-[10px]">معطّل</Badge>}
                                </p>
                                <p className="text-xs text-gray-500">@{u.username}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <Hash className="w-3 h-3" />
                                  {activeDevCount}/{u.max_devices || 2}
                                </Badge>
                                {pendingDevCount > 0 && (
                                  <Badge className="bg-amber-100 text-amber-700 text-[10px] gap-1">
                                    <Clock className="w-3 h-3" /> {pendingDevCount} معلّق
                                  </Badge>
                                )}
                                {totalDevCount === 0 && (
                                  <Badge className="bg-gray-100 text-gray-500 text-[10px] gap-1">
                                    <Smartphone className="w-3 h-3" /> لا أجهزة
                                  </Badge>
                                )}
                                <div className="flex items-center gap-1.5">
                                  {u.cloud_sync_enabled ? (
                                    <Cloud className="w-3.5 h-3.5 text-blue-500" />
                                  ) : (
                                    <CloudOff className="w-3.5 h-3.5 text-gray-300" />
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* قائمة الأجهزة */}
                            {isExpanded && (
                              <div className="border-t bg-gray-50/50">
                                {isLoading ? (
                                  <div className="flex items-center justify-center py-6">
                                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                  </div>
                                ) : devices.length === 0 ? (
                                  <div className="text-center py-6">
                                    <Smartphone className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                    <p className="text-xs text-gray-500 font-medium">لا توجد أجهزة مسجلة لهذا المستخدم بعد</p>
                                    <p className="text-[10px] text-gray-400 mt-1">ستظهر الأجهزة هنا بعد أن يسجل المستخدم الدخول من جهاز جديد</p>
                                  </div>
                                ) : (
                                  <div className="divide-y">
                                    {devices.map((device) => (
                                      <div key={device.id} className="flex items-center gap-3 px-4 py-3">
                                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                                          device.is_approved && device.is_active
                                            ? 'bg-emerald-100 text-emerald-600'
                                            : device.is_approved && !device.is_active
                                            ? 'bg-gray-100 text-gray-400'
                                            : 'bg-amber-100 text-amber-600'
                                        }`}>
                                          {getDeviceIcon(device.device_name)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-800 truncate">
                                            {device.device_name || 'جهاز غير معروف'}
                                          </p>
                                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            <span className="text-[10px] text-gray-400 font-mono">
                                              {device.device_id.substring(0, 12)}...
                                            </span>
                                            <span className="text-[10px] text-gray-400">
                                              آخر نشاط: {formatDateShort(device.last_seen_at)}
                                            </span>
                                          </div>
                                        </div>
                                        {/* حالة الجهاز */}
                                        <div className="shrink-0">
                                          {device.is_approved && device.is_active ? (
                                            <Badge className="bg-emerald-100 text-emerald-700 text-[10px] gap-1">
                                              <CheckCircle2 className="w-3 h-3" /> فعّال
                                            </Badge>
                                          ) : device.is_approved && !device.is_active ? (
                                            <Badge className="bg-gray-100 text-gray-500 text-[10px] gap-1">
                                              <PowerOff className="w-3 h-3" /> معطّل
                                            </Badge>
                                          ) : (
                                            <Badge className="bg-amber-100 text-amber-700 text-[10px] gap-1">
                                              <Clock className="w-3 h-3" /> معلّق
                                            </Badge>
                                          )}
                                        </div>
                                        {/* أزرار الإجراءات — واضحة وبارزة */}
                                        <div className="flex items-center gap-1 shrink-0">
                                          {device.is_approved ? (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleToggleDevice(device.id, u.id, !device.is_active)}
                                              disabled={actionLoading === device.id}
                                              title={device.is_active ? 'تعطيل الجهاز' : 'تفعيل الجهاز'}
                                              className={`h-8 w-8 ${device.is_active ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                                            >
                                              {actionLoading === device.id ? <Loader2 className="w-4 h-4 animate-spin" /> : device.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                            </Button>
                                          ) : (
                                            <>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleApproveDevice(device.id, u.id)}
                                                disabled={actionLoading === device.id}
                                                title="الموافقة على الجهاز"
                                                className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                                              >
                                                {actionLoading === device.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRejectDevice(device.id, u.id)}
                                                disabled={actionLoading === device.id}
                                                title="رفض الجهاز"
                                                className="h-8 w-8 text-red-500 hover:bg-red-50"
                                              >
                                                {actionLoading === device.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                              </Button>
                                            </>
                                          )}
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteDevice(device.id, u.id)}
                                            disabled={actionLoading === device.id}
                                            title="حذف الجهاز"
                                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="px-4 py-3 border-t bg-white/50 flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-2">
                                    <Cloud className="w-4 h-4 text-gray-500" />
                                    <span className="text-xs text-gray-600">المزامنة السحابية</span>
                                  </div>
                                  <Switch
                                    checked={u.cloud_sync_enabled}
                                    onCheckedChange={(checked) => handleToggleCloudSync(u.id, checked)}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════════════
          نافذة إضافة مستخدم
          ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-800">
              <Plus className="w-5 h-5 text-emerald-600" />
              إضافة مستخدم جديد
            </DialogTitle>
            <DialogDescription>أدخل بيانات المستخدم الجديد لإنشاء حساب (سيكون معتمداً تلقائياً)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-username" className="font-medium">اسم المستخدم</Label>
              <Input id="new-username" placeholder="مثال: engineer1" value={newUserForm.username} onChange={(e) => setNewUserForm((p) => ({ ...p, username: e.target.value }))} disabled={isAddingUser} className="text-right" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password" className="font-medium">كلمة المرور</Label>
              <Input id="new-password" type="password" placeholder="8 أحرف على الأقل" value={newUserForm.password} onChange={(e) => setNewUserForm((p) => ({ ...p, password: e.target.value }))} disabled={isAddingUser} className="text-right" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-fullname" className="font-medium">الاسم الكامل</Label>
              <Input id="new-fullname" placeholder="مثال: أحمد محمد" value={newUserForm.fullName} onChange={(e) => setNewUserForm((p) => ({ ...p, fullName: e.target.value }))} disabled={isAddingUser} className="text-right" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setShowAddUserDialog(false); setNewUserForm({ username: '', password: '', fullName: '' }); }} disabled={isAddingUser}>إلغاء</Button>
            <Button onClick={handleAddUser} disabled={isAddingUser || !newUserForm.username.trim() || !newUserForm.password.trim() || !newUserForm.fullName.trim()} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
              {isAddingUser ? <><Loader2 className="w-4 h-4 animate-spin" />جاري الإضافة...</> : <><Plus className="w-4 h-4" />إضافة المستخدم</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
          نافذة تأكيد حذف المستخدم
          ═══════════════════════════════════════════════════════════════ */}
      <AlertDialog open={!!deleteUserTarget} onOpenChange={(open) => !open && setDeleteUserTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              تأكيد حذف المستخدم
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 leading-relaxed">
              هل أنت متأكد من حذف المستخدم{' '}
              <span className="font-bold text-gray-800">{deleteUserTarget?.full_name}</span>{' '}
              ({deleteUserTarget?.username})؟
              <br />سيتم حذف جميع بياناته وأجهزته نهائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isDeletingUser}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={isDeletingUser} className="bg-red-600 hover:bg-red-700 text-white gap-1.5">
              {isDeletingUser ? <><Loader2 className="w-4 h-4 animate-spin" />جاري الحذف...</> : <><Trash2 className="w-4 h-4" />حذف المستخدم</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══════════════════════════════════════════════════════════════
          نافذة إعادة تعيين كلمة المرور
          ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={!!resetPasswordTarget} onOpenChange={(open) => { if (!open) { setResetPasswordTarget(null); setNewPassword(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-800">
              <KeyRound className="w-5 h-5 text-violet-600" />
              إعادة تعيين كلمة المرور
            </DialogTitle>
            <DialogDescription>
              إعادة تعيين كلمة مرور المستخدم: <span className="font-bold">{resetPasswordTarget?.full_name}</span> (@{resetPasswordTarget?.username})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reset-password" className="font-medium">كلمة المرور الجديدة</Label>
              <Input id="reset-password" type="password" placeholder="8 أحرف على الأقل" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={isResettingPassword} className="text-right" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setResetPasswordTarget(null); setNewPassword(''); }} disabled={isResettingPassword}>إلغاء</Button>
            <Button onClick={handleResetPassword} disabled={isResettingPassword || !newPassword.trim()} className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white">
              {isResettingPassword ? <><Loader2 className="w-4 h-4 animate-spin" />جاري التحديث...</> : <><KeyRound className="w-4 h-4" />إعادة التعيين</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
          نافذة تأكيد تغيير الدور
          ═══════════════════════════════════════════════════════════════ */}
      <AlertDialog open={!!roleChangeTarget} onOpenChange={(open) => !open && setRoleChangeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-blue-700">
              <UserCog className="w-5 h-5" />
              تأكيد تغيير الدور
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 leading-relaxed">
              هل تريد تغيير دور المستخدم{' '}
              <span className="font-bold text-gray-800">{roleChangeTarget?.full_name}</span> من{' '}
              <Badge variant="secondary">{roleChangeTarget?.role === 'admin' ? 'مشرف' : 'مستخدم'}</Badge> إلى{' '}
              <Badge variant="secondary">{roleChangeTarget?.role === 'admin' ? 'مستخدم' : 'مشرف'}</Badge>؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isChangingRole}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleRoleChange} disabled={isChangingRole} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
              {isChangingRole ? <><Loader2 className="w-4 h-4 animate-spin" />جاري التغيير...</> : <><UserCog className="w-4 h-4" />تأكيد التغيير</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══════════════════════════════════════════════════════════════
          نافذة تغيير عدد الأجهزة المسموحة
          ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={!!maxDevicesTarget} onOpenChange={(open) => !open && setMaxDevicesTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-800">
              <Hash className="w-5 h-5 text-gray-600" />
              تعديل عدد الأجهزة المسموحة
            </DialogTitle>
            <DialogDescription>
              تحديد الحد الأقصى للأجهزة للمستخدم: <span className="font-bold">{maxDevicesTarget?.full_name}</span> (@{maxDevicesTarget?.username})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="max-devices" className="font-medium">الحد الأقصى للأجهزة (1-10)</Label>
              <Input id="max-devices" type="number" min={1} max={10} value={newMaxDevices} onChange={(e) => setNewMaxDevices(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))} disabled={isChangingMaxDevices} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setMaxDevicesTarget(null)} disabled={isChangingMaxDevices}>إلغاء</Button>
            <Button onClick={handleMaxDevicesChange} disabled={isChangingMaxDevices} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
              {isChangingMaxDevices ? <><Loader2 className="w-4 h-4 animate-spin" />جاري التحديث...</> : <>تحديث</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
