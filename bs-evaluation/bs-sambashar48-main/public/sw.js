/**
 * B.S Evaluation — Service Worker v4
 * Offline-First PWA Support
 * - Static assets: Cache First
 * - App pages: Network First, Cache Fallback
 * - API requests: Network Only (except health check)
 * - Never caches auth/session data
 */

const STATIC_CACHE = 'bs-static-v4';
const PAGES_CACHE = 'bs-pages-v4';

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/logo.svg',
  '/logo.png',
  '/logo-circle.png',
  '/logo-header.png',
  '/favicon.ico',
  '/apple-touch-icon.png',
];

// Install: pre-cache essential static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== PAGES_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: routing strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // NEVER cache API requests — always go to network
  // This prevents stale auth data and 401 loops
  if (url.pathname.startsWith('/api/')) {
    // For API requests, just try network — no caching
    event.respondWith(
      fetch(request).catch(() => {
        // Return a minimal offline response for API failures
        return new Response(
          JSON.stringify({ error: 'لا يوجد اتصال بالإنترنت', offline: true }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
    return;
  }

  // Static assets (icons, images, fonts, CSS, JS): Cache First
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(() => {
            // Static asset not available offline — return empty
            return new Response('', { status: 404 });
          });
        });
      })
    );
    return;
  }

  // HTML pages: Network First with cache fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(PAGES_CACHE).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline: try cache first, then fallback
          return caches.open(PAGES_CACHE).then((cache) => {
            return cache.match(request).then((cached) => {
              if (cached) return cached;
              // If the root page is cached, use it as fallback for any navigation
              return cache.match('/').then((rootCached) => {
                if (rootCached) return rootCached;
                return new Response(
                  `<!DOCTYPE html>
                  <html lang="ar" dir="rtl">
                  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
                  <title>B.S Evaluation — غير متصل</title>
                  <style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#ecfdf5;color:#065f46;text-align:center;padding:2rem}
                  .container{max-width:400px}h1{font-size:1.5rem;margin-bottom:0.5rem}p{font-size:0.9rem;opacity:0.8}
                  .icon{font-size:3rem;margin-bottom:1rem}</style></head>
                  <body><div class="container"><div class="icon">&#x1F4F1;</div>
                  <h1>غير متصل بالإنترنت</h1>
                  <p>B.S Evaluation يعمل بدون اتصال. بياناتك محفوظة محلياً وسيم مزامنتها عند توفر الإنترنت.</p>
                  <p><button onclick="location.reload()" style="margin-top:1rem;padding:0.5rem 1.5rem;background:#059669;color:white;border:none;border-radius:8px;cursor:pointer;font-size:1rem">إعادة المحاولة</button></p>
                  </div></body></html>`,
                  { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
                );
              });
            });
          });
        })
    );
    return;
  }
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
