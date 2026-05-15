'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register the static service worker file
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[B.S] Service Worker registered:', registration.scope);

          // Check for updates periodically
          setInterval(() => {
            registration.update().catch(() => {
              // Update check failed — non-critical
            });
          }, 60 * 60 * 1000); // Every hour
        })
        .catch((error) => {
          console.warn('[B.S] Service Worker registration failed:', error);
        });
    }
  }, []);

  return null;
}
