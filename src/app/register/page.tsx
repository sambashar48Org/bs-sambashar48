'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Shield, Lock, Loader2, AlertTriangle, UserPlus, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Cache-busting version — increment when deploying a new build
const BUILD_VERSION = '20260508-v5';

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // ─────────────────────────────────────────────────────
  // AGGRESSIVE CACHE & SERVICE WORKER CLEANUP
  // Runs once on mount to destroy any stale SW or cached data
  // from previous versions of the app.
  // ─────────────────────────────────────────────────────
  useEffect(() => {
    const cleanup = async () => {
      try {
        // 1. Unregister ALL service workers
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            await reg.unregister();
          }
        }

        // 2. Clear ALL Cache API caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          for (const name of cacheNames) {
            await caches.delete(name);
          }
        }
      } catch {
        // Silent fail — cleanup is best-effort
      }
    };

    cleanup();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate all fields
    if (!username.trim() || !password.trim() || !confirmPassword.trim() || !fullName.trim()) {
      setError('جميع الحقول مطلوبة');
      return;
    }

    if (username.trim().length < 3) {
      setError('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
      return;
    }

    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    if (!fullName.trim()) {
      setError('الاسم الكامل مطلوب');
      return;
    }

    setIsLoading(true);

    try {
      // Add cache-busting timestamp to prevent any proxy/SW from serving cached response
      const registerUrl = `/api/auth/register?_t=${Date.now()}`;
      const res = await fetch(registerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: username.trim(),
          password,
          fullName: fullName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'حدث خطأ أثناء إنشاء الحساب');
        return;
      }

      setSuccessMessage(data.message || 'تم إنشاء الحساب بنجاح');
      setIsSuccess(true);
    } catch {
      setError('تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #059669 0%, #0d9488 40%, #0f766e 70%, #115e59 100%)',
      }}
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-white/3 blur-2xl" />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* App Logo & Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg mb-4">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            B.S Evaluation
          </h1>
          <p className="text-white/70 text-sm sm:text-base mt-2 max-w-xs mx-auto leading-relaxed">
            تقييم فني للوضع الراهن للمباني الخرسانية المسلحة
          </p>
        </div>

        {/* Register Card */}
        <Card className="bg-white/95 backdrop-blur-md border-white/60 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl font-bold text-gray-800 flex items-center justify-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              إنشاء حساب جديد
            </CardTitle>
            <CardDescription className="text-gray-500 text-sm">
              أنشئ حسابك للوصول إلى نظام التقييم
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            {isSuccess ? (
              /* Success State */
              <div className="text-center space-y-4 py-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">تم إنشاء الحساب بنجاح!</h3>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-right">
                  <p className="text-amber-800 text-sm font-semibold mb-1">
                    حسابك بانتظار موافقة المدير
                  </p>
                  <p className="text-amber-600 text-xs leading-relaxed">
                    تم إرسال طلب تسجيلك إلى المدير (بشار السليمان). بعد الموافقة على حسابك، يمكنك تسجيل الدخول واستخدام التطبيق.
                  </p>
                </div>
                <Button
                  onClick={() => router.push('/login')}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <ArrowRight className="w-4 h-4 me-2" />
                  الانتقال لتسجيل الدخول
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Error Messages */}
                {error && (
                  <div className="mb-4 p-3 rounded-lg border text-sm flex items-start gap-3 bg-red-50 border-red-200 text-red-800">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                    <div>
                      <p className="font-medium">خطأ في التسجيل</p>
                      <p className="mt-0.5 opacity-80">{error}</p>
                    </div>
                  </div>
                )}

                {/* Full Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-gray-700 font-medium">
                    الاسم الكامل
                  </Label>
                  <div className="relative">
                    <Shield className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="أدخل الاسم الكامل"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pr-10 h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors text-right"
                      autoComplete="name"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Username Field */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-gray-700 font-medium">
                    اسم المستخدم
                  </Label>
                  <div className="relative">
                    <Shield className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="3 أحرف على الأقل"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pr-10 h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors text-right"
                      autoComplete="username"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium">
                    كلمة المرور
                  </Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="8 أحرف على الأقل"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10 h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors text-right"
                      autoComplete="new-password"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">
                    تأكيد كلمة المرور
                  </Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="أعد إدخال كلمة المرور"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pr-10 h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors text-right"
                      autoComplete="new-password"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاري إنشاء الحساب...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>إنشاء حساب</span>
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Links */}
        {!isSuccess && (
          <div className="mt-4 text-center space-y-2">
            <button
              onClick={() => router.push('/login')}
              className="text-white/70 hover:text-white text-sm underline underline-offset-4 transition-colors"
            >
              لديك حساب بالفعل؟ تسجيل الدخول
            </button>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-6 text-center space-y-3">
          <p className="text-white/80 text-sm font-medium">
            المهندس الاستشاري المدني: بشار السليمان
          </p>
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-4 py-1.5">
            <span className="text-white/60 text-xs">
              الكود العربي السوري نسخة 2024
            </span>
          </div>
        </div>

        {/* Bottom copyright */}
        <p className="text-center text-white/30 text-xs mt-6">
          © {new Date().getFullYear()} B.S Evaluation — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}
