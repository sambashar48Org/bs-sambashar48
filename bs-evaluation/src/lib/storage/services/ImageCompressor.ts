/**
 * B.S Evaluation — Image Compressor
 * ضغط الصور قبل الحفظ
 * أقصى عرض 1920px، جودة 80%
 */

import type { CompressedImage } from '../types/storage.types';

const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1440;
const QUALITY = 0.8;
const THUMBNAIL_MAX = 200;
const THUMBNAIL_QUALITY = 0.6;

export class ImageCompressor {
  /**
   * ضغط صورة واحدة
   */
  static async compress(
    file: File | string,
    options?: { maxWidth?: number; maxHeight?: number; quality?: number }
  ): Promise<CompressedImage> {
    const opts = {
      maxWidth: options?.maxWidth ?? MAX_WIDTH,
      maxHeight: options?.maxHeight ?? MAX_HEIGHT,
      quality: options?.quality ?? QUALITY,
    };

    let img: HTMLImageElement;

    if (typeof file === 'string') {
      // base64 data URL
      img = await this.loadImage(file);
    } else {
      // File object
      const dataUrl = await this.fileToDataUrl(file);
      img = await this.loadImage(dataUrl);
    }

    // Calculate new dimensions
    const { width, height } = this.calculateDimensions(
      img.naturalWidth || img.width,
      img.naturalHeight || img.height,
      opts.maxWidth,
      opts.maxHeight
    );

    // Compress
    const base64 = this.resizeImage(img, width, height, opts.quality);

    // Generate thumbnail
    const thumbDims = this.calculateDimensions(
      img.naturalWidth || img.width,
      img.naturalHeight || img.height,
      THUMBNAIL_MAX,
      THUMBNAIL_MAX
    );
    const thumbnail = this.resizeImage(img, thumbDims.width, thumbDims.height, THUMBNAIL_QUALITY);

    // Estimate size (base64 is ~4/3 of binary)
    const sizeEstimate = Math.round((base64.length * 3) / 4);

    return {
      id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: typeof file === 'string' ? 'image' : file.name,
      type: 'image/jpeg',
      width,
      height,
      size: sizeEstimate,
      base64,
      thumbnail,
    };
  }

  /**
   * ضغط عدة صور بالتوازي
   */
  static async compressMultiple(
    files: (File | string)[],
    options?: { maxWidth?: number; maxHeight?: number; quality?: number }
  ): Promise<CompressedImage[]> {
    return Promise.all(files.map((file) => this.compress(file, options)));
  }

  /**
   * ضغط من FileList (مثل input.files)
   */
  static async compressFromFileList(
    fileList: FileList,
    options?: { maxWidth?: number; maxHeight?: number; quality?: number }
  ): Promise<CompressedImage[]> {
    const files = Array.from(fileList);
    return this.compressMultiple(files, options);
  }

  // ======== Private Helpers ========
  private static loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('فشل تحميل الصورة'));
      img.src = src;
    });
  }

  private static fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('فشل قراءة الملف'));
      reader.readAsDataURL(file);
    });
  }

  private static calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);
    return {
      width: Math.round(originalWidth * ratio),
      height: Math.round(originalHeight * ratio),
    };
  }

  private static resizeImage(
    img: HTMLImageElement,
    width: number,
    height: number,
    quality: number
  ): string {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('فشل إنشاء سياق Canvas');

    // High quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw resized image
    ctx.drawImage(img, 0, 0, width, height);

    // Convert to JPEG
    return canvas.toDataURL('image/jpeg', quality);
  }

  /**
   * تحويل base64 إلى Blob للتحميل
   */
  static base64ToBlob(base64: string): Blob {
    const parts = base64.split(',');
    const mime = parts[0]?.match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(parts[1] || '');
    const u8arr = new Uint8Array(bstr.length);

    for (let i = 0; i < bstr.length; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }

    return new Blob([u8arr], { type: mime });
  }
}
