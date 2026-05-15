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

interface StructuralReportProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
}

const defaultFormData: Record<string, string> = {
  structuralSystemType: '',
  defaultConcreteStrength: '250',
  steelYieldStress: '4200',
  steelType: '400/600',
  concreteVisualCondition: '',
  rebarVisualCondition: '',
  hasCracks: '',
  crackDescription: '',
  hasWaterLeakage: '',
  leakageDescription: '',
  rebarCorrosion: '',
  excavationEffect: '',
  generalAssessment: '',
  recommendations: '',
};

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
  return initial;
}

export default function StructuralReport({ data, onSave }: StructuralReportProps) {
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
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-update steel yield stress when steel type changes
      if (field === 'steelType') {
        if (value === '240/350') {
          updated.steelYieldStress = '2400';
        } else if (value === '400/600') {
          updated.steelYieldStress = '4200';
        }
      }
      return updated;
    });
  };

  const handleSave = () => {
    onSave(formData);
  };

  const selectField = (
    label: string,
    field: string,
    options: { value: string; label: string }[],
    placeholder?: string
  ) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground/80">{label}</Label>
      <Select
        value={formData[field] || ''}
        onValueChange={(val) => handleChange(field, val)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder || `اختر`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const numberField = (label: string, field: string, unit: string) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground/80">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          value={formData[field] || ''}
          onChange={(e) => handleChange(field, e.target.value)}
          onBlur={handleBlur}
          placeholder="0"
          className="w-full pe-16"
          dir="ltr"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {unit}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Structural System & Material Properties */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <FileText className="h-5 w-5" />
            </div>
            <span>التقرير الإنشائي</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {selectField('النظام الإنشائي', 'structuralSystemType', [
              { value: 'إطاري', label: 'إطاري' },
              { value: 'هيكلي', label: 'هيكلي' },
              { value: 'جدران حاملة', label: 'جدران حاملة' },
              { value: 'مختلط', label: 'مختلط' },
            ])}

            {numberField('المقاومة الأسطوانية الافتراضية', 'defaultConcreteStrength', 'kg/cm²')}

            {selectField('نوع الحديد', 'steelType', [
              { value: '240/350', label: '240/350' },
              { value: '400/600', label: '400/600' },
            ])}

            {numberField('إجهاد خضوع الحديد', 'steelYieldStress', 'kg/cm²')}
          </div>
        </CardContent>
      </Card>

      {/* Visual Conditions */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <span>الحالة الظاهرية</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {selectField('حالة البيتون الظاهرية', 'concreteVisualCondition', [
              { value: 'جيد', label: 'جيد' },
              { value: 'متوسط', label: 'متوسط' },
              { value: 'سيء', label: 'سيء' },
              { value: 'حرج', label: 'حرج' },
            ])}

            {selectField('حالة التسليح الظاهرية', 'rebarVisualCondition', [
              { value: 'جيد', label: 'جيد' },
              { value: 'متوسط', label: 'متوسط' },
              { value: 'سيء', label: 'سيء' },
              { value: 'حرج', label: 'حرج' },
            ])}

            {selectField('تآكل الحديد', 'rebarCorrosion', [
              { value: 'لا يوجد', label: 'لا يوجد' },
              { value: 'خفيف', label: 'خفيف' },
              { value: 'متوسط', label: 'متوسط' },
              { value: 'شديد', label: 'شديد' },
            ])}

            {selectField('تأثير النبش', 'excavationEffect', [
              { value: 'لا يوجد', label: 'لا يوجد' },
              { value: 'قريب', label: 'قريب' },
              { value: 'متوسط', label: 'متوسط' },
              { value: 'بعيد', label: 'بعيد' },
            ])}
          </div>

          {/* Cracks & Leakage Section */}
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {selectField('وجود تشققات', 'hasCracks', [
                { value: 'نعم', label: 'نعم' },
                { value: 'لا', label: 'لا' },
              ])}

              {selectField('وجود تسربات مياه', 'hasWaterLeakage', [
                { value: 'نعم', label: 'نعم' },
                { value: 'لا', label: 'لا' },
              ])}
            </div>

            {formData.hasCracks === 'نعم' && (
              <div className="space-y-2 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                <Label className="text-sm font-medium text-foreground/80">وصف التشققات</Label>
                <Textarea
                  value={formData.crackDescription || ''}
                  onChange={(e) => handleChange('crackDescription', e.target.value)}
                  onBlur={handleBlur}
                  placeholder="صف التشققات الموجودة (الموقع، الاتجاه، العرض، الطول)..."
                  className="min-h-[80px] resize-y"
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
            )}

            {formData.hasWaterLeakage === 'نعم' && (
              <div className="space-y-2 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                <Label className="text-sm font-medium text-foreground/80">وصف التسربات</Label>
                <Textarea
                  value={formData.leakageDescription || ''}
                  onChange={(e) => handleChange('leakageDescription', e.target.value)}
                  onBlur={handleBlur}
                  placeholder="صف التسربات المائية الموجودة (الموقع، الشدة، المصدر)..."
                  className="min-h-[80px] resize-y"
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assessment & Recommendations */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </div>
            <span>التقييم والتوصيات</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">التقييم العام</Label>
            <Textarea
              value={formData.generalAssessment || ''}
              onChange={(e) => handleChange('generalAssessment', e.target.value)}
              onBlur={handleBlur}
              placeholder="أدخل التقييم العام للحالة الإنشائية..."
              className="min-h-[100px] resize-y"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">التوصيات</Label>
            <Textarea
              value={formData.recommendations || ''}
              onChange={(e) => handleChange('recommendations', e.target.value)}
              onBlur={handleBlur}
              placeholder="أدخل التوصيات الإنشائية..."
              className="min-h-[100px] resize-y"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-8"
            >
              حفظ التقرير الإنشائي
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
