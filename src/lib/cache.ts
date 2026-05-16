'use client';

/**
 * Cache utility for B.S Evaluation
 * Provides centralized cache management with version-based invalidation
 */

const CACHE_VERSION = 1;
const CACHE_PREFIX = 'bs-cache-v';

/**
 * Clear all B.S Evaluation cache entries from localStorage
 * Call this on version changes, logout, or forced refresh
 */
export function clearAllCache(): void {
  if (typeof window === 'undefined') return;

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('bs-auth') ||
      key.startsWith('bs-evaluation-settings') ||
      key.startsWith('bs-device-id') ||
      key.startsWith(CACHE_PREFIX)
    )) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));

  // Clear any old version cache
  localStorage.removeItem('bs-device-id');
}

/**
 * Validate cache version and clear if outdated
 */
export function validateCacheVersion(): void {
  if (typeof window === 'undefined') return;

  const storedVersion = localStorage.getItem(`${CACHE_PREFIX}version`);
  const currentVersion = String(CACHE_VERSION);

  if (storedVersion !== currentVersion) {
    // Version mismatch - clear all cache and set new version
    clearAllCache();
    localStorage.setItem(`${CACHE_PREFIX}version`, currentVersion);
  }
}

/**
 * Store data with cache metadata
 */
export function setCacheData<T>(key: string, data: T, ttl?: number): void {
  if (typeof window === 'undefined') return;

  const entry = {
    data,
    timestamp: Date.now(),
    ttl: ttl || 0,
  };

  localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
}

/**
 * Get cached data if still valid
 */
export function getCacheData<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
  if (!raw) return null;

  try {
    const entry = JSON.parse(raw);

    // Check TTL if set
    if (entry.ttl > 0) {
      const age = Date.now() - entry.timestamp;
      if (age > entry.ttl) {
        localStorage.removeItem(`${CACHE_PREFIX}${key}`);
        return null;
      }
    }

    return entry.data as T;
  } catch {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    return null;
  }
}

/**
 * Remove specific cache entry
 */
export function removeCacheData(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${CACHE_PREFIX}${key}`);
}
