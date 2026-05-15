'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/lib/i18n';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/lib/constants';
import { ClipboardCheck, Camera, X, Save, Pencil, Building2, HardHat, Zap, Droplets } from 'lucide-react';

// ===================== Types =====================

interface TechnicalNotesProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
}

interface TechnicalNotesData {
  architecturalNotes: {
    humidityMarks: string;
    visibleWaterLeakage: string;
    poorVentilation: string;
    insulationCondition: string;
    exteriorCladding: string;
  };
  structuralNotes: {
    visibleRebarCorrosion: string;
    slabBeamSettlement: string;
    columnWallTilt: string;
    concreteCoverSpalling: string;
  };
  electricalNotes: {
    electricalInstallations: string;
    fireSuppression: string;
    surveillanceSystem: string;
  };
  plumbingNotes: {
    plumbingInstallations: string;
  };
  location: string;
  photos: string[];
  recommendations: string;
}

// ===================== Constants =====================

const DEFAULT_ARCHITECTURAL = {
  humidityMarks: '',
  visibleWaterLeakage: '',
  poorVentilation: '',
  insulationCondition: '',
  exteriorCladding: '',
};

const DEFAULT_STRUCTURAL = {
  visibleRebarCorrosion: '',
  slabBeamSettlement: '',
  columnWallTilt: '',
  concreteCoverSpalling: '',
};

const DEFAULT_ELECTRICAL = {
  electricalInstallations: '',
  fireSuppression: '',
  surveillanceSystem: '',
};

const DEFAULT_PLUMBING = {
  plumbingInstallations: '',
};

const DEFAULT_DATA: TechnicalNotesData = {
  architecturalNotes: { ...DEFAULT_ARCHITECTURAL },
  structuralNotes: { ...DEFAULT_STRUCTURAL },
  electricalNotes: { ...DEFAULT_ELECTRICAL },
  plumbingNotes: { ...DEFAULT_PLUMBING },
  location: '',
  photos: [],
  recommendations: '',
};

function safeAssign<T extends Record<string, string>>(target: T, source: unknown): T {
  const result = { ...target };
  if (source && typeof source === 'object') {
    Object.keys(target).forEach((key) => {
      const val = (source as Record<string, unknown>)[key];
      if (typeof val === 'string') {
        result[key] = val;
      }
    });
  }
  return result;
}

