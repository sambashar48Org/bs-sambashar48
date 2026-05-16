/**
 * B.S Evaluation — Image Transformation Utilities
 * Client-side image resizing, compression, and format conversion using Canvas API.
 */

import { DEFAULT_COMPRESSION_QUALITY, MAX_IMAGE_DIMENSION, THUMBNAIL_DIMENSION, STORAGE_ERRORS_AR } from './constants';
import type { ImageTransformOptions } from './types';

/**
 * Load an image from a File object into an HTMLImageElement.
 */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(STORAGE_ERRORS_AR.transformFailed));
    };

    img.src = url;
  });
}

/**
 * Load an image from a data URL string.
 */
function loadImageFromDataURL(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(STORAGE_ERRORS_AR.transformFailed));
    img.src = dataUrl;
  });
}

/**
 * Calculate target dimensions while maintaining aspect ratio.
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth?: number,
  maxHeight?: number
): { width: number; height: number } {
  if (!maxWidth && !maxHeight) {
    return { width: originalWidth, height: originalHeight };
  }

  const targetMaxW = maxWidth || Infinity;
  const targetMaxH = maxHeight || Infinity;

  let width = originalWidth;
  let height = originalHeight;

  if (width > targetMaxW) {
    height = Math.round((height * targetMaxW) / width);
    width = targetMaxW;
  }

  if (height > targetMaxH) {
    width = Math.round((width * targetMaxH) / height);
    height = targetMaxH;
  }

  return { width, height };
}

/**
 * Draw an image onto a canvas and return a Blob.
 */
function canvasToBlob(
  img: HTMLImageElement,
  width: number,
  height: number,
  format: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error(STORAGE_ERRORS_AR.transformFailed));
      return;
    }

    // Use high-quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(img, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error(STORAGE_ERRORS_AR.transformFailed));
        }
      },
      format,
      quality
    );
  });
}

/**
 * Resize and/or compress an image file.
 *
 * Returns a new File with the transformed image. If the transformed
 * image would be larger than the original (e.g., already small PNG),
 * the original file is returned unchanged.
 */
export async function transformImage(
  file: File,
  options: ImageTransformOptions = {}
): Promise<File> {
  const {
    maxWidth = MAX_IMAGE_DIMENSION,
    maxHeight = MAX_IMAGE_DIMENSION,
    quality = DEFAULT_COMPRESSION_QUALITY,
    format = 'image/jpeg',
    maintainAspectRatio = true,
  } = options;

  // Load image
  const img = await loadImageFromFile(file);

  // Calculate dimensions
  let { width, height } = { width: img.naturalWidth, height: img.naturalHeight };

  if (maintainAspectRatio) {
    ({ width, height } = calculateDimensions(width, height, maxWidth, maxHeight));
  } else {
    width = maxWidth || img.naturalWidth;
    height = maxHeight || img.naturalHeight;
  }

  // Skip transformation if dimensions are the same and it's the same format
  if (
    width === img.naturalWidth &&
    height === img.naturalHeight &&
    file.type === format
  ) {
    return file;
  }

  // Convert to blob
  const blob = await canvasToBlob(img, width, height, format, quality);

  // If the transformed blob is larger, return the original
  if (blob.size >= file.size && file.type === format) {
    return file;
  }

  // Build the new file name
  const ext = format.split('/')[1]; // e.g., 'jpeg', 'png', 'webp'
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const newName = `${baseName}_${width}x${height}.${ext === 'jpeg' ? 'jpg' : ext}`;

  return new File([blob], newName, { type: format, lastModified: Date.now() });
}

/**
 * Create a thumbnail version of an image file.
 * Returns a Blob (not a File) for efficiency.
 */
export async function createThumbnail(
  file: File,
  size: number = THUMBNAIL_DIMENSION
): Promise<Blob> {
  const img = await loadImageFromFile(file);
  const { width, height } = calculateDimensions(
    img.naturalWidth,
    img.naturalHeight,
    size,
    size
  );

  const blob = await canvasToBlob(img, width, height, 'image/jpeg', 0.7);
  return blob;
}

/**
 * Convert any image to a data URL (for fallback when storage is unavailable).
 */
export async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(STORAGE_ERRORS_AR.fileReadFailed));
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a data URL to a Blob.
 */
export async function dataURLToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

/**
 * Resize a data URL image (useful for processing already-loaded images).
 */
export async function resizeDataURL(
  dataUrl: string,
  maxWidth: number,
  maxHeight: number,
  quality: number = DEFAULT_COMPRESSION_QUALITY
): Promise<string> {
  const img = await loadImageFromDataURL(dataUrl);
  const { width, height } = calculateDimensions(
    img.naturalWidth,
    img.naturalHeight,
    maxWidth,
    maxHeight
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error(STORAGE_ERRORS_AR.transformFailed);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Get the dimensions of an image file without fully loading it.
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const img = await loadImageFromFile(file);
  return { width: img.naturalWidth, height: img.naturalHeight };
}
