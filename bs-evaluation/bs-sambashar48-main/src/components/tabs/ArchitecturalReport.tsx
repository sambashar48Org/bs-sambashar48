'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from '@/lib/i18n';
import {
  FLOORING_TYPES,
  WALL_CLADDING_TYPES,
  WINDOW_DOOR_TYPES,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
} from '@/lib/constants';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  X,
  Save,
  Pencil,
  AlertTriangle,
  Camera,
} from 'lucide-react';

// ===================== Types =====================

interface ArchitecturalReportProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
}

interface FloorEntry {
  floorNumber: number;
  totalArea: number;
  projectionArea: number;
  floorLevel: number;
  flooring: { enabled: boolean; type: string; condition: string };
  walls: { enabled: boolean; type: string; condition: string };
  windows: { enabled: boolean; type: string; condition: string };
  doors: { enabled: boolean; type: string; condition: string };
  hasCracks: boolean;
  crackType: 'non-structural' | 'structural' | '';
  crackDescription: string;
  structuralCrackDescription: string;
  structuralCrackPhotos: string[];
  showInStructural: boolean;
  floorNotes: string;
}

interface ArchitecturalReportData {
  floors: FloorEntry[];
  architecturalPhotos: string[];
  generalNotes: string;
}

// ===================== Constants =====================

const CONDITION_OPTIONS = [
  'ممتازة',
  'جيدة',
  'متوسطة',
  'سيئة بحاجة اصلاح',
  'سيئة بحاجة استبدال',
] as const;

const createDefaultFloor = (): FloorEntry => ({
  floorNumber: 1,
  totalArea: 0,
  projectionArea: 0,
  floorLevel: 0,
  flooring: { enabled: false, type: '', condition: '' },
  walls: { enabled: false, type: '', condition: '' },
  windows: { enabled: false, type: '', condition: '' },
  doors: { enabled: false, type: '', condition: '' },
  hasCracks: false,
  crackType: '',
  crackDescription: '',
  structuralCrackDescription: '',
  structuralCrackPhotos: [],
  showInStructural: false,
  floorNotes: '',
});

