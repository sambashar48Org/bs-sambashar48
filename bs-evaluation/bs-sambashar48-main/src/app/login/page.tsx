'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Shield, Lock, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuthStore } from '@/stores';

// Cache-busting version — increment when deploying a new build
// This forces the browser to bypass any cached Service Worker or stale JS files
const BUILD_VERSION = '20260508-v5';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

        // 3. Clear stale Zustand auth store from localStorage
        // (prevents hydration of corrupted auth state from old sessions)
        const staleAuth = localStorage.getItem('bs-auth');
        if (staleAuth) {
          try {
            const parsed = JSON.parse(staleAuth);
            // If the stored version doesn't match, wipe it
            if (parsed?.version !== 1) {
              localStorage.removeItem('bs-auth');
            }
          } catch {
            localStorage.removeItem('bs-auth');
          }
        }
      } catch {
        // Silent fail — cleanup is best-effort
      }
    };

    cleanup();
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (!username.trim() || !password.trim()) {
        setError('يرجى إدخال اسم المستخدم وكلمة المرور');
        return;
      }

      setIsLoading(true);

      try {
        // Add cache-busting timestamp to prevent any proxy/SW from serving cached response
        const loginUrl = `/api/auth/login?_t=${Date.now()}`;
        const res = await fetch(loginUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
          credentials: 'include', // Explicitly include cookies
          body: JSON.stringify({
            username: username.trim(),
            password,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'حدث خطأ أثناء تسجيل الدخول');
          return;
        }

        // Store auth in Zustand (persists to localStorage)
        setAuth({
          id: data.user.id,
          username: data.user.username,
          fullName: data.user.fullName,
          role: data.user.role,
        });

        // Full page reload with cache-busting to ensure:
        // 1. The new bs-session cookie is sent with all requests
        // 2. No stale JS bundles are loaded from cache
        // 3. The middleware sees the fresh cookie
        window.location.href = `/?_v=${BUILD_VERSION}`;
      } catch (err) {
        setError('تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.');
      } finally {
        setIsLoading(false);
      }
    },
    [username, password, setAuth, router]
  );

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

        {/* Login Card */}
        <Card className="bg-white/95 backdrop-blur-md border-white/60 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl font-bold text-gray-800 flex items-center justify-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              تسجيل الدخول
            </CardTitle>
            <CardDescription className="text-gray-500 text-sm">
              أدخل بيانات الاعتماد للوصول إلى النظام
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            {/* Error Messages */}
            {error && (
              <div className="mb-4 p-3 rounded-lg border text-sm flex items-start gap-3 bg-red-50 border-red-200 text-red-800">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                <div>
                  <p className="font-medium">خطأ في تسجيل الدخول</p>
                  <p className="mt-0.5 opacity-80">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
                    placeholder="أدخل اسم المستخدم"
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
                    placeholder="أدخل كلمة المرور"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors text-right"
                    autoComplete="current-password"
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
                    <span>جاري تسجيل الدخول...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>تسجيل الدخول</span>
                  </>
                )}
              </Button>

              {/* Action Links */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => router.push('/register')}
                  className="text-emerald-600 hover:text-emerald-700 text-sm font-medium underline underline-offset-4 transition-colors"
                >
                  إنشاء حساب جديد
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/forgot-password')}
                  className="text-gray-500 hover:text-gray-700 text-sm underline underline-offset-4 transition-colors"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

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
