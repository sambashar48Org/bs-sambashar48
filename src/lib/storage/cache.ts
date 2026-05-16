/**
 * B.S Evaluation — Storage URL Cache
 * Local cache for uploaded file URLs to avoid re-uploads.
 * Uses localStorage with TTL-based expiration.
 */

import {
  STORAGE_CACHE_PREFIX,
  STORAGE_CACHE_TTL,
  STORAGE_CACHE_MAX_ENTRIES,
} from './constants';
import type { CachedUploadEntry } from './types';

/**
 * Generate a simple hash from a File object for deduplication.
 * Uses size + name + lastModified as a lightweight fingerprint.
 */
export async function fileHash(file: File): Promise<string> {
  // For small files, read full content; for large ones, use metadata only
  if (file.size < 512 * 1024) {
    // Files < 512KB: use content-based hash
    try {
      const buffer = await file.slice(0, 8192).arrayBuffer();
      const view = new Uint8Array(buffer);
      let hash = file.size;
      for (let i = 0; i < view.length; i++) {
        hash = ((hash << 5) - hash + view[i]) | 0;
      }
      return Math.abs(hash).toString(36);
    } catch {
      // Fall through to metadata hash
    }
  }

  // Fallback: metadata-based hash (name + size + lastModified)
  const metadata = `${file.name}-${file.size}-${file.lastModified}`;
  let hash = 0;
  for (let i = 0; i < metadata.length; i++) {
    hash = ((hash << 5) - hash + metadata.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Look up a cached upload entry by file hash.
 */
export function getCachedUpload(hash: string): CachedUploadEntry | null {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(`${STORAGE_CACHE_PREFIX}${hash}`);
  if (!raw) return null;

  try {
    const entry: CachedUploadEntry = JSON.parse(raw);

    // Check TTL
    if (Date.now() - entry.cachedAt > STORAGE_CACHE_TTL) {
      removeCachedUpload(hash);
      return null;
    }

    return entry;
  } catch {
    localStorage.removeItem(`${STORAGE_CACHE_PREFIX}${hash}`);
    return null;
  }
}

/**
 * Store an upload result in the cache.
 */
export function setCachedUpload(hash: string, entry: Omit<CachedUploadEntry, 'hash' | 'cachedAt'>): void {
  if (typeof window === 'undefined') return;

  const fullEntry: CachedUploadEntry = {
    ...entry,
    hash,
    cachedAt: Date.now(),
  };

  try {
    localStorage.setItem(`${STORAGE_CACHE_PREFIX}${hash}`, JSON.stringify(fullEntry));
    evictOldEntries();
  } catch {
    // localStorage quota exceeded — evict older entries and retry
    evictOldEntries(true);
    try {
      localStorage.setItem(`${STORAGE_CACHE_PREFIX}${hash}`, JSON.stringify(fullEntry));
    } catch {
      // Give up silently — cache is a nice-to-have
    }
  }
}

/**
 * Remove a specific cache entry.
 */
export function removeCachedUpload(hash: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${STORAGE_CACHE_PREFIX}${hash}`);
}

/**
 * Remove a cached upload by its storage path (used after deletion).
 */
export function removeCachedUploadByPath(path: string): void {
  if (typeof window === 'undefined') return;

  const entries = getAllCachedUploads();
  for (const entry of entries) {
    if (entry.path === path) {
      removeCachedUpload(entry.hash);
      break;
    }
  }
}

/**
 * Get all cached upload entries.
 */
export function getAllCachedUploads(): CachedUploadEntry[] {
  if (typeof window === 'undefined') return [];

  const entries: CachedUploadEntry[] = [];
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(STORAGE_CACHE_PREFIX)) continue;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const entry: CachedUploadEntry = JSON.parse(raw);

      // Check TTL
      if (Date.now() - entry.cachedAt > STORAGE_CACHE_TTL) {
        keysToRemove.push(key);
        continue;
      }

      entries.push(entry);
    } catch {
      keysToRemove.push(key);
    }
  }

  // Clean up expired/invalid entries
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }

  return entries;
}

/**
 * Clear all storage cache entries.
 */
export function clearStorageCache(): void {
  if (typeof window === 'undefined') return;

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}

/**
 * Evict oldest cache entries when we exceed the maximum.
 * @param aggressive — if true, evict half the entries instead of just the excess.
 */
function evictOldEntries(aggressive: boolean = false): void {
  const entries = getAllCachedUploads();

  if (entries.length <= STORAGE_CACHE_MAX_ENTRIES) return;

  // Sort by cachedAt (oldest first)
  entries.sort((a, b) => a.cachedAt - b.cachedAt);

  const toRemove = aggressive
    ? Math.floor(entries.length / 2)
    : entries.length - STORAGE_CACHE_MAX_ENTRIES;

  for (let i = 0; i < toRemove; i++) {
    removeCachedUpload(entries[i].hash);
  }
}
