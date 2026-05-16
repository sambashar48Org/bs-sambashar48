'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from '@/lib/i18n';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/lib/constants';
import { Droplets, Camera, X, Save, Pencil } from 'lucide-react';

// ===================== Types =====================

interface PlumbingReportProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
}

interface PlumbingData {
  mainSupply: string;
  saltWaterNetwork: string;
  freshWaterNetwork: string;
  hasLeakage: boolean;
  leakageDescription: string;
  leakagePhotos: string[];
  notes: string;
  photos: string[];
}

// ===================== Constants =====================

const DEFAULT_DATA: PlumbingData = {
  mainSupply: '',
  saltWaterNetwork: '',
  freshWaterNetwork: '',
  hasLeakage: false,
  leakageDescription: '',
  leakagePhotos: [],
  notes: '',
  photos: [],
};

function computeInitialData(data: Record<string, unknown>): PlumbingData {
  const result: PlumbingData = { ...DEFAULT_DATA };
  if (data && typeof data.mainSupply === 'string') result.mainSupply = data.mainSupply;
  if (data && typeof data.saltWaterNetwork === 'string') result.saltWaterNetwork = data.saltWaterNetwork;
  if (data && typeof data.freshWaterNetwork === 'string') result.freshWaterNetwork = data.freshWaterNetwork;
  if (data && typeof data.hasLeakage === 'boolean') result.hasLeakage = data.hasLeakage;
  if (data && typeof data.leakageDescription === 'string') result.leakageDescription = data.leakageDescription;
  if (data && Array.isArray(data.leakagePhotos)) result.leakagePhotos = data.leakagePhotos as string[];
  if (data && typeof data.notes === 'string') result.notes = data.notes;
  if (data && Array.isArray(data.photos)) result.photos = data.photos as string[];
  return result;
}

// ===================== Image Upload Helper =====================

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ===================== Main Component =====================

