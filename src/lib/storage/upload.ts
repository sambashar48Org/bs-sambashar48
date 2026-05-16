/**
 * B.S Evaluation — Image Upload Functions
 * Upload single or multiple images to Supabase Storage.
 * Client-side compatible — uses the browser Supabase client.
 */

import { supabase } from '@/lib/supabase';
import { STORAGE_BUCKET, STORAGE_FOLDER, MAX_BATCH_SIZE, STORAGE_ERRORS_AR, DEFAULT_COMPRESSION_QUALITY, MAX_IMAGE_DIMENSION } from './constants';
import { validateFile, validateFilesForUpload, sanitizeFileName } from './validate';
import { transformImage, fileToDataURL } from './transform';
import { fileHash, getCachedUpload, setCachedUpload } from './cache';
import type { UploadResult, BatchUploadResult, UploadError, UploadProgressCallback, StorageErrorCode } from './types';

/**
 * Generate a unique storage path for a file.
 * Format: uploads/{section}/{timestamp}_{sanitizedName}
 */
function buildStoragePath(section: string, fileName: string): string {
  const sanitized = sanitizeFileName(fileName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 6);
  return `${STORAGE_FOLDER}/${section}/${timestamp}_${random}_${sanitized}`;
}

/**
 * Upload a single image file to Supabase Storage.
 *
 * Workflow:
 * 1. Validate the file (type, size)
 * 2. Check cache for duplicates
 * 3. Transform (resize/compress) if needed
 * 4. Upload to Supabase Storage
 * 5. Cache the result
 *
 * @param file - The File object to upload
 * @param section - The evaluation section (e.g., 'crackPhotos', 'sitePhotos')
 * @param options - Optional configuration
 * @returns UploadResult with URL, path, name, size, contentType
 */
export async function uploadImage(
  file: File,
  section: string = 'general',
  options: {
    transform?: boolean;
    maxDimension?: number;
    quality?: number;
    onProgress?: UploadProgressCallback;
  } = {}
): Promise<UploadResult> {
  const {
    transform = true,
    maxDimension = MAX_IMAGE_DIMENSION,
    quality = DEFAULT_COMPRESSION_QUALITY,
  } = options;

  // Step 1: Validate
  const validation = validateFile(file);
  if (!validation.valid) {
    const error = new Error(validation.errors.join('. ')) as Error & { code: StorageErrorCode };
    error.code = 'UPLOAD_FAILED';
    throw error;
  }

  // Step 2: Check cache
  const hash = await fileHash(file);
  const cached = getCachedUpload(hash);
  if (cached) {
    return {
      url: cached.url,
      path: cached.path,
      name: cached.name,
      size: cached.size,
      contentType: cached.contentType,
    };
  }

  // Step 3: Transform (resize/compress) if enabled
  let fileToUpload: File = file;
  if (transform) {
    try {
      fileToUpload = await transformImage(file, {
        maxWidth: maxDimension,
        maxHeight: maxDimension,
        quality,
        format: 'image/jpeg',
      });
    } catch {
      // If transform fails, try uploading the original
      fileToUpload = file;
    }
  }

  // Step 4: Build path and upload
  const path = buildStoragePath(section, fileToUpload.name);
  const fileBuffer = await fileToUpload.arrayBuffer();

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, fileBuffer, {
      contentType: fileToUpload.type,
      cacheControl: '31536000', // 1 year
      upsert: false,
    });

  if (error) {
    // If bucket doesn't exist, fall back to data URL
    if (error.message?.includes('bucket') || error.message?.includes('not found')) {
      const dataUrl = await fileToDataURL(file);
      return {
        url: dataUrl,
        path: '',
        name: fileToUpload.name,
        size: fileToUpload.size,
        contentType: fileToUpload.type,
      };
    }

    const uploadError = new Error(STORAGE_ERRORS_AR.uploadFailed) as Error & { code: StorageErrorCode };
    uploadError.code = 'UPLOAD_FAILED';
    uploadError.cause = error;
    throw uploadError;
  }

  // Step 5: Build public URL
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(data.path);

  const result: UploadResult = {
    url: urlData.publicUrl,
    path: data.path,
    name: fileToUpload.name,
    size: fileToUpload.size,
    contentType: fileToUpload.type,
  };

  // Step 6: Cache the result
  setCachedUpload(hash, {
    url: result.url,
    path: result.path,
    name: result.name,
    size: result.size,
    contentType: result.contentType,
  });

  return result;
}

/**
 * Upload multiple image files to Supabase Storage.
 *
 * Processes files sequentially (not in parallel) to avoid overwhelming
 * the network and to provide per-file error reporting.
 *
 * @param files - Array of File objects
 * @param section - The evaluation section key
 * @param currentCount - Current number of images in this section (for limit checking)
 * @param options - Optional configuration
 * @returns BatchUploadResult with successful results and per-file errors
 */
export async function uploadMultipleImages(
  files: File[],
  section: string = 'general',
  currentCount: number = 0,
  options: {
    transform?: boolean;
    maxDimension?: number;
    quality?: number;
  } = {}
): Promise<BatchUploadResult> {
  const { transform = true, maxDimension, quality } = options;

  // Limit batch size
  const filesToProcess = files.slice(0, MAX_BATCH_SIZE);

  // Validate all files
  const validation = validateFilesForUpload(filesToProcess, section, currentCount);
  if (!validation.valid) {
    // Return all errors but still try to upload valid files
    if (validation.errors.some((e) => e.includes('عدد الصور'))) {
      // Section limit exceeded — can't proceed
      return {
        results: [],
        errors: filesToProcess.map((f) => ({
          file: f.name,
          message: validation.errors[0],
          code: 'TOO_MANY_FILES' as StorageErrorCode,
        })),
      };
    }
  }

  const results: UploadResult[] = [];
  const errors: UploadError[] = [];

  for (const file of filesToProcess) {
    try {
      const result = await uploadImage(file, section, {
        transform,
        maxDimension,
        quality,
      });
      results.push(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : STORAGE_ERRORS_AR.uploadFailed;
      errors.push({
        file: file.name,
        message,
        code: (err as Error & { code?: StorageErrorCode }).code,
      });
    }
  }

  return { results, errors };
}

/**
 * Upload an image as a data URL fallback (when Supabase is unavailable).
 */
export async function uploadAsDataURL(file: File): Promise<UploadResult> {
  const url = await fileToDataURL(file);
  return {
    url,
    path: '',
    name: file.name,
    size: file.size,
    contentType: file.type,
  };
}
