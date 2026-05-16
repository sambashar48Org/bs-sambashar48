/**
 * B.S Evaluation — File Validation Utilities
 * Validates files before upload: type, size, and per-section count limits.
 */

import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, IMAGE_LIMITS, STORAGE_ERRORS_AR } from './constants';
import type { ValidationResult, StorageErrorCode } from './types';

/**
 * Validate that a file is an allowed image type.
 */
export function isValidImageType(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.includes(file.type);
}

/**
 * Validate that a file does not exceed the maximum size.
 */
export function isValidFileSize(file: File): boolean {
  return file.size <= MAX_IMAGE_SIZE;
}

/**
 * Get the maximum allowed image count for a section key.
 * Falls back to 2 if the section is not recognized.
 */
export function getImageLimit(section: string): number {
  return IMAGE_LIMITS[section as keyof typeof IMAGE_LIMITS] ?? 2;
}

/**
 * Validate the image count for a given section.
 */
export function isValidImageCount(section: string, currentCount: number, newCount: number = 0): boolean {
  const limit = getImageLimit(section);
  return (currentCount + newCount) <= limit;
}

/**
 * Validate a single file for upload.
 * Returns a detailed validation result with errors and warnings.
 */
export function validateFile(file: File): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file type
  if (!isValidImageType(file)) {
    errors.push(STORAGE_ERRORS_AR.invalidFileType);
  }

  // Check file size
  if (!isValidFileSize(file)) {
    errors.push(STORAGE_ERRORS_AR.fileTooLarge);
  }

  // Warn about very small files (likely not useful images)
  if (file.size > 0 && file.size < 10 * 1024) {
    warnings.push('حجم الملف صغير جداً — قد لا يكون صورة صالحة');
  }

  // Warn about empty files
  if (file.size === 0) {
    errors.push('الملف فارغ');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate multiple files for batch upload.
 * Checks each file individually and also checks the total count for the section.
 */
export function validateFilesForUpload(
  files: File[],
  section: string,
  currentCount: number = 0
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check total count
  if (!isValidImageCount(section, currentCount, files.length)) {
    const limit = getImageLimit(section);
    errors.push(`${STORAGE_ERRORS_AR.tooManyFiles} (${limit})`);
  }

  // Validate each file
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const result = validateFile(file);
    for (const error of result.errors) {
      errors.push(`${file.name}: ${error}`);
    }
    for (const warning of result.warnings) {
      warnings.push(`${file.name}: ${warning}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get a storage error code from a file validation failure.
 */
export function getValidationErrorCode(file: File): StorageErrorCode | null {
  if (!isValidImageType(file)) return 'INVALID_FILE_TYPE';
  if (!isValidFileSize(file)) return 'FILE_TOO_LARGE';
  if (file.size === 0) return 'UPLOAD_FAILED';
  return null;
}

/**
 * Sanitize a file name for storage: remove special characters, ensure valid extension.
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path separators and special characters
  let sanitized = fileName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');

  // Ensure the file has a valid extension
  const lastDot = sanitized.lastIndexOf('.');
  if (lastDot === -1 || lastDot === sanitized.length - 1) {
    // No extension or trailing dot — append .jpg
    sanitized += '.jpg';
  }

  // Truncate very long names (keep extension)
  if (sanitized.length > 100) {
    const ext = sanitized.slice(sanitized.lastIndexOf('.'));
    sanitized = sanitized.slice(0, 100 - ext.length) + ext;
  }

  return sanitized;
}
