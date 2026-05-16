'use client';

import { useEffect } from 'react';

/**
 * تسجيل Service Worker — @serwist/next
 * يُسجّل SW تلقائياً ويفحص عن تحديثات كل ساعة
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        // فحص التحديثات كل ساعة
        const interval = setInterval(() => {
          registration.update().catch(() => {
            // صامت — فشل التحديث ليس حرجاً
          });
        }, 60 * 60 * 1000);

        // عند توفر تحديث
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              // التحديث جاهز — يمكن إظهار إشعار للمستخدم
              console.log('[SW] تحديث جديد مُفعّل');
            }
          });
        });

        // تنظيف عند إلغاء التثبيت
        return () => clearInterval(interval);
      } catch (error) {
        console.warn('[SW] فشل تسجيل Service Worker:', error);
      }
    };

    registerSW();
  }, []);

  return null;
}
