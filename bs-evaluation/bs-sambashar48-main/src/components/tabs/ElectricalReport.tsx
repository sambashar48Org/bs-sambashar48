'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from '@/lib/i18n';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/lib/constants';
import { Zap, Camera, X, Save, Pencil } from 'lucide-react';

// ===================== Types =====================

interface ElectricalReportProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
}

interface ElectricalData {
  mainSupply: string;
  mainPanelCondition: string;
  lightingCondition: string;
  hasLowCurrentSystem: boolean;
  lowCurrentSystems: string[];
  installationsDescription: string;
  observations: string;
  photos: string[];
}

// ===================== Constants =====================

const LOW_CURRENT_OPTIONS = [
  'منظومة التحكم',
  'منظومة إنذار الحريق',
  'منظومة المراقبة والكاميرات',
  'شبكات البيانات والاتصالات',
  'المراقبة الحرارية والذكية',
  'أخرى',
] as const;

const DEFAULT_DATA: ElectricalData = {
  mainSupply: '',
  mainPanelCondition: '',
  lightingCondition: '',
  hasLowCurrentSystem: false,
  lowCurrentSystems: [],
  installationsDescription: '',
  observations: '',
  photos: [],
};

function computeInitialData(data: Record<string, unknown>): ElectricalData {
  const result: ElectricalData = { ...DEFAULT_DATA };
  if (data && typeof data.mainSupply === 'string') result.mainSupply = data.mainSupply;
  if (data && typeof data.mainPanelCondition === 'string') result.mainPanelCondition = data.mainPanelCondition;
  if (data && typeof data.lightingCondition === 'string') result.lightingCondition = data.lightingCondition;
  if (data && typeof data.hasLowCurrentSystem === 'boolean') result.hasLowCurrentSystem = data.hasLowCurrentSystem;
  if (data && Array.isArray(data.lowCurrentSystems)) result.lowCurrentSystems = data.lowCurrentSystems as string[];
  if (data && typeof data.installationsDescription === 'string') result.installationsDescription = data.installationsDescription;
  if (data && typeof data.observations === 'string') result.observations = data.observations;
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

export default function ElectricalReport({ data, onSave }: ElectricalReportProps) {
  const { isRTL } = useTranslation();

  const [formData, setFormData] = useState<ElectricalData>(() => computeInitialData(data));
  const [isEditing, setIsEditing] = useState(false);
  const [pendingData, setPendingData] = useState<ElectricalData | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state when data prop changes (e.g., project switch)
  const [prevData, setPrevData] = useState(data);
  if (prevData !== data) {
    setPrevData(data);
    setFormData(computeInitialData(data));
    setIsEditing(false);
    setPendingData(null);
  }

  // ---- Change Handlers ----

  const handleChange = useCallback((field: keyof ElectricalData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleLowCurrentSystem = useCallback((system: string) => {
    setFormData((prev) => {
      const exists = prev.lowCurrentSystems.includes(system);
      return {
        ...prev,
        lowCurrentSystems: exists
          ? prev.lowCurrentSystems.filter((s) => s !== system)
          : [...prev.lowCurrentSystems, system],
      };
    });
  }, []);

  // ---- Image Handlers ----

  const handleImageUpload = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const fileArr = Array.from(files);
    for (const file of fileArr) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) continue;
      if (file.size > MAX_IMAGE_SIZE) continue;
      if (formData.photos.length >= 5) continue;
      const base64 = await fileToBase64(file);
      setFormData((prev) => ({
        ...prev,
        photos: [...prev.photos, base64],
      }));
    }
  }, [formData.photos.length]);

  const removeImage = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
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
    helperText?: string
  ) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground/70">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none cursor-pointer"
        dir="rtl"
        disabled={!isEditing}
      >
        <option value="" disabled>
          اختر
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
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
    maxImages: number
  ) => (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-2 text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={images.length >= maxImages || !isEditing}
        >
          <Camera className="w-4 h-4" />
          إضافة صور ({images.length}/{maxImages})
        </Button>
        <span className="text-[10px] text-gray-400">الحد الأقصى 1MB لكل صورة</span>
      </div>
      <input
        ref={fileInputRef}
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
                alt={`صورة ${idx + 1}`}
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
              <Zap className="h-5 w-5" />
            </div>
            <span>التقرير الكهربائي</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Main Form */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 pb-3">
          <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            بيانات التقرير الكهربائي
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          {/* Selects Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {renderSelectField(
              'التغذية الرئيسية',
              formData.mainSupply,
              (v) => handleChange('mainSupply', v),
              ['شبكة عامة', 'شبكة خاصة', 'مولدة', 'طاقة بديلة', 'مختلط'] as const,
              'حدد مصدر التغذية الكهربائية الرئيسي'
            )}

            {renderSelectField(
              'حالة لوحة الكهرباء الرئيسية',
              formData.mainPanelCondition,
              (v) => handleChange('mainPanelCondition', v),
              ['ممتازة', 'جيدة', 'متوسطة', 'سيئة'] as const,
              'تقييم الحالة العامة للوحة الكهرباء'
            )}

            {renderSelectField(
              'حالة الإضاءة',
              formData.lightingCondition,
              (v) => handleChange('lightingCondition', v),
              ['ممتازة', 'جيدة', 'متوسطة', 'سيئة'] as const,
              'تقييم حالة منظومة الإضاءة'
            )}
          </div>

          {/* Low Current System Toggle */}
          <div className="border border-border/50 rounded-lg overflow-hidden bg-muted/20">
            <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
              <Label className="text-sm font-medium text-foreground/80 cursor-pointer">
                منظومة التيار الضعيف
              </Label>
              <Switch
                checked={formData.hasLowCurrentSystem}
                onCheckedChange={(v) => handleChange('hasLowCurrentSystem', v)}
                disabled={!isEditing}
              />
            </div>
            <div
              className="grid transition-all duration-300 ease-in-out"
              style={{
                gridTemplateRows: formData.hasLowCurrentSystem ? '1fr' : '0fr',
                transitionProperty: 'grid-template-rows, opacity',
                opacity: formData.hasLowCurrentSystem ? 1 : 0,
              }}
            >
              <div className="overflow-hidden min-h-0">
                <div className="p-4 pt-3 space-y-3">
                  <p className="text-[10px] text-gray-400">اختر المنظومات المتوفرة</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {LOW_CURRENT_OPTIONS.map((option) => (
                      <label
                        key={option}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors cursor-pointer"
                      >
                        <Checkbox
                          checked={formData.lowCurrentSystems.includes(option)}
                          onCheckedChange={() => toggleLowCurrentSystem(option)}
                          disabled={!isEditing}
                        />
                        <span className="text-sm text-foreground/80">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description Textarea */}
          {renderTextareaField(
            'وصف التمديدات والتجهيزات الكهربائية',
            formData.installationsDescription,
            (v) => handleChange('installationsDescription', v),
            'أدخل وصفاً تفصيلياً للتمديدات والتجهيزات الكهربائية...',
            'صف نوع التمديدات والمواد المستخدمة وحالتها'
          )}

          {/* Observations Textarea */}
          {renderTextareaField(
            'الملاحظات والمشاهدات',
            formData.observations,
            (v) => handleChange('observations', v),
            'أدخل الملاحظات والمشاهدات حول النظام الكهربائي...',
            'سجل أي ملاحظات أو مشاهدات ميدانية'
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
            <span>صور المنظومات والعيوب</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {renderImageUpload(
            formData.photos,
            handleImageUpload,
            removeImage,
            5
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
              إلغاء
            </Button>
            <Button
              onClick={handleSave}
              className="gap-2 text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-6"
            >
              <Save className="w-4 h-4" />
              حفظ البيانات
            </Button>
          </>
        ) : (
          <Button
            onClick={handleEdit}
            className="gap-2 text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-6"
          >
            <Pencil className="w-4 h-4" />
            تعديل البيانات
          </Button>
        )}
      </div>
    </div>
  );
}
