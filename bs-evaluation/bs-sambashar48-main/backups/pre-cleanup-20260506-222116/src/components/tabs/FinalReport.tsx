'use client';

import React, { useState, useCallback } from 'react';
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
import { FileText } from 'lucide-react';

interface FinalReportProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
}

const defaultFormData: Record<string, string> = {
  overallEvaluation: '',
  resultsSummary: '',
  structuralRecommendations: '',
  architecturalRecommendations: '',
  priorities: '',
  estimatedCost: '',
  estimatedDuration: '',
  finalNotes: '',
  signature: '',
  date: new Date().toISOString().split('T')[0],
};

const evaluationOptions = [
  { value: 'آمن', label: 'آمن' },
  { value: 'يحتاج مراقبة', label: 'يحتاج مراقبة' },
  { value: 'يحتاج ترميم', label: 'يحتاج ترميم' },
  { value: 'غير آمن', label: 'غير آمن' },
  { value: 'خطر', label: 'خطر' },
];

function computeInitialData(data: Record<string, unknown>): Record<string, string> {
  const initial: Record<string, string> = {};
  Object.keys(defaultFormData).forEach((key) => {
    initial[key] = defaultFormData[key];
  });
  Object.keys(defaultFormData).forEach((key) => {
    if (data[key] !== undefined && data[key] !== null) {
      initial[key] = String(data[key]);
    }
  });
  if (!initial.date) {
    initial.date = new Date().toISOString().split('T')[0];
  }
  return initial;
}

export default function FinalReport({ data, onSave }: FinalReportProps) {
  const { isRTL } = useTranslation();

  const [formData, setFormData] = useState<Record<string, string>>(() =>
    computeInitialData(data)
  );

  // Sync state when data prop changes (e.g., project switch)
  const [prevData, setPrevData] = useState(data);
  if (prevData !== data) {
    setPrevData(data);
    setFormData(computeInitialData(data));
  }

  // Auto-save on blur
  const handleBlur = useCallback(() => {
    onSave(formData);
  }, [formData, onSave]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  const evaluationColor = (value: string): string => {
    switch (value) {
      case 'آمن':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'يحتاج مراقبة':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300';
      case 'يحتاج ترميم':
        return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300';
      case 'غير آمن':
        return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300';
      case 'خطر':
        return 'bg-red-200 text-red-900 border-red-400 dark:bg-red-900/50 dark:text-red-200';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Evaluation */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <FileText className="h-5 w-5" />
            </div>
            <span>التقرير النهائي</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Overall Evaluation Select */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              التقييم العام
            </Label>
            <Select
              value={formData.overallEvaluation || ''}
              onValueChange={(val) => handleChange('overallEvaluation', val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="اختر التقييم العام" />
              </SelectTrigger>
              <SelectContent>
                {evaluationOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.overallEvaluation && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">حالة التقييم:</span>
                <span className={`text-xs px-3 py-1 rounded-full border ${evaluationColor(formData.overallEvaluation)}`}>
                  {formData.overallEvaluation}
                </span>
              </div>
            )}
          </div>

          {/* Results Summary */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              ملخص النتائج
            </Label>
            <Textarea
              value={formData.resultsSummary || ''}
              onChange={(e) => handleChange('resultsSummary', e.target.value)}
              onBlur={handleBlur}
              placeholder="أدخل ملخصاً شاملاً لنتائج التقييم..."
              className="min-h-[160px] resize-y"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          {/* Structural Recommendations */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              التوصيات الإنشائية
            </Label>
            <Textarea
              value={formData.structuralRecommendations || ''}
              onChange={(e) => handleChange('structuralRecommendations', e.target.value)}
              onBlur={handleBlur}
              placeholder="أدخل التوصيات الإنشائية..."
              className="min-h-[120px] resize-y"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          {/* Architectural Recommendations */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              التوصيات المعمارية
            </Label>
            <Textarea
              value={formData.architecturalRecommendations || ''}
              onChange={(e) => handleChange('architecturalRecommendations', e.target.value)}
              onBlur={handleBlur}
              placeholder="أدخل التوصيات المعمارية..."
              className="min-h-[120px] resize-y"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          {/* Priorities */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              الأولويات
            </Label>
            <Textarea
              value={formData.priorities || ''}
              onChange={(e) => handleChange('priorities', e.target.value)}
              onBlur={handleBlur}
              placeholder="حدد الأولويات حسب الأهمية..."
              className="min-h-[100px] resize-y"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          {/* Estimated Cost and Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                التقدير المالي التقريبي
              </Label>
              <Input
                type="text"
                value={formData.estimatedCost || ''}
                onChange={(e) => handleChange('estimatedCost', e.target.value)}
                onBlur={handleBlur}
                placeholder="أدخل التقدير المالي التقريبي..."
                className="w-full"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                المدة التقريبية للتنفيذ
              </Label>
              <Input
                type="text"
                value={formData.estimatedDuration || ''}
                onChange={(e) => handleChange('estimatedDuration', e.target.value)}
                onBlur={handleBlur}
                placeholder="أدخل المدة التقريبية للتنفيذ..."
                className="w-full"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
          </div>

          {/* Final Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              ملاحظات ختامية
            </Label>
            <Textarea
              value={formData.finalNotes || ''}
              onChange={(e) => handleChange('finalNotes', e.target.value)}
              onBlur={handleBlur}
              placeholder="أدخل أي ملاحظات ختامية..."
              className="min-h-[100px] resize-y"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Signature Card */}
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
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
            </div>
            <span>التوقيع والاعتماد</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                التوقيع (اسم المهندس)
              </Label>
              <Input
                type="text"
                value={formData.signature || ''}
                onChange={(e) => handleChange('signature', e.target.value)}
                onBlur={handleBlur}
                placeholder="أدخل اسم المهندس المسؤول..."
                className="w-full"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                التاريخ
              </Label>
              <Input
                type="date"
                value={formData.date || ''}
                onChange={(e) => handleChange('date', e.target.value)}
                onBlur={handleBlur}
                className="w-full"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-8"
            >
              حفظ التقرير النهائي
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
