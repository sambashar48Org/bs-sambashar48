'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from '@/lib/i18n';
import { useProjectStore } from '@/stores';
import {
  FileOutput,
  Printer,
  FileDown,
  Settings2,
  ListChecks,
  Building2,
  DraftingCompass,
  HardHat,
  Layers,
  Columns3,
  Palette,
  PlugZap,
  Pipette,
  ClipboardList,
  FileText,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';

// ======== Types ========
interface GenerateReportsProps {
  projectData: Record<string, unknown>;
}

interface SectionOption {
  id: string;
  label: string;
  dataKey: string;
  icon: React.ReactNode;
}

// ======== Section Options ========
const SECTION_OPTIONS: SectionOption[] = [
  { id: 'buildingData', label: 'بيانات المنشأة', dataKey: 'building_data', icon: <Building2 className="h-4 w-4" /> },
  { id: 'architecturalReport', label: 'التقرير الوصفي المعماري', dataKey: 'architectural_report', icon: <DraftingCompass className="h-4 w-4" /> },
  { id: 'structuralReport', label: 'التقرير الفني الانشائي', dataKey: 'structural_report', icon: <HardHat className="h-4 w-4" /> },
  { id: 'foundations', label: 'الأساسات', dataKey: 'foundations', icon: <Layers className="h-4 w-4" /> },
  { id: 'columnsWalls', label: 'الأعمدة والجدران', dataKey: 'columns_walls', icon: <Columns3 className="h-4 w-4" /> },
  { id: 'beamSlab', label: 'الجوائز والبلاطات', dataKey: 'beam_slab', icon: <Palette className="h-4 w-4" /> },
  { id: 'electricalReport', label: 'التقرير الكهربائي', dataKey: 'electrical', icon: <PlugZap className="h-4 w-4" /> },
  { id: 'plumbingReport', label: 'التقرير الصحي', dataKey: 'plumbing', icon: <Pipette className="h-4 w-4" /> },
  { id: 'technicalNotes', label: 'الملاحظات الفنية', dataKey: 'technical_notes', icon: <ClipboardList className="h-4 w-4" /> },
  { id: 'finalReport', label: 'التقرير الفني النهائي', dataKey: 'final_report', icon: <FileText className="h-4 w-4" /> },
];

// ======== Component ========
export default function GenerateReports({ projectData }: GenerateReportsProps) {
  const { isRTL } = useTranslation();
  const {
    reportPreferences,
    setReportPreferences,
  } = useProjectStore();

  const [companyName, setCompanyName] = useState(reportPreferences.companyName);
  const [reportHeader, setReportHeader] = useState(reportPreferences.reportHeader);
  const [reportFooter, setReportFooter] = useState(reportPreferences.reportFooter);
  const [selectedSections, setSelectedSections] = useState<string[]>(reportPreferences.selectedSections);

  // Auto-save preferences on change
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setReportPreferences({
        companyName,
        reportHeader,
        reportFooter,
        selectedSections,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [companyName, reportHeader, reportFooter, selectedSections, setReportPreferences]);

  // Toggle section selection
  const toggleSection = useCallback((sectionId: string) => {
    setSelectedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((s) => s !== sectionId)
        : [...prev, sectionId]
    );
  }, []);

  // Select all / deselect all
  const selectAll = useCallback(() => {
    setSelectedSections(SECTION_OPTIONS.map((s) => s.id));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedSections([]);
  }, []);

  // Check if section has data
  const hasDataForSection = useCallback(
    (dataKey: string): boolean => {
      const sectionData = projectData[dataKey];
      if (!sectionData) return false;
      return Object.keys(sectionData).length > 0;
    },
    [projectData]
  );

  // Print preview
  const handlePrintPreview = useCallback(() => {
    if (selectedSections.length === 0) {
      toast.error('يرجى اختيار قسم واحد على الأقل');
      return;
    }
    window.print();
  }, [selectedSections]);

  // Download PDF (placeholder using window.print)
  const handleDownloadPDF = useCallback(() => {
    if (selectedSections.length === 0) {
      toast.error('يرجى اختيار قسم واحد على الأقل');
      return;
    }
    // Placeholder: use window.print() as PDF generation method
    // TODO: implement with @react-pdf/renderer
    toast.info('يتم إنشاء ملف PDF... (استخدام معاينة الطباعة مؤقتاً)');
    setTimeout(() => {
      window.print();
    }, 500);
  }, [selectedSections]);

  const labelClass = 'text-sm font-medium text-foreground/80';
  const helperClass = 'text-xs text-muted-foreground';

  return (
    <div className="space-y-6">
      {/* ===== Section 1: تفضيلات المستخدم ===== */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Settings2 className="h-5 w-5" />
            </div>
            <span>توليد التقارير</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* اسم المكتب/الشركة */}
          <div className="space-y-2">
            <Label className={labelClass}>اسم المكتب / الشركة</Label>
            <p className={helperClass}>سيظهر في ترويسة التقرير المطبوع</p>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="مثال: مكتب هندسة الإنشائية — دمشق"
              className="w-full"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          {/* ترويسة التقرير */}
          <div className="space-y-2">
            <Label className={labelClass}>ترويسة التقرير النهائي</Label>
            <p className={helperClass}>نص يظهر في أعلى كل صفحة من التقرير</p>
            <Textarea
              value={reportHeader}
              onChange={(e) => setReportHeader(e.target.value)}
              placeholder="أدخل نص الترويسة هنا...&#10;مثال: تقرير تقييم فني شامل للمنشأة المذكورة أدناه"
              className="min-h-[100px] resize-y"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          {/* تذييل التقرير */}
          <div className="space-y-2">
            <Label className={labelClass}>تذييل / نهاية التقرير</Label>
            <p className={helperClass}>نص يظهر في نهاية التقرير</p>
            <Textarea
              value={reportFooter}
              onChange={(e) => setReportFooter(e.target.value)}
              placeholder="أدخل نص التذييل هنا...&#10;مثال: تم إعداد هذا التقرير وفقاً للكود العربي السوري 2024"
              className="min-h-[80px] resize-y"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>
        </CardContent>
      </Card>

      {/* ===== Section 2: اختيار الواجهات ===== */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <ListChecks className="h-5 w-5" />
            </div>
            <span>اختيار الواجهات</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Select All / Deselect All */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              اختر الأقسام المراد تضمينها في التقرير
              <span className="ms-2 font-medium text-foreground">
                ({selectedSections.length}/{SECTION_OPTIONS.length})
              </span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                onClick={selectAll}
              >
                تحديد الكل
              </Button>
              <Separator orientation="vertical" className="h-4" />
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={deselectAll}
              >
                إلغاء الكل
              </Button>
            </div>
          </div>

          {/* Section Checkboxes */}
          <div className="space-y-1">
            {SECTION_OPTIONS.map((section) => {
              const isChecked = selectedSections.includes(section.id);
              const hasData = hasDataForSection(section.dataKey);

              return (
                <label
                  key={section.id}
                  htmlFor={`section-${section.id}`}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-150 border ${
                    isChecked
                      ? 'bg-emerald-50 dark:bg-emerald-900/15 border-emerald-200 dark:border-emerald-800'
                      : 'hover:bg-muted/50 border-transparent'
                  }`}
                >
                  <Checkbox
                    id={`section-${section.id}`}
                    checked={isChecked}
                    onCheckedChange={() => toggleSection(section.id)}
                    className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  />
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        isChecked
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {section.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isChecked ? 'text-foreground' : 'text-foreground/70'}`}>
                        {section.label}
                      </p>
                    </div>
                    {!hasData && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                        لا توجد بيانات
                      </span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ===== Section 3: إجراءات ===== */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-700 to-teal-700 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <FileOutput className="h-5 w-5" />
            </div>
            <span>إجراءات</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* معاينة قبل الطباعة */}
            <Button
              onClick={handlePrintPreview}
              disabled={selectedSections.length === 0}
              className="h-auto py-4 flex flex-col items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:shadow-none"
            >
              <Eye className="h-6 w-6" />
              <span className="text-sm font-medium">معاينة قبل الطباعة</span>
              <span className="text-[10px] opacity-80">فتح نافذة معاينة الطباعة</span>
            </Button>

            {/* تحميل ملف PDF */}
            <Button
              onClick={handleDownloadPDF}
              disabled={selectedSections.length === 0}
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-50 transition-all duration-200"
            >
              <FileDown className="h-6 w-6" />
              <span className="text-sm font-medium">تحميل ملف PDF</span>
              <span className="text-[10px] text-muted-foreground">إنشاء وتحميل ملف PDF</span>
            </Button>
          </div>

          {selectedSections.length === 0 && (
            <p className="text-center text-sm text-muted-foreground mt-3">
              يرجى اختيار قسم واحد على الأقل من الأقسام أعلاه
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
