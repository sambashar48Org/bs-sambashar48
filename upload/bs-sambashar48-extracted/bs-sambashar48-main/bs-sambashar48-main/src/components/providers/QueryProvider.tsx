'use client';

import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // لا تحاول الإعادة إذا كان الخطأ 401 (غير مصرح له)
        if (error?.status === 401) return false;
        return failureCount < 3;
      },
      staleTime: 1000 * 60 * 5, // 5 دقائق
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // --- كود التطهير القسري للـ Service Worker ---
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().then((success) => {
            if (success) console.log('Successfully unregistered Service Worker');
          });
        }
      });

      // مسح الكاش المخزن بواسطة الـ SW القديم
      if ('caches' in window) {
        caches.keys().then((names) => {
          for (const name of names) caches.delete(name);
        });
      }
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
