/**
 * B.S Evaluation — Serwist Service Worker
 * ترحيل من sw.js يدوي إلى @serwist/next
 * يوفر precaching تلقائي + استراتيجيات تخزين متقدمة
 */

import type { PrecacheEntry, SerwistGlobalConfig } from '@serwist/precaching';
import { Serwist } from '@serwist/precaching';
import { CacheFirst, NetworkFirst, NetworkOnly } from '@serwist/strategies';
import { ExpirationPlugin } from '@serwist/strategies';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[];
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
});

// ═══════ استراتيجيات التخزين ═══════

// 1. API Routes → Network Only (لا تخزين مؤقت)
serwist.setRoute({
  match: ({ url }) => url.pathname.startsWith('/api/'),
  handler: new NetworkOnly({
    plugins: [
      {
        fetchDidFail: async () => {
          // عند فشل الشبكة — نُرجع استجابة offline افتراضية
        },
      },
    ],
  }),
});

// 2. Static Assets (صور، خطوط، CSS، JS) → Cache First
serwist.setRoute({
  match: ({ url }) => {
    const ext = url.pathname.split('.').pop() || '';
    return ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'ico', 'woff2', 'woff', 'css', 'js'].includes(ext);
  },
  handler: new CacheFirst({
    cacheName: 'bs-static-v5',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 يوم
      }),
    ],
  }),
});

// 3. HTML Pages → Network First مع fallback للكاش
serwist.setRoute({
  match: ({ url, request }) => {
    return request.destination === 'document' || url.pathname.endsWith('.html') || url.pathname === '/';
  },
  handler: new NetworkFirst({
    cacheName: 'bs-pages-v5',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 أيام
      }),
    ],
    networkTimeoutSeconds: 5,
  }),
});

// 4. Fonts → Cache First
serwist.setRoute({
  match: ({ url }) => url.pathname.includes('/fonts/'),
  handler: new CacheFirst({
    cacheName: 'bs-fonts-v5',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 365 * 24 * 60 * 60, // سنة
      }),
    ],
  }),
});

// 5. Manifest → Cache First (1 ساعة)
serwist.setRoute({
  match: ({ url }) => url.pathname === '/manifest.json',
  handler: new CacheFirst({
    cacheName: 'bs-manifest-v5',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 1,
        maxAgeSeconds: 60 * 60,
      }),
    ],
  }),
});

// ═══════ رسائل خاصة ═══════
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ═══════ معالجة Offline ═══════
self.addEventListener('fetch', (event) => {
  // لا نعترض طلبات API
  if (event.request.url.includes('/api/')) return;

  // للصفحات — نعرض صفحة offline عند عدم توفر الإنترنت
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/') || new Response(
          JSON.stringify({ error: 'لا يوجد اتصال بالإنترنت' }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
  }
});

serwist.addEventListeners();
