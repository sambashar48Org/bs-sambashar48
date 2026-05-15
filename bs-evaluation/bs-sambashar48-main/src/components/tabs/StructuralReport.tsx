'use client';

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/lib/i18n';
import { useProjectStore } from '@/stores';
import {
  STRUCTURAL_SYSTEMS,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  MAX_SOIL_REPORT_SIZE,
} from '@/lib/constants';
import {
  FileText,
  Hammer,
  Layers,
  AlertTriangle,
  Camera,
  X,
  Save,
  Pencil,
  Upload,
  FileCheck2,
  PenTool,
  MessageSquare,
} from 'lucide-react';

// ===================== Types =====================

interface StructuralReportProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
}

interface HammerTestData {
  fc: number;
  hammerReportPhoto: string;
}

interface SoilReportData {
  soilType: string;
  foundationDepth: number;
  allowableBearing: number;
  frictionAngle: number;
  waterTableLevel: number;
  soilReportFileName: string;
  soilReportFileSize: number;
}

interface CrackJustification {
  floorIndex: number;
  justification: string;
  additionalPhotos: string[];
}

interface StructuralReportData {
  structuralDescription: string;
  structuralSystem: string;
  hammerTest: HammerTestData;
  soilReport: SoilReportData;
  crackJustifications: CrackJustification[];
  generalNotes: string;
}

// ===================== Defaults =====================

const defaultData: StructuralReportData = {
  structuralDescription: '',
  structuralSystem: '',
  hammerTest: { fc: 0, hammerReportPhoto: '' },
  soilReport: {
    soilType: '',
    foundationDepth: 0,
    allowableBearing: 0,
    frictionAngle: 0,
    waterTableLevel: 0,
    soilReportFileName: '',
    soilReportFileSize: 0,
  },
  crackJustifications: [],
  generalNotes: '',
};

function computeInitialData(data: Record<string, unknown>): StructuralReportData {
  const result: StructuralReportData = JSON.parse(JSON.stringify(defaultData));

  if (!data) return result;

  if (typeof data.structuralDescription === 'string') result.structuralDescription = data.structuralDescription;
  if (typeof data.structuralSystem === 'string') result.structuralSystem = data.structuralSystem;
  if (typeof data.generalNotes === 'string') result.generalNotes = data.generalNotes;

  if (data.hammerTest && typeof data.hammerTest === 'object') {
    result.hammerTest = {
      ...defaultData.hammerTest,
      ...(data.hammerTest as Partial<HammerTestData>),
    };
  }

  if (data.soilReport && typeof data.soilReport === 'object') {
    result.soilReport = {
      ...defaultData.soilReport,
      ...(data.soilReport as Partial<SoilReportData>),
    };
  }

  if (Array.isArray(data.crackJustifications)) {
    result.crackJustifications = data.crackJustifications.map((cj: Record<string, unknown>) => ({
      floorIndex: typeof cj.floorIndex === 'number' ? cj.floorIndex : 0,
      justification: typeof cj.justification === 'string' ? cj.justification : '',
      additionalPhotos: Array.isArray(cj.additionalPhotos) ? cj.additionalPhotos : [],
    }));
  }

  return result;
}

// ===================== Helpers =====================

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ===================== Architectural Floor Crack Type =====================

interface ArchFloorCrack {
  floorIndex: number;
  floorNumber: number;
  structuralCrackDescription: string;
  structuralCrackPhotos: string[];
}

// ===================== Main Component =====================

