'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/lib/i18n';
import { IMAGE_LIMITS, MAX_IMAGE_SIZE, ALLOWED_IMAGE_TYPES } from '@/lib/constants';
import {
  Building2,
  Edit3,
  Save,
  Camera,
  Upload,
  X,
  FileText,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface BuildingInfoProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
}

// ─── Evaluation Purpose Options ──────────────────────────────────────────────
const EVALUATION_PURPOSE_OPTIONS = [
  {
    value: 'تقييم وضع راهن (تسوية مخالفة)',
    label: 'تقييم وضع راهن (تسوية مخالفة)',
  },
  {
    value: 'إضافة طابق للمنشأة',
    label: 'إضافة طابق للمنشأة',
  },
];

// ─── Default Form Data ───────────────────────────────────────────────────────
function getDefaultFormData(): Record<string, string> {
  return {
    ownerName: '',
    buildingUsage: '',
    buildingAge: '',
    numberOfFloors: '',
    propertyNumber: '',
    propertyArea: '',
    licenseNumber: '',
    previousLicenseDate: '',
    existingComponents: '',
    evaluationDate: new Date().toISOString().split('T')[0],
    evaluationPurpose: '',
    siteDescription: '',
    generalNotes: '',
  };
}

function hydrateFormData(data: Record<string, unknown>): Record<string, string> {
  const defaults = getDefaultFormData();
  const result: Record<string, string> = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (data[key] !== undefined && data[key] !== null) {
      result[key] = String(data[key]);
    }
  }
  // Ensure evaluationDate always defaults to today if empty
  if (!result.evaluationDate) {
    result.evaluationDate = new Date().toISOString().split('T')[0];
  }
  return result;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function BuildingInfo({ data, onSave }: BuildingInfoProps) {
  const { isRTL } = useTranslation();

  // Form fields state
  const [formData, setFormData] = useState<Record<string, string>>(() =>
    hydrateFormData(data)
  );

  // Site photos (stored as base64 string array)
  const [sitePhotos, setSitePhotos] = useState<string[]>(() =>
    Array.isArray(data.sitePhotos) ? (data.sitePhotos as string[]) : []
  );

  // Editing state
  const [isEditing, setIsEditing] = useState(false);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync when data prop changes (project switch)
  const [prevData, setPrevData] = useState(data);
  if (prevData !== data) {
    setPrevData(data);
    setFormData(hydrateFormData(data));
    setSitePhotos(Array.isArray(data.sitePhotos) ? (data.sitePhotos as string[]) : []);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /** Persist current state to parent */
  const persist = useCallback(
    (form?: Record<string, string>, photos?: string[]) => {
      const f = form ?? formData;
      const p = photos ?? sitePhotos;
      onSave({ ...f, sitePhotos: p });
    },
    [formData, sitePhotos, onSave]
  );

  /** Handle field change and auto-save */
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-save on change when editing
      if (isEditing) {
        onSave({ ...next, sitePhotos });
      }
      return next;
    });
  };

  /** Explicit save button handler */
  const handleSave = () => {
    persist();
    setIsEditing(false);
    toast.success('تم حفظ البيانات بنجاح');
  };

  /** Enter edit mode */
  const handleEdit = () => {
    setIsEditing(true);
  };

  // ─── Image Upload ──────────────────────────────────────────────────────────

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const maxPhotos = IMAGE_LIMITS.sitePhotos; // 2
      const remaining = maxPhotos - sitePhotos.length;

      if (remaining <= 0) {
        toast.error(`الحد الأقصى ${maxPhotos} صور`);
        return;
      }

      const filesToProcess = Array.from(files).slice(0, remaining);
      setIsUploading(true);

      const newBase64Array: string[] = [];

      for (const file of filesToProcess) {
        // Validate type
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          toast.error(`نوع الملف "${file.name}" غير مدعوم`);
          continue;
        }

        // Validate size
        if (file.size > MAX_IMAGE_SIZE) {
          toast.error(`حجم الصورة "${file.name}" يتجاوز 1 ميغابايت`);
          continue;
        }

        try {
          // Convert to base64
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('فشل قراءة الملف'));
            reader.readAsDataURL(file);
          });

          newBase64Array.push(base64);
        } catch {
          toast.error(`فشل تحميل "${file.name}"`);
        }
      }

      if (newBase64Array.length > 0) {
        const updatedPhotos = [...sitePhotos, ...newBase64Array];
        setSitePhotos(updatedPhotos);
        // Auto-save when editing
        if (isEditing) {
          onSave({ ...formData, sitePhotos: updatedPhotos });
        }
      }

      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [sitePhotos, formData, isEditing, onSave]
  );

  const handleRemovePhoto = useCallback(
    (index: number) => {
      const updated = sitePhotos.filter((_, i) => i !== index);
      setSitePhotos(updated);
      if (isEditing) {
        onSave({ ...formData, sitePhotos: updated });
      }
    },
    [sitePhotos, formData, isEditing, onSave]
  );

  // ─── Sub-components ────────────────────────────────────────────────────────

  const disabled = !isEditing;

  const renderTextField = (
    label: string,
    field: string,
    type: 'text' | 'number' | 'date' = 'text',
    placeholder?: string
  ) => (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground/80">{label}</Label>
      <Input
        type={type}
        value={formData[field] || ''}
        onChange={(e) => handleChange(field, e.target.value)}
        onBlur={() => {
          if (isEditing) persist();
        }}
        placeholder={placeholder || ''}
        disabled={disabled}
        className="w-full"
        dir={isRTL ? 'rtl' : 'ltr'}
      />
    </div>
  );

  const renderSectionHeading = (icon: React.ReactNode, title: string) => (
    <div className="flex items-center gap-2.5 mb-5">
      {icon}
      <h3 className="text-base font-bold text-foreground">{title}</h3>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ═══ Section 1: Owner & Building Data ═══ */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <span>بيانات المنشأة</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {renderSectionHeading(
            <FileText className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />,
            'بيانات المالك والمنشأة'
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {renderTextField('اسم مالك المنشأة', 'ownerName', 'text', 'أدخل اسم المالك')}
            {renderTextField('استخدام المنشأة', 'buildingUsage', 'text', 'مثال: سكني، تجاري')}
            {renderTextField('عمر المنشأة', 'buildingAge', 'number', 'بالسنوات')}
            {renderTextField('عدد الطوابق', 'numberOfFloors', 'number', '0')}
            {renderTextField('رقم العقار', 'propertyNumber', 'text', 'أدخل رقم العقار')}
            {renderTextField('المنطقة العقارية', 'propertyArea', 'text', 'أدخل المنطقة')}
            {renderTextField('رقم الترخيص', 'licenseNumber', 'text', 'أدخل رقم الترخيص')}
            {renderTextField(
              'تاريخ الترخيص السابق',
              'previousLicenseDate',
              'date'
            )}
          </div>
        </CardContent>
      </Card>

      {/* ═══ Section 2: Existing Building Components ═══ */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <span>مكونات المنشأة القائمة</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-2">
            <Textarea
              value={formData.existingComponents || ''}
              onChange={(e) => handleChange('existingComponents', e.target.value)}
              onBlur={() => {
                if (isEditing) persist();
              }}
              placeholder="صف مكونات المنشأة القائمة بالتفصيل..."
              disabled={disabled}
              className="min-h-[120px] resize-y"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            <p className="text-xs text-gray-400">
              أدخل وصفاً تفصيلياً لمكونات المنشأة القائمة
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ═══ Section 3: Evaluation Data ═══ */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <FileText className="h-5 w-5" />
            </div>
            <span>بيانات التقييم</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          {renderSectionHeading(
            <Camera className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />,
            'بيانات التقييم'
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Evaluation Date */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground/80">
                تاريخ التقييم
              </Label>
              <Input
                type="date"
                value={formData.evaluationDate || ''}
                onChange={(e) => handleChange('evaluationDate', e.target.value)}
                onBlur={() => {
                  if (isEditing) persist();
                }}
                disabled={disabled}
                className="w-full"
                dir="ltr"
              />
            </div>

            {/* Evaluation Purpose */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground/80">
                غاية التقييم
              </Label>
              <Select
                value={formData.evaluationPurpose || ''}
                onValueChange={(val) => handleChange('evaluationPurpose', val)}
                disabled={disabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر غاية التقييم" />
                </SelectTrigger>
                <SelectContent>
                  {EVALUATION_PURPOSE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Site Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              وصف الموقع العام
            </Label>
            <Textarea
              value={formData.siteDescription || ''}
              onChange={(e) => handleChange('siteDescription', e.target.value)}
              onBlur={() => {
                if (isEditing) persist();
              }}
              placeholder="صف الموقع العام للمنشأة..."
              disabled={disabled}
              className="min-h-[100px] resize-y"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-foreground/80">
                تحميل صورة الموقع العام
              </Label>
              <span className="text-xs text-gray-400">
                {sitePhotos.length} / {IMAGE_LIMITS.sitePhotos}
              </span>
            </div>

            {/* Upload Button */}
            {sitePhotos.length < IMAGE_LIMITS.sitePhotos && (
              <div>
                <label
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                    disabled
                      ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                      : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/50'
                  }`}
                >
                  {isUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  ) : (
                    <Upload className="h-5 w-5 text-gray-400" />
                  )}
                  <span className="text-sm text-gray-400">
                    {isUploading
                      ? 'جارٍ التحميل...'
                      : 'اضغط لتحميل صورة الموقع العام'}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={disabled || isUploading}
                  />
                </label>
                <p className="text-xs text-gray-400 mt-1.5">
                  الحد الأقصى {IMAGE_LIMITS.sitePhotos} صور، حجم كل صورة لا يتجاوز 1 ميغابايت
                  (JPEG, PNG, WebP, GIF)
                </p>
              </div>
            )}

            {/* Preview Grid */}
            {sitePhotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {sitePhotos.map((src, index) => (
                  <div
                    key={`site-photo-${index}`}
                    className="relative group aspect-[4/3] rounded-lg overflow-hidden border bg-muted"
                  >
                    <img
                      src={src}
                      alt={`صورة الموقع ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {isEditing && (
                      <button
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-1.5 left-1.5 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
                        aria-label="حذف الصورة"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 px-2 py-1">
                      <p className="text-[10px] text-white/90">
                        صورة {index + 1}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ═══ Section 4: General Notes ═══ */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <FileText className="h-5 w-5" />
            </div>
            <span>ملاحظات عامة</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-2">
            <Textarea
              value={formData.generalNotes || ''}
              onChange={(e) => handleChange('generalNotes', e.target.value)}
              onBlur={() => {
                if (isEditing) persist();
              }}
              placeholder="أدخل الملاحظات العامة هنا..."
              disabled={disabled}
              className="min-h-[150px] resize-y"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            <p className="text-xs text-gray-400">
              أدخل أي ملاحظات عامة إضافية حول المنشأة
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ═══ Bottom Action Buttons ═══ */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {!isEditing ? (
          <Button
            onClick={handleEdit}
            variant="outline"
            className="gap-2 px-6 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
          >
            <Edit3 className="h-4 w-4" />
            تعديل البيانات
          </Button>
        ) : (
          <Button
            onClick={handleSave}
            className="gap-2 px-8 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Save className="h-4 w-4" />
            حفظ البيانات
          </Button>
        )}
      </div>
    </div>
  );
}
