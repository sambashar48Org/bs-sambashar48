'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Info } from 'lucide-react';
import Image from 'next/image';

export default function AboutPanel() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      {/* App Identity Card */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 p-8 text-center text-white">
          {/* App Logo/Icon */}
          <div className="mx-auto mb-5 w-28 h-28">
            <Image
              src="/logo-circle.png"
              alt="B.S Evaluation"
              width={112}
              height={112}
              className="rounded-2xl shadow-lg"
              priority
            />
          </div>

          {/* App Name */}
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            B.S Evaluation
          </h1>

          {/* Subtitle */}
          <p className="text-emerald-100 text-base leading-relaxed max-w-lg mx-auto">
            تقييم فني للوضع الراهن للمباني الخرسانية المسلحة
          </p>
        </div>

        <CardContent className="p-6 space-y-5">
          {/* Version & Code Reference */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-full border border-emerald-200 dark:border-emerald-800">
              <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium text-emerald-700 dark:text-emerald-400">
                الإصدار 1.0
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 dark:bg-teal-900/20 rounded-full border border-teal-200 dark:border-teal-800">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-teal-600 dark:text-teal-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
              </svg>
              <span className="font-medium text-teal-700 dark:text-teal-400">
                الكود العربي السوري نسخة 2024
              </span>
            </div>
          </div>

          <Separator className="my-2" />

          {/* Developer Section */}
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground mb-1">المطور</p>
            <p className="text-base text-emerald-700 dark:text-emerald-400 font-medium">
              المهندس الاستشاري المدني: بشار السليمان
            </p>
          </div>

          <Separator className="my-2" />

          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-semibold text-foreground text-center mb-4">
              معلومات التواصل
            </h3>
            <div className="space-y-3">
              {/* Mobile */}
              <a
                href="tel:00963944653699"
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-lg shrink-0">
                  📱
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">موبايل</p>
                  <p className="text-sm font-medium text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" dir="ltr">
                    00963944653699
                  </p>
                </div>
              </a>

              {/* WhatsApp */}
              <a
                href="https://wa.me/963944653699"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-lg shrink-0">
                  💬
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">واتساب</p>
                  <p className="text-sm font-medium text-foreground group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" dir="ltr">
                    00963944653699
                  </p>
                </div>
              </a>

              {/* Email */}
              <a
                href="mailto:basharsam76@gmail.com"
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-lg shrink-0">
                  📧
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">بريد إلكتروني</p>
                  <p className="text-sm font-medium text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" dir="ltr">
                    basharsam76@gmail.com
                  </p>
                </div>
              </a>

              {/* Facebook */}
              <a
                href="https://www.facebook.com/Eng.basharalsulieman"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-lg shrink-0">
                  📘
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">فيسبوك</p>
                  <p className="text-sm font-medium text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate" dir="ltr">
                    facebook.com/Eng.basharalsulieman
                  </p>
                </div>
              </a>
            </div>
          </div>

          <Separator className="my-2" />

          {/* Technology Stack */}
          <div className="text-center">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              التقنيات المستخدمة
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                { name: 'Next.js', color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700' },
                { name: 'TypeScript', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
                { name: 'Tailwind CSS', color: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800' },
                { name: 'Supabase', color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
                { name: 'PWA', color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
              ].map((tech) => (
                <span
                  key={tech.name}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium ${tech.color}`}
                >
                  {tech.name}
                </span>
              ))}
            </div>
          </div>

          <Separator className="my-2" />

          {/* Copyright */}
          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              © {currentYear} B.S Evaluation
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              جميع الحقوق محفوظة للمهندس بشار السليمان
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
