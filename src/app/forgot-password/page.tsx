'use client';

import { useRouter } from 'next/navigation';
import { Building2, Shield, ArrowRight, Info, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function ForgotPasswordPage() {
  const router = useRouter();

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #059669 0%, #0d9488 40%, #0f766e 70%, #115e59 100%)',
      }}
    >
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
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
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg mb-4">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            B.S Evaluation
          </h1>
          <p className="text-white/70 text-sm mt-2">
            استعادة كلمة المرور
          </p>
        </div>

        {/* Card */}
        <Card className="bg-white/95 backdrop-blur-md border-white/60 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl font-bold text-gray-800 flex items-center justify-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
              نسيت كلمة المرور؟
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-2">
            <div className="text-center space-y-5 py-4">
              {/* Info Icon */}
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100">
                <Info className="w-8 h-8 text-blue-600" />
              </div>

              {/* Instructions */}
              <div className="space-y-3 text-right">
                <p className="text-gray-600 text-sm leading-relaxed">
                  لضمان أمان حسابك، لا يمكن إعادة تعيين كلمة المرور مباشرة من هنا.
                </p>
                <p className="text-gray-700 text-sm leading-relaxed font-medium">
                  يرجى التواصل مع مسؤول النظام لإنشاء كلمة مرور جديدة لك.
                </p>

                {/* Steps */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 mt-4">
                  <h4 className="text-gray-800 font-semibold text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    الخطوات:
                  </h4>
                  <ol className="text-gray-600 text-xs space-y-2 list-decimal list-inside">
                    <li>تواصل مع مسؤول النظام (المشرف)</li>
                    <li>قم بتقديم اسم المستخدم الخاص بك</li>
                    <li>سيقوم المسؤول بتعيين كلمة مرور جديدة لحسابك</li>
                    <li>سجل الدخول بكلمة المرور الجديدة</li>
                  </ol>
                </div>
              </div>

              {/* Back to login button */}
              <Button
                onClick={() => router.push('/login')}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <ArrowRight className="w-4 h-4 me-2" />
                العودة لتسجيل الدخول
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-white/30 text-xs">
            © {new Date().getFullYear()} B.S Evaluation
          </p>
        </div>
      </div>
    </div>
  );
}