export default function PlumbingReport({ data, onSave }: PlumbingReportProps) {
  const { t, isRTL } = useTranslation();

  const [formData, setFormData] = useState<PlumbingData>(() => computeInitialData(data));
  const [isEditing, setIsEditing] = useState(false);
  const [pendingData, setPendingData] = useState<PlumbingData | null>(null);
  const photosFileRef = useRef<HTMLInputElement | null>(null);
  const leakageFileRef = useRef<HTMLInputElement | null>(null);

  // Sync state when data prop changes (e.g., project switch)
  const [prevData, setPrevData] = useState(data);
  if (prevData !== data) {
    setPrevData(data);
    setFormData(computeInitialData(data));
    setIsEditing(false);
    setPendingData(null);
  }

  // ---- Option Label Mappings ----

  const mainSupplyOptionLabels: Record<string, string> = {
    'شبكة عامة': t.publicGrid,
    'شبكة خاصة بئر': t.privateWell,
    'خزانات': t.tanks,
    'مختلط': t.mixed,
  };

  const saltWaterPipeOptionLabels: Record<string, string> = {
    'حديد': t.iron,
    'فونت': t.font,
    'أنابيب بيتونية': t.concretePipes,
    'PVC': 'PVC',
    'مختلط': t.mixed,
    'أخرى': t.otherSystem,
  };

  const freshWaterPipeOptionLabels: Record<string, string> = {
    'PPR': 'PPR',
    'حديد': t.iron,
    'مختلط': t.mixed,
    'أخرى': t.otherSystem,
  };

  // ---- Change Handlers ----

  const handleChange = useCallback((field: keyof PlumbingData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // ---- Image Handlers ----

  const handlePhotoUpload = useCallback(
    async (files: FileList | null, targetKey: 'photos' | 'leakagePhotos', maxImages: number) => {
      if (!files) return;
      const fileArr = Array.from(files);
      for (const file of fileArr) {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) continue;
        if (file.size > MAX_IMAGE_SIZE) continue;
        if (formData[targetKey].length >= maxImages) continue;
        const base64 = await fileToBase64(file);
        setFormData((prev) => ({
          ...prev,
          [targetKey]: [...prev[targetKey], base64],
        }));
      }
    },
    [formData]
  );

  const removePhoto = useCallback((targetKey: 'photos' | 'leakagePhotos', index: number) => {
    setFormData((prev) => ({
      ...prev,
      [targetKey]: (prev[targetKey] as string[]).filter((_, i) => i !== index),
    }));
  }, []);

  // ---- Save / Edit ----

  const handleSave = useCallback(() => {
    onSave(formData as unknown as Record<string, unknown>);
    setIsEditing(false);
    setPendingData(null);
  }, [formData, onSave]);

  const handleEdit = useCallback(() => {
    setPendingData({ ...formData });
    setIsEditing(true);
  }, [formData]);

  const handleCancelEdit = useCallback(() => {
    if (pendingData) {
      setFormData(pendingData);
    }
    setIsEditing(false);
    setPendingData(null);
  }, [pendingData]);

  // ===================== Render Helpers =====================

  const renderSelectField = (
    label: string,
    value: string,
    onChange: (val: string) => void,
    options: readonly string[],
    helperText?: string,
    optionLabels?: Record<string, string>
  ) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground/70">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none cursor-pointer"
        dir={isRTL ? 'rtl' : 'ltr'}
        disabled={!isEditing}
      >
        <option value="" disabled>
          {t.choose}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {optionLabels?.[opt] ?? opt}
          </option>
        ))}
      </select>
      {helperText && <p className="text-[10px] text-gray-400">{helperText}</p>}
    </div>
  );

  const renderTextareaField = (
    label: string,
    value: string,
    onChange: (val: string) => void,
    placeholder?: string,
    helperText?: string
  ) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground/70">{label}</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[90px] resize-y text-sm"
        dir={isRTL ? 'rtl' : 'ltr'}
        disabled={!isEditing}
      />
      {helperText && <p className="text-[10px] text-gray-400">{helperText}</p>}
    </div>
  );

  const renderImageUpload = (
    images: string[],
    onUpload: (files: FileList | null) => void,
    onRemove: (index: number) => void,
    maxImages: number,
    inputRef: React.RefObject<HTMLInputElement | null>
  ) => (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-2 text-xs"
          onClick={() => inputRef.current?.click()}
          disabled={images.length >= maxImages || !isEditing}
        >
          <Camera className="w-4 h-4" />
          {t.addPhotos} ({images.length}/{maxImages})
        </Button>
        <span className="text-[10px] text-gray-400">{t.maxPhotoSize}</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        multiple
        className="hidden"
        onChange={(e) => onUpload(e.target.files)}
      />
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, idx) => (
            <div
              key={idx}
              className="relative group rounded-lg overflow-hidden border border-border/50 bg-muted/20 aspect-square"
            >
              <img
                src={img}
                alt={`${t.photo} ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              {isEditing && (
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ===================== Main Render =====================

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header Card */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Droplets className="h-5 w-5" />
            </div>
            <span>{t.plumbingReportTitle}</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Main Form */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 pb-3">
          <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            {t.plumbingReportData}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          {/* Selects Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {renderSelectField(
              t.mainWaterSupply,
              formData.mainSupply,
              (v) => handleChange('mainSupply', v),
              ['شبكة عامة', 'شبكة خاصة بئر', 'خزانات', 'مختلط'] as const,
              t.chooseWaterSupply,
              mainSupplyOptionLabels
            )}

            {renderSelectField(
              t.saltWaterNetwork,
              formData.saltWaterNetwork,
              (v) => handleChange('saltWaterNetwork', v),
              ['حديد', 'فونت', 'أنابيب بيتونية', 'PVC', 'مختلط', 'أخرى'] as const,
              t.chooseSaltPipe,
              saltWaterPipeOptionLabels
            )}

            {renderSelectField(
              t.freshWaterNetwork,
              formData.freshWaterNetwork,
              (v) => handleChange('freshWaterNetwork', v),
              ['PPR', 'حديد', 'مختلط', 'أخرى'] as const,
              t.chooseFreshPipe,
              freshWaterPipeOptionLabels
            )}
          </div>

          {/* Leakage Toggle */}
          <div className="border border-border/50 rounded-lg overflow-hidden bg-muted/20">
            <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
              <Label className="text-sm font-medium text-foreground/80 cursor-pointer">
                {t.leakExist}
              </Label>
              <Switch
                checked={formData.hasLeakage}
                onCheckedChange={(v) => handleChange('hasLeakage', v)}
                disabled={!isEditing}
              />
            </div>
            <div
              className="grid transition-all duration-300 ease-in-out"
              style={{
                gridTemplateRows: formData.hasLeakage ? '1fr' : '0fr',
                transitionProperty: 'grid-template-rows, opacity',
                opacity: formData.hasLeakage ? 1 : 0,
              }}
            >
              <div className="overflow-hidden min-h-0">
                <div className="p-4 pt-3 space-y-4">
                  {renderTextareaField(
                    t.leakDescription,
                    formData.leakageDescription,
                    (v) => handleChange('leakageDescription', v),
                    t.leakDescriptionPlaceholder,
                    t.leakDescriptionHint
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-foreground/70">{t.leakPhotos}</Label>
                    {renderImageUpload(
                      formData.leakagePhotos,
                      (files) => handlePhotoUpload(files, 'leakagePhotos', 4),
                      (idx) => removePhoto('leakagePhotos', idx),
                      4,
                      leakageFileRef
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {renderTextareaField(
            t.plumbingNotes,
            formData.notes,
            (v) => handleChange('notes', v),
            t.plumbingNotesPlaceholder,
            t.plumbingNotesHint
          )}
        </CardContent>
      </Card>

      {/* Photos */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Camera className="h-5 w-5" />
            </div>
            <span>{t.plumbingPhotos}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {renderImageUpload(
            formData.photos,
            (files) => handlePhotoUpload(files, 'photos', 5),
            (idx) => removePhoto('photos', idx),
            5,
            photosFileRef
          )}
        </CardContent>
      </Card>

      {/* Bottom Action Buttons */}
      <div className="flex items-center justify-end gap-3 pb-4">
        {isEditing ? (
          <>
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              className="gap-2 text-sm"
            >
              <X className="w-4 h-4" />
              {t.cancel}
            </Button>
            <Button
              onClick={handleSave}
              className="gap-2 text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-6"
            >
              <Save className="w-4 h-4" />
              {t.saveData}
            </Button>
          </>
        ) : (
          <Button
            onClick={handleEdit}
            className="gap-2 text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-6"
          >
            <Pencil className="w-4 h-4" />
            {t.editData}
          </Button>
        )}
      </div>
    </div>
  );
}
