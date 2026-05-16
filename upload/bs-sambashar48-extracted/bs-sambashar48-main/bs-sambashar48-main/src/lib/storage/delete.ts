/**
 * B.S Evaluation — File Delete Utilities
 * Delete files from Supabase Storage.
 * Supports both direct Supabase deletion and API-based deletion.
 */

import { supabase } from '@/lib/supabase';
import { STORAGE_BUCKET, STORAGE_ERRORS_AR, ALLOWED_BUCKETS } from './constants';
import { removeCachedUploadByPath } from './cache';

/**
 * Delete a single file from Supabase Storage directly.
 *
 * @param path - The full storage path (e.g., 'uploads/crackPhotos/photo.jpg')
 * @throws Error if deletion fails
 */
export async function deleteFile(path: string): Promise<void> {
  if (!path) {
    throw new Error(STORAGE_ERRORS_AR.invalidPath);
  }

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([path]);

  if (error) {
    throw new Error(STORAGE_ERRORS_AR.deleteFailed);
  }

  // Remove from local cache
  removeCachedUploadByPath(path);
}

/**
 * Delete multiple files from Supabase Storage.
 *
 * @param paths - Array of storage paths to delete
 * @returns Object with deleted count and any errors
 */
export async function deleteMultipleFiles(
  paths: string[]
): Promise<{ deleted: number; errors: string[] }> {
  if (paths.length === 0) {
    return { deleted: 0, errors: [] };
  }

  const validPaths = paths.filter((p) => p && p.length > 0);
  if (validPaths.length === 0) {
    return { deleted: 0, errors: ['لا توجد مسارات صالحة للحذف'] };
  }

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove(validPaths);

  // Remove deleted files from local cache
  for (const path of validPaths) {
    removeCachedUploadByPath(path);
  }

  if (error) {
    return { deleted: 0, errors: [STORAGE_ERRORS_AR.deleteFailed] };
  }

  return {
    deleted: data?.length ?? 0,
    errors: [],
  };
}

/**
 * Delete a file via the API route (server-side deletion with auth).
 * Use this when you need server-side auth checks rather than direct client access.
 *
 * @param path - The storage path of the file to delete
 * @param bucket - The bucket name (default: 'evaluation-images')
 */
export async function deleteFileViaAPI(
  path: string,
  bucket: string = STORAGE_BUCKET
): Promise<boolean> {
  if (!path || !bucket) {
    throw new Error(STORAGE_ERRORS_AR.invalidPath);
  }

  if (!ALLOWED_BUCKETS.includes(bucket as typeof ALLOWED_BUCKETS[number])) {
    throw new Error('حاوية التخزين غير صالحة');
  }

  const res = await fetch('/api/storage', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucket, path }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || STORAGE_ERRORS_AR.deleteFailed);
  }

  // Remove from local cache
  removeCachedUploadByPath(path);

  return true;
}

/**
 * Delete all files in a specific section folder.
 *
 * @param section - The section folder name (e.g., 'crackPhotos')
 * @returns Number of files deleted
 */
export async function deleteSectionFiles(section: string): Promise<number> {
  // First, list all files in the section
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(`uploads/${section}`);

  if (error || !data || data.length === 0) {
    return 0;
  }

  const paths = data.map((file) => `uploads/${section}/${file.name}`);
  const result = await deleteMultipleFiles(paths);

  return result.deleted;
}
