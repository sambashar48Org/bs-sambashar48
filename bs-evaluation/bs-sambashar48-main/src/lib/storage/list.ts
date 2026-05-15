/**
 * B.S Evaluation — File Listing Utilities
 * List files from a folder in Supabase Storage.
 * Supports both direct client listing and API-based listing.
 */

import { supabase } from '@/lib/supabase';
import { STORAGE_BUCKET, STORAGE_ERRORS_AR, ALLOWED_BUCKETS } from './constants';
import type { StorageFileEntry, ListFilesOptions } from './types';

/**
 * List files from a folder in Supabase Storage (direct client access).
 *
 * @param options - Listing options (folder, limit, offset, sortBy, sortOrder)
 * @returns Array of file entries
 */
export async function listFiles(
  options: ListFilesOptions = {}
): Promise<StorageFileEntry[]> {
  const {
    bucket = STORAGE_BUCKET,
    folder = 'uploads',
    limit = 20,
    offset = 0,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = options;

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder, {
      limit,
      offset,
      sortBy: { column: sortBy, order: sortOrder },
    });

  if (error) {
    throw new Error(STORAGE_ERRORS_AR.listFailed);
  }

  if (!data) {
    return [];
  }

  return data.map((file) => {
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(`${folder}/${file.name}`);

    return {
      name: file.name,
      path: `${folder}/${file.name}`,
      url: urlData.publicUrl,
      size: file.metadata?.size ?? 0,
      contentType: file.metadata?.mimetype ?? '',
      createdAt: file.created_at ?? '',
    };
  });
}

/**
 * List files from a specific section folder.
 *
 * @param section - Section name (e.g., 'crackPhotos', 'sitePhotos')
 * @param limit - Maximum files to return
 * @returns Array of file entries
 */
export async function listSectionFiles(
  section: string,
  limit: number = 20
): Promise<StorageFileEntry[]> {
  return listFiles({
    folder: `uploads/${section}`,
    limit,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });
}

/**
 * Count the number of files in a section folder.
 *
 * @param section - Section name
 * @returns Number of files
 */
export async function countSectionFiles(section: string): Promise<number> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(`uploads/${section}`, {
      limit: 1000,
    });

  if (error) return 0;
  return data?.length ?? 0;
}

/**
 * List all files from a folder, handling pagination automatically.
 * Returns all files (up to 1000).
 *
 * @param folder - The folder path within the bucket
 * @returns Array of all file entries
 */
export async function listAllFiles(folder: string = 'uploads'): Promise<StorageFileEntry[]> {
  const allFiles: StorageFileEntry[] = [];
  let offset = 0;
  const pageSize = 100;

  // Fetch pages until no more files are returned
  while (true) {
    const page = await listFiles({
      folder,
      limit: pageSize,
      offset,
      sortBy: 'created_at',
      sortOrder: 'desc',
    });

    allFiles.push(...page);

    if (page.length < pageSize) break;
    offset += pageSize;

    // Safety limit
    if (offset >= 1000) break;
  }

  return allFiles;
}

/**
 * List files via the API route (server-side with auth).
 * Use this when you need server-side auth checks.
 *
 * @param options - Listing options
 * @returns Object with files array and pagination info
 */
export async function listFilesViaAPI(
  options: ListFilesOptions = {}
): Promise<{ files: StorageFileEntry[]; bucket: string; folder: string }> {
  const {
    bucket = STORAGE_BUCKET,
    folder = 'uploads',
    limit = 20,
    offset = 0,
  } = options;

  if (!ALLOWED_BUCKETS.includes(bucket as typeof ALLOWED_BUCKETS[number])) {
    throw new Error('حاوية التخزين غير صالحة');
  }

  const params = new URLSearchParams({
    bucket,
    folder,
    limit: String(limit),
    offset: String(offset),
  });

  const res = await fetch(`/api/storage?${params}`);

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || STORAGE_ERRORS_AR.listFailed);
  }

  const data = await res.json();
  return data;
}
