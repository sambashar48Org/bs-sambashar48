/**
 * B.S Evaluation — Storage Constants
 * Re-exports shared constants from @/lib/constants and adds storage-specific ones.
 */

import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, IMAGE_LIMITS } from '@/lib/constants';

// Re-export image-related constants from the main constants module
export { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, IMAGE_LIMITS };

// ======== Supabase Storage Configuration ========

/** Default storage bucket name */
export const STORAGE_BUCKET = 'evaluation-images' as const;

/** Default folder path within the bucket */
export const STORAGE_FOLDER = 'uploads' as const;

/** Allowed storage buckets (whitelist for safety) */
export const ALLOWED_BUCKETS = [STORAGE_BUCKET] as const;

// ======== Upload Limits ========

/** Maximum number of files per batch upload */
export const MAX_BATCH_SIZE = 10;

/** Default JPEG compression quality (0.0–1.0) */
export const DEFAULT_COMPRESSION_QUALITY = 0.8;

/** Maximum dimension for auto-resize (px) */
export const MAX_IMAGE_DIMENSION = 1920;

/** Thumbnail dimension for previews (px) */
export const THUMBNAIL_DIMENSION = 300;

// ======== Cache Settings ========

/** localStorage key prefix for storage cache */
export const STORAGE_CACHE_PREFIX = 'bs-storage-cache-';

/** Time-to-live for cached upload entries (7 days in ms) */
export const STORAGE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

/** Maximum number of cache entries to keep */
export const STORAGE_CACHE_MAX_ENTRIES = 200;

// ======== MIME Type Helpers ========

/** Map of file extensions to MIME types */
export const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

/** Map of MIME types to file extensions (without dot) */
export const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

// ======== Arabic Error Messages ========

export const STORAGE_ERRORS_AR = {
  invalidFileType: 'نوع الملف غير مدعوم. يُرجى استخدام صور بصيغة JPEG أو PNG أو WebP أو GIF',
  fileTooLarge: 'حجم الملف يتجاوز الحد المسموح (1 ميغابايت)',
  tooManyFiles: 'عدد الصور يتجاوز الحد المسموح لهذا القسم',
  uploadFailed: 'فشل رفع الملف. يُرجى المحاولة مرة أخرى',
  deleteFailed: 'فشل حذف الملف. يُرجى المحاولة مرة أخرى',
  listFailed: 'فشل جلب قائمة الملفات',
  downloadFailed: 'فشل تحميل الملف',
  transformFailed: 'فشل معالجة الصورة',
  networkError: 'خطأ في الاتصال بالشبكة',
  bucketNotFound: 'حاوية التخزين غير موجودة',
  invalidPath: 'مسار الملف غير صالح',
  fileReadFailed: 'فشل قراءة الملف',
} as const;
