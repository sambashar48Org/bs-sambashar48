/**
 * Type declarations for Service Worker globals.
 * Extends the global self object with properties used by @serwist/next.
 */

interface ServiceWorkerGlobalScope {
  __SW_MANIFEST?: (import('@serwist/precaching').PrecacheEntry | string)[];
  skipWaiting: () => void;
  clients: {
    claim: () => Promise<void>;
  };
  addEventListener: (type: string, listener: (event: any) => void) => void;
}

declare const self: ServiceWorkerGlobalScope;
