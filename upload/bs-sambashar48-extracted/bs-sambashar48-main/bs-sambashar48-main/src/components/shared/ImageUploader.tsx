'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ImagePlus, X, Upload, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';

interface ImageUploaderProps {
  images: Array<{ url: string; path?: string; name?: string }>;
  onImagesChange: (images: Array<{ url: string; path?: string; name?: string }>) => void;
  maxImages?: number;
  maxSizeMB?: number;
  section?: string;
  compact?: boolean;
}

export default function ImageUploader({
  images,
  onImagesChange,
  maxImages = 3,
  maxSizeMB = 5,
  section = 'general',
  compact = false,
}: ImageUploaderProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = maxImages - images.length;
    const filesToUpload = Array.from(files).slice(0, remaining);

    if (filesToUpload.length === 0) {
      toast.error(`${t.maxPhotos} (${maxImages})`);
      return;
    }

    setUploading(true);

    for (const file of filesToUpload) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`${t.maxSize}`);
        continue;
      }

      if (!file.type.startsWith('image/')) {
        toast.error(t.uploadFailed);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('section', section);

        const res = await fetch('/api/storage/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          if (data.code === 'BUCKET_NOT_FOUND') {
            // Store as base64 data URL as fallback
            const reader = new FileReader();
            const dataUrl = await new Promise<string>((resolve) => {
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            });
            onImagesChange([...images, { url: dataUrl, name: file.name }]);
            toast.success(t.savedLocally);
            continue;
          }
          throw new Error(data.error || t.uploadFailed);
        }

        const data = await res.json();
        onImagesChange([...images, { url: data.url, path: data.path, name: data.name }]);
        toast.success(t.uploadSuccess);
      } catch {
        // Fallback: store as data URL
        try {
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          onImagesChange([...images, { url: dataUrl, name: file.name }]);
          toast.success(t.savedLocally);
        } catch {
          toast.error(t.uploadFailed);
        }
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [images, maxImages, maxSizeMB, section, t, onImagesChange]);

  const handleRemove = useCallback(async (index: number) => {
    const img = images[index];
    // Try to delete from Supabase storage
    if (img.path) {
      try {
        await fetch('/api/storage', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bucket: 'evaluation-images', path: img.path }),
        });
      } catch {
        // silent
      }
    }
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  }, [images, onImagesChange]);

  return (
    <div className="space-y-2">
      {!compact && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">{t.photos}</label>
          <span className="text-xs text-muted-foreground">
            {images.length}/{maxImages}
          </span>
        </div>
      )}

      <div className={`grid gap-2 ${compact ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
        {images.map((img, index) => (
          <div key={img.url || img.name || index} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
            <img
              src={img.url}
              alt={img.name || `Photo ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                size="icon"
                variant="destructive"
                className="h-8 w-8"
                onClick={() => handleRemove(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {img.name && !compact && (
              <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5">
                <p className="text-[10px] text-white truncate">{img.name}</p>
              </div>
            )}
          </div>
        ))}

        {images.length < maxImages && (
          <label
            className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-muted-foreground/25 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors ${
'aspect-square'
            }`}
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                {compact ? (
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
                <span className={`text-xs text-muted-foreground ${compact ? 'hidden' : ''}`}>
                  {t.addPhoto}
                </span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {!compact && (
        <p className="text-[11px] text-muted-foreground">
          {t.maxSize}
        </p>
      )}
    </div>
  );
}