export default function StructuralReport({ data, onSave }: StructuralReportProps) {
  const { isRTL } = useTranslation();
  const projectData = useProjectStore((s) => s.projectData);

  const [reportData, setReportData] = useState<StructuralReportData>(() =>
    computeInitialData(data)
  );
  const [isEditing, setIsEditing] = useState(false);
  const [pendingData, setPendingData] = useState<StructuralReportData | null>(null);
  const [openCrackPanels, setOpenCrackPanels] = useState<Set<number>>(() => new Set());

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Sync state when data prop changes (e.g., project switch)
  const [prevData, setPrevData] = useState(data);
  if (prevData !== data) {
    setPrevData(data);
    setReportData(computeInitialData(data));
    setIsEditing(false);
    setPendingData(null);
    setOpenCrackPanels(new Set());
  }

  // ---- Derive structural cracks from architectural report ----
  const structuralCracks = useMemo<ArchFloorCrack[]>(() => {
    const archReport = projectData.architectural_report;
    if (!archReport || !Array.isArray(archReport.floors)) return [];

    const cracks: ArchFloorCrack[] = [];
    (archReport.floors as Record<string, unknown>[]).forEach((floor, index) => {
      if (floor.showInStructural === true || (floor.hasCracks === true && floor.crackType === 'structural')) {
        cracks.push({
          floorIndex: index,
          floorNumber: typeof floor.floorNumber === 'number' ? floor.floorNumber : index + 1,
          structuralCrackDescription: typeof floor.structuralCrackDescription === 'string' ? floor.structuralCrackDescription : '',
          structuralCrackPhotos: Array.isArray(floor.structuralCrackPhotos) ? floor.structuralCrackPhotos : [],
        });
      }
    });
    return cracks;
  }, [projectData.architectural_report]);

  // ---- Handlers ----

  const handleSave = useCallback(() => {
    onSave(reportData as unknown as Record<string, unknown>);
    setIsEditing(false);
    setPendingData(null);
  }, [reportData, onSave]);

  const handleEdit = () => {
    setPendingData(JSON.parse(JSON.stringify(reportData)));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (pendingData) {
      setReportData(pendingData);
    }
    setIsEditing(false);
    setPendingData(null);
  };

  // ---- Hammer test photo upload ----
  const handleHammerPhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return;
    if (file.size > MAX_IMAGE_SIZE) return;
    const base64 = await fileToBase64(file);
    setReportData((prev) => ({
      ...prev,
      hammerTest: { ...prev.hammerTest, hammerReportPhoto: base64 },
    }));
  };

  const removeHammerPhoto = () => {
    setReportData((prev) => ({
      ...prev,
      hammerTest: { ...prev.hammerTest, hammerReportPhoto: '' },
    }));
  };

  // ---- Soil report file upload ----
  const handleSoilFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > MAX_SOIL_REPORT_SIZE) return;
    // Store as base64 for files <= 5MB, otherwise just store metadata
    if (file.size <= 5 * 1024 * 1024) {
      const base64 = await fileToBase64(file);
      setReportData((prev) => ({
        ...prev,
        soilReport: {
          ...prev.soilReport,
          soilReportFileName: file.name,
          soilReportFileSize: file.size,
          soilReportFileBase64: base64,
        },
      }));
    } else {
      // For large files, just store the filename and size
      setReportData((prev) => ({
        ...prev,
        soilReport: {
          ...prev.soilReport,
          soilReportFileName: file.name,
          soilReportFileSize: file.size,
        },
      }));
    }
  };

  const removeSoilFile = () => {
    setReportData((prev) => ({
      ...prev,
      soilReport: {
        ...prev.soilReport,
        soilReportFileName: '',
        soilReportFileSize: 0,
      },
    }));
  };

  // ---- Crack justification handlers ----
  const toggleCrackPanel = (floorIndex: number) => {
    setOpenCrackPanels((prev) => {
      const next = new Set(prev);
      if (next.has(floorIndex)) next.delete(floorIndex);
      else next.add(floorIndex);
      return next;
    });
  };

  const updateJustification = (floorIndex: number, justification: string) => {
    setReportData((prev) => {
      const existing = prev.crackJustifications.find((cj) => cj.floorIndex === floorIndex);
      let updated: CrackJustification[];
      if (existing) {
        updated = prev.crackJustifications.map((cj) =>
          cj.floorIndex === floorIndex ? { ...cj, justification } : cj
        );
      } else {
        updated = [...prev.crackJustifications, { floorIndex, justification, additionalPhotos: [] }];
      }
      return { ...prev, crackJustifications: updated };
    });
  };

  const handleAdditionalCrackPhotos = async (files: FileList | null, floorIndex: number) => {
    if (!files) return;
    const existing = reportData.crackJustifications.find((cj) => cj.floorIndex === floorIndex);
    const currentPhotos = existing?.additionalPhotos || [];
    const remaining = 4 - currentPhotos.length;

    for (let i = 0; i < Math.min(files.length, remaining); i++) {
      const file = files[i];
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) continue;
      if (file.size > MAX_IMAGE_SIZE) continue;

      const base64 = await fileToBase64(file);
      const newPhotos = [...currentPhotos, base64];

      setReportData((prev) => {
        const exists = prev.crackJustifications.find((cj) => cj.floorIndex === floorIndex);
        let updated: CrackJustification[];
        if (exists) {
          updated = prev.crackJustifications.map((cj) =>
            cj.floorIndex === floorIndex ? { ...cj, additionalPhotos: newPhotos } : cj
          );
        } else {
          updated = [...prev.crackJustifications, { floorIndex, justification: '', additionalPhotos: newPhotos }];
        }
        return { ...prev, crackJustifications: updated };
      });

      currentPhotos.push(base64); // track locally for the loop
    }
  };

  const removeAdditionalPhoto = (floorIndex: number, photoIndex: number) => {
    setReportData((prev) => {
      const existing = prev.crackJustifications.find((cj) => cj.floorIndex === floorIndex);
      if (!existing) return prev;
      const updated = prev.crackJustifications.map((cj) =>
        cj.floorIndex === floorIndex
          ? { ...cj, additionalPhotos: cj.additionalPhotos.filter((_, i) => i !== photoIndex) }
          : cj
      );
      return { ...prev, crackJustifications: updated };
    });
  };

  // ---- Get justification for a floor ----
  const getJustification = (floorIndex: number): CrackJustification => {
    return reportData.crackJustifications.find((cj) => cj.floorIndex === floorIndex) || {
      floorIndex,
      justification: '',
      additionalPhotos: [],
    };
  };

  // ===================== Section Header Helper =====================

  const sectionHeader = (icon: React.ReactNode, title: string, gradient: string) => (
    <CardHeader className={`bg-gradient-to-r ${gradient} text-white pb-4`}>
      <CardTitle className="flex items-center gap-3 text-lg">
        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">{icon}</div>
        <span>{title}</span>
      </CardTitle>
    </CardHeader>
  );

  // ===================== Render =====================

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ========== Section 1: Structural System Description ========== */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        {sectionHeader(
          <FileText className="h-5 w-5" />,
          'التقرير الفني الانشائي',
          'from-emerald-500 to-teal-500'
        )}
        <CardContent className="p-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              وصف الجملة الإنشائية
            </Label>
            <Textarea
              value={reportData.structuralDescription}
              onChange={(e) =>
                setReportData((prev) => ({ ...prev, structuralDescription: e.target.value }))
              }
              disabled={!isEditing}
              placeholder="وصف تفصيلي للجملة الإنشائية للمبنى..."
              className="min-h-[120px] resize-y text-sm"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            <p className="text-[10px] text-gray-400">
              صف الجملة الإنشائية المستخدمة في المنشأة بالتفصيل
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ========== Section 2: Structural System Type ========== */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        {sectionHeader(
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>,
          'النظام الانشائي للمنشأة',
          'from-emerald-500 to-teal-500'
        )}
        <CardContent className="p-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              نوع النظام الإنشائي
            </Label>
            <Select
              value={reportData.structuralSystem || ''}
              onValueChange={(val) =>
                setReportData((prev) => ({ ...prev, structuralSystem: val }))
              }
              disabled={!isEditing}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="اختر النظام الإنشائي" />
              </SelectTrigger>
              <SelectContent>
                {STRUCTURAL_SYSTEMS.map((sys) => (
                  <SelectItem key={sys} value={sys}>
                    {sys}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-gray-400">
              حدد نوع النظام الإنشائي المستخدم في المنشأة
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ========== Section 3: Schmidt Hammer Test ========== */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        {sectionHeader(
          <Hammer className="h-5 w-5" />,
          'تقرير تجربة المطرقة',
          'from-teal-500 to-emerald-500'
        )}
        <CardContent className="p-6 space-y-5">
          {/* fc input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              المقاومة الاسطوانية المميزة f&#39;c
            </Label>
            <div className="relative">
              <Input
                type="number"
                value={reportData.hammerTest.fc || ''}
                onChange={(e) =>
                  setReportData((prev) => ({
                    ...prev,
                    hammerTest: {
                      ...prev.hammerTest,
                      fc: e.target.value === '' ? 0 : Number(e.target.value),
                    },
                  }))
                }
                disabled={!isEditing}
                placeholder="0"
                className="w-full pe-20"
                dir="ltr"
                min={0}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded pointer-events-none">
                كغ/سم²
              </span>
            </div>
            <p className="text-[10px] text-gray-400">
              القيمة المرجعية المستخدمة في حسابات الأساسات والأعمدة والجوائز
            </p>
          </div>

          {/* Hammer report photo */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              صورة تقرير تجربة المطرقة
            </Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-2 text-xs"
                onClick={() => fileInputRefs.current['hammer-photo']?.click()}
                disabled={!isEditing || !!reportData.hammerTest.hammerReportPhoto}
              >
                <Camera className="w-4 h-4" />
                {reportData.hammerTest.hammerReportPhoto ? 'تم الرفع' : 'رفع صورة التقرير'}
              </Button>
              <span className="text-[10px] text-gray-400">
                صورة واحدة كحد أقصى — 1MB
              </span>
            </div>
            <input
              ref={(el) => { fileInputRefs.current['hammer-photo'] = el; }}
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(',')}
              className="hidden"
              onChange={(e) => handleHammerPhotoUpload(e.target.files)}
            />
            {reportData.hammerTest.hammerReportPhoto && (
              <div className="relative inline-block rounded-lg overflow-hidden border border-border/50 shadow-sm">
                <img
                  src={reportData.hammerTest.hammerReportPhoto}
                  alt="تقرير تجربة المطرقة"
                  className="max-h-48 w-auto object-contain rounded-lg"
                />
                {isEditing && (
                  <button
                    type="button"
                    onClick={removeHammerPhoto}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-white shadow-md hover:bg-destructive/90 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ========== Section 4: Soil Mechanics Report ========== */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        {sectionHeader(
          <Layers className="h-5 w-5" />,
          'تقرير ميكانيك التربة',
          'from-teal-500 to-emerald-500'
        )}
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Soil Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">نوع التربة</Label>
              <Input
                type="text"
                value={reportData.soilReport.soilType}
                onChange={(e) =>
                  setReportData((prev) => ({
                    ...prev,
                    soilReport: { ...prev.soilReport, soilType: e.target.value },
                  }))
                }
                disabled={!isEditing}
                placeholder="مثال: طينية، رملية..."
                className="text-sm"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>

            {/* Foundation Depth */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">عمق التأسيس</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={reportData.soilReport.foundationDepth || ''}
                  onChange={(e) =>
                    setReportData((prev) => ({
                      ...prev,
                      soilReport: {
                        ...prev.soilReport,
                        foundationDepth: e.target.value === '' ? 0 : Number(e.target.value),
                      },
                    }))
                  }
                  disabled={!isEditing}
                  placeholder="0"
                  className="w-full pe-10"
                  dir="ltr"
                  min={0}
                  step={0.1}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded pointer-events-none">
                  m
                </span>
              </div>
            </div>

            {/* Allowable Bearing */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">تحمل التربة المسموح به</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={reportData.soilReport.allowableBearing || ''}
                  onChange={(e) =>
                    setReportData((prev) => ({
                      ...prev,
                      soilReport: {
                        ...prev.soilReport,
                        allowableBearing: e.target.value === '' ? 0 : Number(e.target.value),
                      },
                    }))
                  }
                  disabled={!isEditing}
                  placeholder="0"
                  className="w-full pe-16"
                  dir="ltr"
                  min={0}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded pointer-events-none">
                  كغ/سم²
                </span>
              </div>
            </div>

            {/* Friction Angle */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">زاوية احتكاك التربة</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={reportData.soilReport.frictionAngle || ''}
                  onChange={(e) =>
                    setReportData((prev) => ({
                      ...prev,
                      soilReport: {
                        ...prev.soilReport,
                        frictionAngle: e.target.value === '' ? 0 : Number(e.target.value),
                      },
                    }))
                  }
                  disabled={!isEditing}
                  placeholder="0"
                  className="w-full pe-10"
                  dir="ltr"
                  min={0}
                  max={90}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded pointer-events-none">
                  deg
                </span>
              </div>
            </div>

            {/* Water Table Level */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">منسوب المياه الجوفية</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={reportData.soilReport.waterTableLevel || ''}
                  onChange={(e) =>
                    setReportData((prev) => ({
                      ...prev,
                      soilReport: {
                        ...prev.soilReport,
                        waterTableLevel: e.target.value === '' ? 0 : Number(e.target.value),
                      },
                    }))
                  }
                  disabled={!isEditing}
                  placeholder="0"
                  className="w-full pe-10"
                  dir="ltr"
                  min={0}
                  step={0.1}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded pointer-events-none">
                  m
                </span>
              </div>
            </div>
          </div>

          {/* Soil Report File Upload */}
          <div className="mt-5 space-y-2">
            <Label className="text-sm font-medium text-foreground/80">ملف تقرير ميكانيك التربة</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-2 text-xs"
                onClick={() => fileInputRefs.current['soil-file']?.click()}
                disabled={!isEditing || !!reportData.soilReport.soilReportFileName}
              >
                <Upload className="w-4 h-4" />
                {reportData.soilReport.soilReportFileName ? 'تم الرفع' : 'رفع ملف التقرير'}
              </Button>
              <span className="text-[10px] text-gray-400">
                PDF, ZIP, صور — الحد الأقصى 20MB
              </span>
            </div>
            <input
              ref={(el) => { fileInputRefs.current['soil-file'] = el; }}
              type="file"
              accept=".pdf,.zip,.rar,.7z,.jpg,.jpeg,.png,.webp,.gif"
              className="hidden"
              onChange={(e) => handleSoilFileUpload(e.target.files)}
            />
            {reportData.soilReport.soilReportFileName && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                <FileCheck2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 truncate">
                    {reportData.soilReport.soilReportFileName}
                  </p>
                  {reportData.soilReport.soilReportFileSize > 0 && (
                    <p className="text-[10px] text-gray-400">
                      {formatFileSize(reportData.soilReport.soilReportFileSize)}
                    </p>
                  )}
                </div>
                {isEditing && (
                  <button
                    type="button"
                    onClick={removeSoilFile}
                    className="p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 hover:text-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ========== Section 5: Structural Crack Justification ========== */}
      {structuralCracks.length > 0 && (
        <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
          {sectionHeader(
            <AlertTriangle className="h-5 w-5" />,
            'تبرير التشققات الإنشائية',
            'from-red-500 to-orange-500'
          )}
          <CardContent className="p-6 space-y-4">
            {/* Warning Banner */}
            <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-amber-700 dark:text-amber-400 text-sm">
                ضرورة تبرير للتشققات الإنشائية
              </AlertTitle>
              <AlertDescription className="text-amber-600/80 dark:text-amber-400/70 text-xs">
                يجب توصيف وتبرير كل تشقق من قبل المهندس الانشائي
              </AlertDescription>
            </Alert>

            {/* Each crack */}
            {structuralCracks.map((crack) => {
              const just = getJustification(crack.floorIndex);
              const isOpen = openCrackPanels.has(crack.floorIndex);

              return (
                <div
                  key={crack.floorIndex}
                  className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm"
                >
                  {/* Accordion Header */}
                  <button
                    type="button"
                    onClick={() => toggleCrackPanel(crack.floorIndex)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 hover:from-red-100/80 hover:to-orange-100/80 dark:hover:from-red-950/40 dark:hover:to-orange-950/40 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500 text-white text-sm font-bold shadow-sm">
                        {crack.floorNumber}
                      </div>
                      <div className="text-start">
                        <p className="text-sm font-semibold text-foreground">
                          الطابق {crack.floorNumber}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          تشقق إنشائي
                          {just.justification && (
                            <span className="text-emerald-600 dark:text-emerald-400 ms-2">
                              — تم التبرير
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {isOpen ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m18 15-6-6-6 6" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    )}
                  </button>

                  {/* Accordion Content */}
                  <div
                    className="grid transition-all duration-300 ease-in-out"
                    style={{
                      gridTemplateRows: isOpen ? '1fr' : '0fr',
                      transitionProperty: 'grid-template-rows, opacity',
                      opacity: isOpen ? 1 : 0,
                    }}
                  >
                    <div className="overflow-hidden min-h-0">
                      <div className="p-4 space-y-4">
                        {/* Crack Description (read-only) */}
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-foreground/70 flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-red-500" />
                            وصف التشقق (من التقرير المعماري)
                          </Label>
                          <div className="p-3 rounded-lg bg-muted/50 border border-border/30 text-sm text-foreground/70 min-h-[50px]">
                            {crack.structuralCrackDescription || (
                              <span className="text-gray-400 italic">لم يتم إدخال وصف</span>
                            )}
                          </div>
                        </div>

                        {/* Crack Photos (read-only thumbnails) */}
                        {crack.structuralCrackPhotos.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-foreground/70 flex items-center gap-1.5">
                              <Camera className="w-3.5 h-3.5 text-red-500" />
                              صور التشقق (من التقرير المعماري)
                            </Label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                              {crack.structuralCrackPhotos.map((photo, idx) => (
                                <div
                                  key={idx}
                                  className="aspect-square rounded-lg overflow-hidden border border-border/50 bg-muted/20"
                                >
                                  <img
                                    src={photo}
                                    alt={`تشقق طابق ${crack.floorNumber} - ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Engineer Justification Textarea */}
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-foreground/70 flex items-center gap-1.5">
                            <PenTool className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            التبرير الانشائي
                          </Label>
                          <Textarea
                            value={just.justification}
                            onChange={(e) => updateJustification(crack.floorIndex, e.target.value)}
                            disabled={!isEditing}
                            placeholder="أدخل التبرير الانشائي لهذا التشقق..."
                            className="min-h-[100px] resize-y text-sm"
                            dir={isRTL ? 'rtl' : 'ltr'}
                          />
                          <p className="text-[10px] text-gray-400">
                            وصف وتبرير أسباب التشقق من الناحية الإنشائية
                          </p>
                        </div>

                        {/* Additional Crack Photos Upload */}
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-foreground/70">
                            صور اضافية للتشقق
                          </Label>
                          <div className="flex items-center gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-[11px]"
                              onClick={() =>
                                fileInputRefs.current[`crack-photo-${crack.floorIndex}`]?.click()
                              }
                              disabled={!isEditing || just.additionalPhotos.length >= 4}
                            >
                              <Camera className="w-3.5 h-3.5" />
                              إضافة صور ({just.additionalPhotos.length}/4)
                            </Button>
                            <span className="text-[10px] text-gray-400">الحد الأقصى 1MB لكل صورة</span>
                          </div>
                          <input
                            ref={(el) => { fileInputRefs.current[`crack-photo-${crack.floorIndex}`] = el; }}
                            type="file"
                            accept={ALLOWED_IMAGE_TYPES.join(',')}
                            multiple
                            className="hidden"
                            onChange={(e) => handleAdditionalCrackPhotos(e.target.files, crack.floorIndex)}
                          />
                          {just.additionalPhotos.length > 0 && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                              {just.additionalPhotos.map((photo, idx) => (
                                <div
                                  key={idx}
                                  className="relative group aspect-square rounded-lg overflow-hidden border border-border/50 bg-muted/20"
                                >
                                  <img
                                    src={photo}
                                    alt={`صورة اضافية - ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                  {isEditing && (
                                    <button
                                      type="button"
                                      onClick={() => removeAdditionalPhoto(crack.floorIndex, idx)}
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
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ========== Section 6: General Notes ========== */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        {sectionHeader(
          <MessageSquare className="h-5 w-5" />,
          'ملاحظات عامة',
          'from-teal-600 to-emerald-600'
        )}
        <CardContent className="p-6">
          <Textarea
            value={reportData.generalNotes}
            onChange={(e) =>
              setReportData((prev) => ({ ...prev, generalNotes: e.target.value }))
            }
            disabled={!isEditing}
            placeholder="أدخل ملاحظات إنشائية عامة..."
            className="min-h-[120px] resize-y text-sm"
            dir={isRTL ? 'rtl' : 'ltr'}
          />
        </CardContent>
      </Card>

      {/* ========== Bottom Action Buttons ========== */}
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
