'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Clock, LogOut, RefreshCw, Smartphone, Monitor } from 'lucide-react';

interface PendingApprovalProps {
  deviceName?: string;
  username?: string;
  reason?: string; // 'account_pending' | 'device_pending'
  onLogout: () => void;
  onRefresh: () => void;
}

export default function PendingApproval({ deviceName, username, reason, onLogout, onRefresh }: PendingApprovalProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [checkCount, setCheckCount] = useState(0);

  // فحص تلقائي كل 30 ثانية
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsChecking(true);
    setCheckCount(prev => prev + 1);
    try {
      await onRefresh();
    } finally {
      setIsChecking(false);
    }
  };

  const isAccountPending = reason === 'account_pending';
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4" dir="rtl">
      <Card className="w-full max-w-md shadow-2xl border-amber-200/50 dark:border-amber-800/50">
        <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-lg pb-6 text-center">
          <div className="flex justify-center mb-3">
            <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm">
              <Clock className="h-10 w-10" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {isAccountPending ? 'حسابك بانتظار الموافقة' : 'بانتظار موافقة المدير'}
          </CardTitle>
          <p className="text-amber-100 text-sm mt-1">
            {isAccountPending
              ? 'تم إنشاء حسابك وهو بانتظار اعتماد المدير'
              : 'تم تسجيل جهازك وهو بانتظار الاعتماد'}
          </p>
        </CardHeader>

        <CardContent className="p-6 space-y-5">
          {/* حالة الطلب */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  {isAccountPending ? 'طلب اعتماد حساب جديد' : 'طلب اعتماد جهاز جديد'}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {isAccountPending
                    ? 'تم إرسال طلب تسجيل حسابك إلى المدير. لن تتمكن من استخدام التطبيق حتى تتم الموافقة على حسابك.'
                    : 'تم إرسال طلب اعتماد هذا الجهاز إلى المدير. لن تتمكن من استخدام التطبيق حتى تتم الموافقة.'}
                </p>
              </div>
            </div>
          </div>

          {/* معلومات الجهاز */}
          <div className="bg-white dark:bg-gray-800 border rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">معلومات الجهاز</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {isMobile ? (
                  <Smartphone className="h-4 w-4" />
                ) : (
                  <Monitor className="h-4 w-4" />
                )}
                <span>{deviceName || 'جهاز غير معروف'}</span>
              </div>
              {username && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" />
                  <span>المستخدم: {username}</span>
                </div>
              )}
            </div>
          </div>

          {/* تعليمات */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              <strong>ماذا يحدث الآن؟</strong><br />
              {isAccountPending ? (
                <>
                  1. تم إرسال طلب تسجيل حسابك إلى المدير (بشار السليمان)<br />
                  2. سيقوم المدير بمراجعة طلبك والموافقة عليه<br />
                  3. بعد الموافقة على حسابك، يمكنك تسجيل الدخول<br />
                  4. سيحتاج كل جهاز جديد أيضاً موافقة المدير
                </>
              ) : (
                <>
                  1. تم إرسال طلب اعتماد الجهاز إلى المدير (بشار السليمان)<br />
                  2. سيقوم المدير بمراجعة طلبك والموافقة عليه<br />
                  3. بعد الموافقة، يمكنك تسجيل الدخول من هذا الجهاز<br />
                  4. الحد الأقصى: جهازان لكل مستخدم
                </>
              )}
            </p>
          </div>

          {/* آخر فحص */}
          {checkCount > 0 && (
            <p className="text-xs text-center text-muted-foreground">
              آخر فحص: منذ لحظات {isChecking && <RefreshCw className="inline h-3 w-3 animate-spin" />}
            </p>
          )}

          {/* أزرار */}
          <div className="flex gap-3">
            <Button
              onClick={handleRefresh}
              disabled={isChecking}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isChecking ? (
                <RefreshCw className="h-4 w-4 me-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 me-2" />
              )}
              فحص الموافقة
            </Button>
            <Button
              onClick={onLogout}
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <LogOut className="h-4 w-4 me-2" />
              تسجيل الخروج
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
