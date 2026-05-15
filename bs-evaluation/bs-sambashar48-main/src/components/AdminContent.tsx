'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, Plus, Trash2, LogOut, ArrowRight, Loader2, Users, RefreshCw, AlertCircle,
  Smartphone, Monitor, CheckCircle2, XCircle, Power, PowerOff, Cloud, CloudOff,
  ChevronDown, ChevronLeft, Clock, Hash,
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
  // من العلاقة مع جدول users
  users?: { username: string; full_name: string };
}

// ═══════════════════════════════════════════════════════════════
// المكون الرئيسي
// ═══════════════════════════════════════════════════════════════

export default function AdminContent() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const { t, dir } = useTranslation('ar');

  // ─── حالة المستخدمين ───
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [error, setError] = useState('');
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ username: '', password: '', fullName: '' });
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [deleteUserTarget, setDeleteUserTarget] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // ─── حالة الأجهزة ───
  const [pendingDevices, setPendingDevices] = useState<Device[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [userDevices, setUserDevices] = useState<Record<string, Device[]>>({});
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [isLoadingDevices, setIsLoadingDevices] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // deviceId

  // ─── تبويب نشط ───
  const [activeTab, setActiveTab] = useState<'users' | 'devices'>('devices');

  // ═══════════════════════════════════════════════════════════════
  // جلب البيانات
  // ═══════════════════════════════════════════════════════════════

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || 'فشل في تحميل المستخدمين');
        return;
      }
      const data = await res.json();
      setUsers(data);
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  const fetchPendingDevices = useCallback(async () => {
    setIsLoadingPending(true);
    try {
      // نستخدم أي معرّف وهمي لأن المسار يتطلب [id]، لكننا نمرر ?pending=all
      const res = await fetch('/api/admin/users/00000000-0000-0000-0000-000000000000/devices?pending=all', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setPendingDevices(data.devices || []);
      }
    } catch {
      // صامت
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

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchUsers(), fetchPendingDevices()]);
  }, [fetchUsers, fetchPendingDevices]);

  useEffect(() => {
    if (user) refreshAll();
  }, [user, refreshAll]);

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
  // عد الأجهزة الإجمالية
  // ═══════════════════════════════════════════════════════════════

  const totalApprovedDevices = Object.values(userDevices).reduce(
    (sum, devs) => sum + devs.filter((d) => d.is_approved && d.is_active).length, 0
  );

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
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{users.filter((u) => u.role === 'admin').length}</p>
                  <p className="text-xs text-gray-500">المشرفون</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardContent className="px-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{pendingDevices.length}</p>
                  <p className="text-xs text-gray-500">أجهزة معلقة</p>
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

        {/* ─── تبويبات التنقل ─── */}
        <div className="flex gap-2 border-b pb-0">
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
            </span>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            تبويب إدارة الأجهزة
            ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'devices' && (
          <div className="space-y-6">
            {/* ─── الأجهزة المعلقة ─── */}
            <Card className="border-amber-200/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  أجهزة بانتظار الموافقة
                  {pendingDevices.length > 0 && (
                    <Badge className="bg-amber-500 text-white">{pendingDevices.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingPending && pendingDevices.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : pendingDevices.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">لا توجد أجهزة معلقة</p>
                    <p className="text-xs mt-1">جميع الأجهزة المعروضة تمت الموافقة عليها أو رفضها</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingDevices.map((device) => (
                      <div
                        key={device.id}
                        className="flex items-center gap-3 p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-800/50 rounded-xl"
                      >
                        {/* أيقونة الجهاز */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 shrink-0">
                          {getDeviceIcon(device.device_name)}
                        </div>

                        {/* معلومات الجهاز */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {device.device_name || 'جهاز غير معروف'}
                          </p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {device.users?.full_name || device.users?.username || 'مستخدم'}
                            </span>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDateShort(device.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* أزرار الإجراءات */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => handleApproveDevice(device.id, device.user_id)}
                            disabled={actionLoading === device.id}
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                          >
                            {actionLoading === device.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden sm:inline">موافقة</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectDevice(device.id, device.user_id)}
                            disabled={actionLoading === device.id}
                            className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 h-8"
                          >
                            {actionLoading === device.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden sm:inline">رفض</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ─── أجهزة كل مستخدم ─── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-emerald-600" />
                  أجهزة المستخدمين
                </CardTitle>
              </CardHeader>
              <CardContent>
                {users.filter((u) => u.role !== 'admin').length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">لا يوجد مستخدمون عاديون</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {users
                      .filter((u) => u.role !== 'admin')
                      .map((u) => {
                        const isExpanded = expandedUser === u.id;
                        const devices = userDevices[u.id] || [];
                        const isLoading = isLoadingDevices === u.id;
                        const activeDevices = devices.filter((d) => d.is_approved && d.is_active).length;

                        return (
                          <div key={u.id} className="border rounded-xl overflow-hidden">
                            {/* صف المستخدم */}
                            <button
                              onClick={() => toggleExpandUser(u.id)}
                              className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-right"
                            >
                              {/* أيقونة التوسيع */}
                              <div className={`shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              </div>

                              {/* صورة المستخدم */}
                              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-sm font-bold shrink-0">
                                {u.full_name?.charAt(0) || 'U'}
                              </div>

                              {/* معلومات المستخدم */}
                              <div className="flex-1 min-w-0 text-right">
                                <p className="text-sm font-semibold text-gray-800">{u.full_name}</p>
                                <p className="text-xs text-gray-500">@{u.username}</p>
                              </div>

                              {/* عدد الأجهزة */}
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <Hash className="w-3 h-3" />
                                  {activeDevices}/{u.max_devices || 2}
                                </Badge>

                                {/* حالة المزامنة السحابية */}
                                <div className="flex items-center gap-1.5">
                                  {u.cloud_sync_enabled ? (
                                    <Cloud className="w-3.5 h-3.5 text-blue-500" />
                                  ) : (
                                    <CloudOff className="w-3.5 h-3.5 text-gray-300" />
                                  )}
                                </div>
                              </div>
                            </button>

                            {/* قائمة الأجهزة */}
                            {isExpanded && (
                              <div className="border-t bg-gray-50/50">
                                {isLoading ? (
                                  <div className="flex items-center justify-center py-6">
                                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                  </div>
                                ) : devices.length === 0 ? (
                                  <div className="text-center py-6 text-gray-400">
                                    <p className="text-xs">لا توجد أجهزة مسجلة لهذا المستخدم</p>
                                  </div>
                                ) : (
                                  <div className="divide-y">
                                    {devices.map((device) => (
                                      <div key={device.id} className="flex items-center gap-3 px-4 py-3">
                                        {/* أيقونة الجهاز */}
                                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                                          device.is_approved && device.is_active
                                            ? 'bg-emerald-100 text-emerald-600'
                                            : device.is_approved && !device.is_active
                                            ? 'bg-gray-100 text-gray-400'
                                            : 'bg-amber-100 text-amber-600'
                                        }`}>
                                          {getDeviceIcon(device.device_name)}
                                        </div>

                                        {/* معلومات الجهاز */}
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

                                        {/* أزرار الإجراءات */}
                                        <div className="flex items-center gap-1 shrink-0">
                                          {device.is_approved ? (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleToggleDevice(device.id, u.id, !device.is_active)}
                                              disabled={actionLoading === device.id}
                                              title={device.is_active ? 'تعطيل الجهاز' : 'تفعيل الجهاز'}
                                              className={`h-7 w-7 ${device.is_active ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                                            >
                                              {actionLoading === device.id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                              ) : device.is_active ? (
                                                <PowerOff className="w-3.5 h-3.5" />
                                              ) : (
                                                <Power className="w-3.5 h-3.5" />
                                              )}
                                            </Button>
                                          ) : (
                                            <>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleApproveDevice(device.id, u.id)}
                                                disabled={actionLoading === device.id}
                                                title="موافقة"
                                                className="h-7 w-7 text-emerald-500 hover:bg-emerald-50"
                                              >
                                                {actionLoading === device.id ? (
                                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                                )}
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRejectDevice(device.id, u.id)}
                                                disabled={actionLoading === device.id}
                                                title="رفض"
                                                className="h-7 w-7 text-red-500 hover:bg-red-50"
                                              >
                                                <XCircle className="w-3.5 h-3.5" />
                                              </Button>
                                            </>
                                          )}
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteDevice(device.id, u.id)}
                                            disabled={actionLoading === device.id}
                                            title="حذف الجهاز"
                                            className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* خيارات إضافية */}
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
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                      <TableHead className="text-right font-semibold text-gray-600 px-4 py-3">اسم المستخدم</TableHead>
                      <TableHead className="text-right font-semibold text-gray-600 px-4 py-3 hidden sm:table-cell">الاسم الكامل</TableHead>
                      <TableHead className="text-center font-semibold text-gray-600 px-4 py-3">الدور</TableHead>
                      <TableHead className="text-center font-semibold text-gray-600 px-4 py-3 hidden md:table-cell">مزامنة سحابية</TableHead>
                      <TableHead className="text-right font-semibold text-gray-600 px-4 py-3 hidden md:table-cell">تاريخ التسجيل</TableHead>
                      <TableHead className="text-center font-semibold text-gray-600 px-4 py-3">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id} className="group">
                        <TableCell className="px-4 py-3">
                          <p className="font-medium text-gray-800">{u.username}</p>
                          <p className="text-xs text-gray-500 sm:hidden">{u.full_name}</p>
                        </TableCell>
                        <TableCell className="px-4 py-3 hidden sm:table-cell text-gray-700">{u.full_name}</TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <Badge
                            variant={u.role === 'admin' ? 'default' : 'secondary'}
                            className={u.role === 'admin' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                          >
                            {u.role === 'admin' ? 'مشرف' : 'مستخدم'}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center hidden md:table-cell">
                          <Switch
                            checked={u.cloud_sync_enabled}
                            onCheckedChange={(checked) => handleToggleCloudSync(u.id, checked)}
                            disabled={u.role === 'admin'}
                          />
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-sm hidden md:table-cell">
                          {formatDateShort(u.created_at)}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteUserTarget(u)}
                              disabled={u.role === 'admin'}
                              title={u.role === 'admin' ? 'لا يمكن حذف مشرف' : 'حذف المستخدم'}
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-30"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
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
            <DialogDescription>أدخل بيانات المستخدم الجديد لإنشاء حساب</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-username" className="font-medium">اسم المستخدم</Label>
              <Input
                id="new-username"
                placeholder="مثال: engineer1"
                value={newUserForm.username}
                onChange={(e) => setNewUserForm((p) => ({ ...p, username: e.target.value }))}
                disabled={isAddingUser}
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password" className="font-medium">كلمة المرور</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="8 أحرف على الأقل"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm((p) => ({ ...p, password: e.target.value }))}
                disabled={isAddingUser}
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-fullname" className="font-medium">الاسم الكامل</Label>
              <Input
                id="new-fullname"
                placeholder="مثال: أحمد محمد"
                value={newUserForm.fullName}
                onChange={(e) => setNewUserForm((p) => ({ ...p, fullName: e.target.value }))}
                disabled={isAddingUser}
                className="text-right"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => { setShowAddUserDialog(false); setNewUserForm({ username: '', password: '', fullName: '' }); }}
              disabled={isAddingUser}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={isAddingUser || !newUserForm.username.trim() || !newUserForm.password.trim() || !newUserForm.fullName.trim()}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isAddingUser ? (
                <><Loader2 className="w-4 h-4 animate-spin" />جاري الإضافة...</>
              ) : (
                <><Plus className="w-4 h-4" />إضافة المستخدم</>
              )}
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
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeletingUser}
              className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
            >
              {isDeletingUser ? (
                <><Loader2 className="w-4 h-4 animate-spin" />جاري الحذف...</>
              ) : (
                <><Trash2 className="w-4 h-4" />حذف المستخدم</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
