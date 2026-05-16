/**
 * B.S Evaluation — File Download / Signed URL Utilities
 * Get public or signed URLs for files stored in Supabase Storage.
 */

import { supabase } from '@/lib/supabase';
import { STORAGE_BUCKET, STORAGE_ERRORS_AR } from './constants';
import type { StorageFileEntry } from './types';

/**
 * Get the public URL for a file in Supabase Storage.
 *
 * @param path - The full path within the bucket (e.g., 'uploads/crackPhotos/photo.jpg')
 * @returns The public URL string
 */
export function getPublicUrl(path: string): string {
  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Get a signed URL for a file (time-limited access for private files).
 *
 * @param path - The full path within the bucket
 * @param expiresIn - Seconds until the URL expires (default: 3600 = 1 hour)
 * @returns Signed URL string
 */
export async function getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(STORAGE_ERRORS_AR.downloadFailed);
  }

  if (!data) {
    throw new Error(STORAGE_ERRORS_AR.downloadFailed);
  }

  return data.signedUrl;
}

/**
 * Get signed URLs for multiple files at once.
 *
 * @param paths - Array of storage paths
 * @param expiresIn - Seconds until URLs expire
 * @returns Array of signed URLs in the same order as input paths
 */
export async function getMultipleSignedUrls(
  paths: string[],
  expiresIn: number = 3600
): Promise<string[]> {
  const urls: string[] = [];

  for (const path of paths) {
    try {
      const url = await getSignedUrl(path, expiresIn);
      urls.push(url);
    } catch {
      // Try public URL as fallback
      urls.push(getPublicUrl(path));
    }
  }

  return urls;
}

/**
 * Download a file as a Blob from Supabase Storage.
 *
 * @param path - The full path within the bucket
 * @returns Blob of the file contents
 */
export async function downloadFile(path: string): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(path);

  if (error) {
    throw new Error(STORAGE_ERRORS_AR.downloadFailed);
  }

  if (!data) {
    throw new Error(STORAGE_ERRORS_AR.downloadFailed);
  }

  return data;
}

/**
 * Download a file and convert it to a data URL.
 * Useful for displaying images without network requests.
 */
export async function downloadAsDataURL(path: string): Promise<string> {
  const blob = await downloadFile(path);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(STORAGE_ERRORS_AR.downloadFailed));
    reader.readAsDataURL(blob);
  });
}

/**
 * Build a full file entry with URL from a storage path.
 */
export function buildFileEntry(path: string, name: string, size: number = 0): StorageFileEntry {
  return {
    name,
    path,
    url: getPublicUrl(path),
    size,
    contentType: '',
    createdAt: '',
  };
}
