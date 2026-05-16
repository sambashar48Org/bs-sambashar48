/**
 * B.S Evaluation — Storage Module Type Definitions
 * TypeScript interfaces for Supabase Storage operations
 */

/** Result of a successful file upload */
export interface UploadResult {
  url: string;
  path: string;
  name: string;
  size: number;
  contentType: string;
}

/** Result of a batch upload (multiple files) */
export interface BatchUploadResult {
  results: UploadResult[];
  errors: UploadError[];
}

/** Error detail for a failed upload */
export interface UploadError {
  file: string;
  message: string;
  code?: StorageErrorCode;
}

/** Storage-specific error codes */
export type StorageErrorCode =
  | 'INVALID_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'TOO_MANY_FILES'
  | 'BUCKET_NOT_FOUND'
  | 'UPLOAD_FAILED'
  | 'DELETE_FAILED'
  | 'LIST_FAILED'
  | 'DOWNLOAD_FAILED'
  | 'TRANSFORM_FAILED'
  | 'NETWORK_ERROR';

/** A single file entry returned from list operations */
export interface StorageFileEntry {
  name: string;
  path: string;
  url: string;
  size: number;
  contentType: string;
  createdAt: string;
}

/** Options for listing files */
export interface ListFilesOptions {
  bucket?: string;
  folder?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'name' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

/** Options for image transformation */
export interface ImageTransformOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 to 1.0
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
  maintainAspectRatio?: boolean;
}

/** Cached upload entry for deduplication */
export interface CachedUploadEntry {
  url: string;
  path: string;
  name: string;
  size: number;
  contentType: string;
  hash: string;
  cachedAt: number;
}

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** Upload progress callback type */
export type UploadProgressCallback = (progress: {
  loaded: number;
  total: number;
  percentage: number;
}) => void;