function computeInitialData(data: Record<string, unknown>): TechnicalNotesData {
  const result: TechnicalNotesData = { ...DEFAULT_DATA };
  if (data && typeof data === 'object') {
    result.architecturalNotes = safeAssign(DEFAULT_ARCHITECTURAL, data.architecturalNotes);
    result.structuralNotes = safeAssign(DEFAULT_STRUCTURAL, data.structuralNotes);
    result.electricalNotes = safeAssign(DEFAULT_ELECTRICAL, data.electricalNotes);
    result.plumbingNotes = safeAssign(DEFAULT_PLUMBING, data.plumbingNotes);
    if (typeof data.location === 'string') result.location = data.location;
    if (typeof data.recommendations === 'string') result.recommendations = data.recommendations;
    if (Array.isArray(data.photos)) result.photos = data.photos as string[];
  }
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

export default function TechnicalNotes({ data, onSave }: TechnicalNotesProps) {
  const { isRTL } = useTranslation();

  const [formData, setFormData] = useState<TechnicalNotesData>(() => computeInitialData(data));
  const [isEditing, setIsEditing] = useState(false);
  const [pendingData, setPendingData] = useState<TechnicalNotesData | null>(null);
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

  const updateArchitectural = useCallback((field: keyof typeof DEFAULT_ARCHITECTURAL, value: string) => {
    setFormData((prev) => ({
      ...prev,
      architecturalNotes: { ...prev.architecturalNotes, [field]: value },
    }));
  }, []);

  const updateStructural = useCallback((field: keyof typeof DEFAULT_STRUCTURAL, value: string) => {
    setFormData((prev) => ({
      ...prev,
      structuralNotes: { ...prev.structuralNotes, [field]: value },
    }));
  }, []);

  const updateElectrical = useCallback((field: keyof typeof DEFAULT_ELECTRICAL, value: string) => {
    setFormData((prev) => ({
      ...prev,
      electricalNotes: { ...prev.electricalNotes, [field]: value },
    }));
  }, []);

  const updatePlumbing = useCallback((field: keyof typeof DEFAULT_PLUMBING, value: string) => {
    setFormData((prev) => ({
      ...prev,
      plumbingNotes: { ...prev.plumbingNotes, [field]: value },
    }));
  }, []);

  const updateField = useCallback((field: keyof TechnicalNotesData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
        className="min-h-[70px] resize-y text-sm"
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

  // ===================== Category Renderers =====================

  const renderArchitecturalCategory = () => (
    <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white pb-4">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <span>ملاحظات معمارية</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="space-y-4">
          {renderTextareaField(
            'آثار رطوبة في الجدران والأسقف',
            formData.architecturalNotes.humidityMarks,
            (v) => updateArchitectural('humidityMarks', v),
            'صف وجود آثار رطوبة وموقعها ومدى انتشارها...',
            'حدد الموقع ومدى الانتشار'
          )}
          {renderTextareaField(
            'تسريب مياه ظاهر',
            formData.architecturalNotes.visibleWaterLeakage,
            (v) => updateArchitectural('visibleWaterLeakage', v),
            'صف التسريبات الظاهرة ومصدرها...',
            'حدد المصدر والشدة والموقع'
          )}
          {renderTextareaField(
            'ضعف التهوية الطبيعية',
            formData.architecturalNotes.poorVentilation,
            (v) => updateArchitectural('poorVentilation', v),
            'صف حالة التهوية في المبنى...',
            'حدد المواقع ذات التهوية الضعيفة'
          )}
          {renderTextareaField(
            'وضع العزل الحراري والمائي',
            formData.architecturalNotes.insulationCondition,
            (v) => updateArchitectural('insulationCondition', v),
            'صف حالة العزل الحراري والمائي...',
            'نوع العزل وحالته ومدى فعاليته'
          )}
          {renderTextareaField(
            'حالة الواجهات الخارجية والإكساءات',
            formData.architecturalNotes.exteriorCladding,
            (v) => updateArchitectural('exteriorCladding', v),
            'صف حالة الواجهات والإكساءات الخارجية...',
            'نوع الإكساء وحالته وتلفياته'
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderStructuralCategory = () => (
    <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-red-500 to-rose-500 text-white pb-4">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <HardHat className="h-5 w-5" />
          </div>
          <span>ملاحظات إنشائية</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="space-y-4">
          {renderTextareaField(
            'صدأ ظاهر في حديد التسليح',
            formData.structuralNotes.visibleRebarCorrosion,
            (v) => updateStructural('visibleRebarCorrosion', v),
            'صف وجود صدأ في حديد التسليح...',
            'حدد الموقع ومدى الانتشار'
          )}
          {renderTextareaField(
            'هبوط في البلاطات والجوائز',
            formData.structuralNotes.slabBeamSettlement,
            (v) => updateStructural('slabBeamSettlement', v),
            'صف وجود هبوط في البلاطات أو الجوائز...',
            'حدد مقدار الهبوط والموقع'
          )}
          {renderTextareaField(
            'ميلان في الأعمدة والجدران',
            formData.structuralNotes.columnWallTilt,
            (v) => updateStructural('columnWallTilt', v),
            'صف وجود ميلان في الأعمدة أو الجدران...',
            'حدد مقدار الميلان واتجاهه'
          )}
          {renderTextareaField(
            'تساقط وتقشر الغطاء البيتوني',
            formData.structuralNotes.concreteCoverSpalling,
            (v) => updateStructural('concreteCoverSpalling', v),
            'صف تساقط أو تقشر الغطاء البيتوني...',
            'حدد الموقع والمساحة المتأثرة'
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderElectricalCategory = () => (
    <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white pb-4">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Zap className="h-5 w-5" />
          </div>
          <span>ملاحظات كهربائية</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="space-y-4">
          {renderTextareaField(
            'حالة التمديدات الكهربائية',
            formData.electricalNotes.electricalInstallations,
            (v) => updateElectrical('electricalInstallations', v),
            'صف حالة التمديدات الكهربائية...',
            'نوع التمديدات وحالتها العامة'
          )}
          {renderTextareaField(
            'حالة منظومة الإطفاء',
            formData.electricalNotes.fireSuppression,
            (v) => updateElectrical('fireSuppression', v),
            'صف حالة منظومة الإطفاء...',
            'نوع المنظومة وحالتها ومدى صلاحيتها'
          )}
          {renderTextareaField(
            'حالة منظومة المراقبة',
            formData.electricalNotes.surveillanceSystem,
            (v) => updateElectrical('surveillanceSystem', v),
            'صف حالة منظومة المراقبة والكاميرات...',
            'عدد الكاميرات وحالتها وتغطيتها'
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderPlumbingCategory = () => (
    <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white pb-4">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Droplets className="h-5 w-5" />
          </div>
          <span>ملاحظات صحية</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        {renderTextareaField(
          'حالة التمديدات الصحية',
          formData.plumbingNotes.plumbingInstallations,
          (v) => updatePlumbing('plumbingInstallations', v),
          'صف حالة التمديدات الصحية...',
          'نوع المواسير وحالتها العامة'
        )}
      </CardContent>
    </Card>
  );

  // ===================== Main Render =====================

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header Card */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <span>الملاحظات الفنية</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Category 1: Architectural Notes */}
      {renderArchitecturalCategory()}

      {/* Category 2: Structural Notes */}
      {renderStructuralCategory()}

      {/* Category 3: Electrical Notes */}
      {renderElectricalCategory()}

      {/* Category 4: Plumbing Notes */}
      {renderPlumbingCategory()}

      {/* Global: Location & Photos */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <span>الموقع والصور</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {/* Location Input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground/70">موقع الملاحظة ووصفها</Label>
            <Input
              value={formData.location}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="حدد موقع الملاحظة بدقة..."
              className="w-full text-sm"
              dir={isRTL ? 'rtl' : 'ltr'}
              disabled={!isEditing}
            />
            <p className="text-[10px] text-gray-400">حدد موقع كل ملاحظة بدقة لسهولة المتابعة</p>
          </div>

          {/* Photos */}
          {renderImageUpload(
            formData.photos,
            handleImageUpload,
            removeImage,
            5
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <span>التوصيات والمقترحات</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <Textarea
            value={formData.recommendations}
            onChange={(e) => updateField('recommendations', e.target.value)}
            placeholder="أدخل التوصيات والمقترحات بناءً على الملاحظات الفنية..."
            className="min-h-[120px] resize-y text-sm"
            dir={isRTL ? 'rtl' : 'ltr'}
            disabled={!isEditing}
          />
          <p className="text-[10px] text-gray-400 mt-1.5">
            اكتب التوصيات والمقترحات اللازمة لمعالجة الملاحظات المسجلة
          </p>
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