function computeInitialData(data: Record<string, unknown>): ArchitecturalReportData {
  const defaultData: ArchitecturalReportData = {
    floors: [createDefaultFloor()],
    architecturalPhotos: [],
    generalNotes: '',
  };

  if (data && data.floors && Array.isArray(data.floors) && data.floors.length > 0) {
    defaultData.floors = data.floors.map((f: Record<string, unknown>) => ({
      ...createDefaultFloor(),
      ...f,
      flooring: { ...createDefaultFloor().flooring, ...(f.flooring as object || {}) },
      walls: { ...createDefaultFloor().walls, ...(f.walls as object || {}) },
      windows: { ...createDefaultFloor().windows, ...(f.windows as object || {}) },
      doors: { ...createDefaultFloor().doors, ...(f.doors as object || {}) },
    }));
  }
  if (data && Array.isArray(data.architecturalPhotos)) {
    defaultData.architecturalPhotos = data.architecturalPhotos as string[];
  }
  if (data && typeof data.generalNotes === 'string') {
    defaultData.generalNotes = data.generalNotes;
  }

  return defaultData;
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

export default function ArchitecturalReport({ data, onSave }: ArchitecturalReportProps) {
  const { isRTL } = useTranslation();

  const [reportData, setReportData] = useState<ArchitecturalReportData>(() =>
    computeInitialData(data)
  );
  const [openFloors, setOpenFloors] = useState<Set<number>>(() => new Set([0]));
  const [isEditing, setIsEditing] = useState(false);
  const [pendingData, setPendingData] = useState<ArchitecturalReportData | null>(null);
  const savedFileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  // Sync state when data prop changes (e.g., project switch)
  const [prevData, setPrevData] = useState(data);
  if (prevData !== data) {
    setPrevData(data);
    setReportData(computeInitialData(data));
    setOpenFloors(new Set([0]));
    setIsEditing(false);
    setPendingData(null);
  }

  // ---- Floor Operations ----

  const addFloor = () => {
    setReportData((prev) => {
      const newFloors = [...prev.floors, { ...createDefaultFloor(), floorNumber: prev.floors.length + 1 }];
      const newOpen = new Set(openFloors);
      newOpen.add(newFloors.length - 1);
      setOpenFloors(newOpen);
      return { ...prev, floors: newFloors };
    });
  };

  const removeFloor = (index: number) => {
    if (reportData.floors.length <= 1) return;
    setReportData((prev) => ({
      ...prev,
      floors: prev.floors.filter((_, i) => i !== index),
    }));
    setOpenFloors((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const toggleFloor = (index: number) => {
    setOpenFloors((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const updateFloor = (index: number, updates: Partial<FloorEntry>) => {
    setReportData((prev) => ({
      ...prev,
      floors: prev.floors.map((f, i) => (i === index ? { ...f, ...updates } : f)),
    }));
  };

  const updateFloorSub = (
    index: number,
    subKey: 'flooring' | 'walls' | 'windows' | 'doors',
    updates: Partial<FloorEntry[typeof subKey]>
  ) => {
    setReportData((prev) => ({
      ...prev,
      floors: prev.floors.map((f, i) =>
        i === index ? { ...f, [subKey]: { ...f[subKey], ...updates } } : f
      ),
    }));
  };

  // ---- Image Handlers ----

  const handleImageUpload = async (
    files: FileList | null,
    targetArray: 'structuralCrackPhotos' | 'architecturalPhotos',
    floorIndex?: number,
    maxImages: number = 5
  ) => {
    if (!files) return;
    const fileArr = Array.from(files);

    for (const file of fileArr) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) continue;
      if (file.size > MAX_IMAGE_SIZE) continue;

      const base64 = await fileToBase64(file);

      if (floorIndex !== undefined) {
        const currentPhotos = reportData.floors[floorIndex][targetArray] as string[];
        if (currentPhotos.length >= maxImages) continue;
        updateFloor(floorIndex, { [targetArray]: [...currentPhotos, base64] } as Partial<FloorEntry>);
      } else {
        const currentPhotos = reportData[targetArray];
        if (currentPhotos.length >= maxImages) continue;
        setReportData((prev) => ({
          ...prev,
          [targetArray]: [...currentPhotos, base64],
        }));
      }
    }
  };

  const removeImage = (
    targetArray: 'structuralCrackPhotos' | 'architecturalPhotos',
    imgIndex: number,
    floorIndex?: number
  ) => {
    if (floorIndex !== undefined) {
      const currentPhotos = reportData.floors[floorIndex][targetArray] as string[];
      updateFloor(floorIndex, { [targetArray]: currentPhotos.filter((_, i) => i !== imgIndex) } as Partial<FloorEntry>);
    } else {
      setReportData((prev) => ({
        ...prev,
        [targetArray]: (prev[targetArray] as string[]).filter((_, i) => i !== imgIndex),
      }));
    }
  };

  // ---- Save / Edit ----

  const handleSave = useCallback(() => {
    onSave(reportData as unknown as Record<string, unknown>);
    setIsEditing(false);
    setPendingData(null);
  }, [reportData, onSave]);

  const handleEdit = () => {
    setPendingData({ ...reportData });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (pendingData) {
      setReportData(pendingData);
    }
    setIsEditing(false);
    setPendingData(null);
  };

  // ---- Build save payload ----

  const buildPayload = (): Record<string, unknown> => {
    return {
      ...reportData,
      floors: reportData.floors.map((f) => ({
        ...f,
        showInStructural: f.hasCracks && f.crackType === 'structural',
      })),
    };
  };

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

  const renderNumberField = (
    label: string,
    value: number,
    onChange: (val: number) => void,
    unit?: string,
    helperText?: string,
    placeholder?: string
  ) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground/70">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
          placeholder={placeholder || '0'}
          className="w-full"
          dir="ltr"
          min={0}
        />
        {unit && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded pointer-events-none">
            {unit}
          </span>
        )}
      </div>
      {helperText && <p className="text-[10px] text-gray-400">{helperText}</p>}
    </div>
  );

  const renderToggleSection = (
    title: string,
    enabled: boolean,
    onToggle: (val: boolean) => void,
    children: React.ReactNode
  ) => (
    <div className="border border-border/50 rounded-lg overflow-hidden bg-muted/20">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
        <Label className="text-sm font-medium text-foreground/80 cursor-pointer" onClick={() => onToggle(!enabled)}>
          {title}
        </Label>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
      <div
        className="grid transition-all duration-300 ease-in-out"
        style={{
          gridTemplateRows: enabled ? '1fr' : '0fr',
          transitionProperty: 'grid-template-rows, opacity',
          opacity: enabled ? 1 : 0,
        }}
      >
        <div className="overflow-hidden min-h-0">
          <div className="p-4 pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderImageUpload = (
    images: string[],
    onUpload: (files: FileList | null) => void,
    onRemove: (index: number) => void,
    maxImages: number,
    inputKey: string
  ) => (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-2 text-xs"
          onClick={() => savedFileInputs.current[inputKey]?.click()}
          disabled={images.length >= maxImages}
        >
          <Camera className="w-4 h-4" />
          إضافة صور ({images.length}/{maxImages})
        </Button>
        <span className="text-[10px] text-gray-400">الحد الأقصى 1MB لكل صورة</span>
      </div>
      <input
        ref={(el) => { savedFileInputs.current[inputKey] = el; }}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        multiple
        className="hidden"
        onChange={(e) => onUpload(e.target.files)}
      />
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, idx) => (
            <div key={idx} className="relative group rounded-lg overflow-hidden border border-border/50 bg-muted/20 aspect-square">
              <img
                src={img}
                alt={`صورة ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ===================== Render Floor Entry =====================

  const renderFloorEntry = (floor: FloorEntry, index: number) => {
    const isOpen = openFloors.has(index);

    return (
      <div
        key={index}
        className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm"
      >
        {/* Accordion Header */}
        <button
          type="button"
          onClick={() => toggleFloor(index)}
          className="w-full flex items-center justify-between px-4 sm:px-5 py-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 hover:from-emerald-100/80 hover:to-teal-100/80 dark:hover:from-emerald-950/50 dark:hover:to-teal-950/50 transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500 text-white text-sm font-bold shadow-sm">
              {index + 1}
            </div>
            <div className="text-start">
              <p className="text-sm font-semibold text-foreground">
                الطابق {floor.floorNumber || index + 1}
              </p>
              <p className="text-[10px] text-gray-400">
                {floor.totalArea ? `${floor.totalArea} م²` : 'لم يتم تحديد المساحة'}
                {floor.hasCracks && floor.crackType === 'structural' && (
                  <Badge variant="destructive" className="ms-2 text-[9px] px-1.5 py-0 h-4">
                    إنشائي
                  </Badge>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {reportData.floors.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFloor(index);
                }}
                className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 hover:text-red-600 transition-colors"
                title="حذف الطابق"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            {isOpen ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </button>

        {/* Accordion Content - Animated */}
        <div
          className="grid transition-all duration-300 ease-in-out"
          style={{
            gridTemplateRows: isOpen ? '1fr' : '0fr',
            transitionProperty: 'grid-template-rows, opacity',
            opacity: isOpen ? 1 : 0,
          }}
        >
          <div className="overflow-hidden min-h-0">
            <div className="p-4 sm:p-5 space-y-5">
              {/* 1. Floor Info */}
              <div>
                <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 rounded-full bg-emerald-500" />
                  معلومات الطابق
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {renderNumberField('رقم الطابق', floor.floorNumber, (v) => updateFloor(index, { floorNumber: v }), '', 'أدخل رقم الطابق')}
                  {renderNumberField('مساحة الطابق الكلية', floor.totalArea, (v) => updateFloor(index, { totalArea: v }), 'م²', 'المساحة الكلية للطابق')}
                  {renderNumberField('مساحة البروزات', floor.projectionArea, (v) => updateFloor(index, { projectionArea: v }), 'م²', 'اختياري', '0')}
                  {renderNumberField('منسوب الطابق', floor.floorLevel, (v) => updateFloor(index, { floorLevel: v }), '', 'اختياري', '0')}
                </div>
              </div>

              {/* 2. Flooring */}
              {renderToggleSection(
                'الأرضيات',
                floor.flooring.enabled,
                (v) => updateFloorSub(index, 'flooring', { enabled: v }),
                <>
                  {renderSelectField(
                    'اكساء الأرضيات',
                    floor.flooring.type,
                    (v) => updateFloorSub(index, 'flooring', { type: v }),
                    FLOORING_TYPES
                  )}
                  {renderSelectField(
                    'حالة الأرضيات',
                    floor.flooring.condition,
                    (v) => updateFloorSub(index, 'flooring', { condition: v }),
                    CONDITION_OPTIONS
                  )}
                </>
              )}

              {/* 3. Walls */}
              {renderToggleSection(
                'الجدران',
                floor.walls.enabled,
                (v) => updateFloorSub(index, 'walls', { enabled: v }),
                <>
                  {renderSelectField(
                    'اكساء الجدران',
                    floor.walls.type,
                    (v) => updateFloorSub(index, 'walls', { type: v }),
                    WALL_CLADDING_TYPES
                  )}
                  {renderSelectField(
                    'حالة الجدران',
                    floor.walls.condition,
                    (v) => updateFloorSub(index, 'walls', { condition: v }),
                    CONDITION_OPTIONS
                  )}
                </>
              )}

              {/* 4. Windows */}
              {renderToggleSection(
                'النوافذ',
                floor.windows.enabled,
                (v) => updateFloorSub(index, 'windows', { enabled: v }),
                <>
                  {renderSelectField(
                    'نوع النوافذ',
                    floor.windows.type,
                    (v) => updateFloorSub(index, 'windows', { type: v }),
                    WINDOW_DOOR_TYPES
                  )}
                  {renderSelectField(
                    'حالة النوافذ',
                    floor.windows.condition,
                    (v) => updateFloorSub(index, 'windows', { condition: v }),
                    CONDITION_OPTIONS
                  )}
                </>
              )}

              {/* 5. Doors */}
              {renderToggleSection(
                'الأبواب',
                floor.doors.enabled,
                (v) => updateFloorSub(index, 'doors', { enabled: v }),
                <>
                  {renderSelectField(
                    'نوع الأبواب',
                    floor.doors.type,
                    (v) => updateFloorSub(index, 'doors', { type: v }),
                    WINDOW_DOOR_TYPES
                  )}
                  {renderSelectField(
                    'حالة الأبواب',
                    floor.doors.condition,
                    (v) => updateFloorSub(index, 'doors', { condition: v }),
                    CONDITION_OPTIONS
                  )}
                </>
              )}

              {/* 6. Cracks */}
              <div className="border border-border/50 rounded-lg overflow-hidden bg-muted/20">
                <div className="px-4 py-3 bg-muted/30">
                  <Label className="text-sm font-medium text-foreground/80">التشققات</Label>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-foreground/70">وجود تشققات</Label>
                    <Switch
                      checked={floor.hasCracks}
                      onCheckedChange={(v) => updateFloor(index, { hasCracks: v, crackType: '' })}
                    />
                  </div>

                  {floor.hasCracks && (
                    <div className="space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                      {/* Crack Type Selection */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-foreground/70">نوع التشققات</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              updateFloor(index, {
                                crackType: 'non-structural',
                                showInStructural: false,
                              })
                            }
                            className={`p-3 rounded-lg border-2 text-start text-sm font-medium transition-all duration-200 ${
                              floor.crackType === 'non-structural'
                                ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300'
                                : 'border-border/50 hover:border-amber-200 bg-card'
                            }`}
                          >
                            تشققات غير إنشائية
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateFloor(index, {
                                crackType: 'structural',
                                showInStructural: true,
                              })
                            }
                            className={`p-3 rounded-lg border-2 text-start text-sm font-medium transition-all duration-200 relative ${
                              floor.crackType === 'structural'
                                ? 'border-red-400 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300'
                                : 'border-border/50 hover:border-red-200 bg-card'
                            }`}
                          >
                            تشققات إنشائية
                            {floor.crackType === 'structural' && (
                              <Badge
                                variant="destructive"
                                className="absolute -top-2 -left-2 text-[8px] px-1.5 py-0 h-4 shadow-sm"
                              >
                                CRITICAL
                              </Badge>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Non-structural cracks description */}
                      {floor.crackType === 'non-structural' && (
                        <div className="space-y-2 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                          <Label className="text-xs font-medium text-foreground/70">وصف التشققات</Label>
                          <Textarea
                            value={floor.crackDescription}
                            onChange={(e) => updateFloor(index, { crackDescription: e.target.value })}
                            placeholder="وصف مختصر للتشققات غير الإنشائية..."
                            className="min-h-[70px] resize-y text-sm"
                            dir={isRTL ? 'rtl' : 'ltr'}
                          />
                          <p className="text-[10px] text-gray-400">هذه التشققات لن تظهر في التقرير الإنشائي</p>
                        </div>
                      )}

                      {/* Structural cracks */}
                      {floor.crackType === 'structural' && (
                        <div className="space-y-4 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                          {/* Warning */}
                          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                                رسالة ضرورة تبرير للتشققات الإنشائية
                              </p>
                              <p className="text-[11px] text-red-600/70 dark:text-red-400/70 mt-0.5">
                                يجب توثيق التشققات الإنشائية بالتفصيل مع الصور، وستظهر في التقرير الإنشائي
                              </p>
                            </div>
                          </div>

                          {/* Description */}
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-foreground/70">وصف تفصيلي للتشققات</Label>
                            <Textarea
                              value={floor.structuralCrackDescription}
                              onChange={(e) =>
                                updateFloor(index, { structuralCrackDescription: e.target.value })
                              }
                              placeholder="الموقع، الاتجاه، العرض، الطول، العنصر المتشقق..."
                              className="min-h-[100px] resize-y text-sm"
                              dir={isRTL ? 'rtl' : 'ltr'}
                            />
                            <p className="text-[10px] text-gray-400">
                              حدد الموقع والاتجاه والعرض والطول والعنصر الإنشائي المتشقق
                            </p>
                          </div>

                          {/* Photos */}
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-foreground/70">صور التشققات الإنشائية</Label>
                            {renderImageUpload(
                              floor.structuralCrackPhotos,
                              (files) =>
                                handleImageUpload(files, 'structuralCrackPhotos', index, 4),
                              (imgIdx) => removeImage('structuralCrackPhotos', imgIdx, index),
                              4,
                              `floor-${index}-cracks`
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 7. Floor Notes */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-foreground/70">ملاحظات الطابق</Label>
                <Textarea
                  value={floor.floorNotes}
                  onChange={(e) => updateFloor(index, { floorNotes: e.target.value })}
                  placeholder="ملاحظات إضافية حول هذا الطابق..."
                  className="min-h-[70px] resize-y text-sm"
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===================== Main Render =====================

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header Card */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white pb-4">
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
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <span>التقرير الوصفي المعماري</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Floor Entries */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
            بيانات الطوابق ({reportData.floors.length})
          </h3>
          <Button
            onClick={addFloor}
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
          >
            <Plus className="h-3.5 w-3.5" />
            إضافة طابق
          </Button>
        </div>

        {reportData.floors.map((floor, index) => renderFloorEntry(floor, index))}
      </div>

      {/* 8. Architectural Photos */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <ImageIcon className="h-5 w-5" />
            </div>
            <span>صور التقرير المعماري</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {renderImageUpload(
            reportData.architecturalPhotos,
            (files) => handleImageUpload(files, 'architecturalPhotos', undefined, 5),
            (imgIdx) => removeImage('architecturalPhotos', imgIdx),
            5,
            'arch-photos'
          )}
        </CardContent>
      </Card>

      {/* 9. General Notes */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Pencil className="h-5 w-5" />
            </div>
            <span>ملاحظات عامة</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <Textarea
            value={reportData.generalNotes}
            onChange={(e) =>
              setReportData((prev) => ({ ...prev, generalNotes: e.target.value }))
            }
            placeholder="أدخل ملاحظات معمارية عامة..."
            className="min-h-[120px] resize-y text-sm"
            dir={isRTL ? 'rtl' : 'ltr'}
          />
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
