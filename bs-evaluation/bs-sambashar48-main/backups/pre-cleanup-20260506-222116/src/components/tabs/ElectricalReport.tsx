'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Zap } from 'lucide-react';

interface ElectricalReportProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
}

const defaultFormData: Record<string, string> = {
  wiringCondition: '',
  wiringType: '',
  mainPanelCondition: '',
  motorsCondition: '',
  groundingSystem: '',
  protectionSystem: '',
  lightingCondition: '',
  generalNotes: '',
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

export default function ElectricalReport({ data, onSave }: ElectricalReportProps) {
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
          <SelectValue placeholder={placeholder || 'اختر'} />
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

  return (
    <div className="space-y-6">
      {/* Electrical Wiring & Installation */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Zap className="h-5 w-5" />
            </div>
            <span>التقرير الكهربائي</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {selectField('حالة التمديدات الكهربائية', 'wiringCondition', [
              { value: 'جيد', label: 'جيد' },
              { value: 'متوسط', label: 'متوسط' },
              { value: 'سيء', label: 'سيء' },
              { value: 'حرج', label: 'حرج' },
            ])}

            {selectField('نوع التمديدات', 'wiringType', [
              { value: 'مواسير', label: 'مواسير' },
              { value: 'حوض', label: 'حوض' },
              { value: 'مسطح', label: 'مسطح' },
            ])}

            {selectField('حالة اللوحة الرئيسية', 'mainPanelCondition', [
              { value: 'جيد', label: 'جيد' },
              { value: 'متوسط', label: 'متوسط' },
              { value: 'سيء', label: 'سيء' },
            ])}

            {selectField('حالة المحركات والمضخات', 'motorsCondition', [
              { value: 'جيد', label: 'جيد' },
              { value: 'متوسط', label: 'متوسط' },
              { value: 'سيء', label: 'سيء' },
              { value: 'غير موجود', label: 'غير موجود' },
            ])}

            {selectField('نظام التأريض', 'groundingSystem', [
              { value: 'موجود', label: 'موجود' },
              { value: 'غير موجود', label: 'غير موجود' },
              { value: 'غير كاف', label: 'غير كاف' },
            ])}

            {selectField('نظام الحماية', 'protectionSystem', [
              { value: 'قاطع تلقائي', label: 'قاطع تلقائي' },
              { value: 'منصهر', label: 'منصهر' },
              { value: 'لا يوجد', label: 'لا يوجد' },
            ])}

            {selectField('حالة الإضاءة', 'lightingCondition', [
              { value: 'جيد', label: 'جيد' },
              { value: 'متوسط', label: 'متوسط' },
              { value: 'سيء', label: 'سيء' },
            ])}
          </div>
        </CardContent>
      </Card>

      {/* Notes & Recommendations */}
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
            <span>ملاحظات وتوصيات</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              ملاحظات عامة
            </Label>
            <Textarea
              value={formData.generalNotes || ''}
              onChange={(e) => handleChange('generalNotes', e.target.value)}
              onBlur={handleBlur}
              placeholder="أدخل الملاحظات العامة حول النظام الكهربائي..."
              className="min-h-[100px] resize-y"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              توصيات
            </Label>
            <Textarea
              value={formData.recommendations || ''}
              onChange={(e) => handleChange('recommendations', e.target.value)}
              onBlur={handleBlur}
              placeholder="أدخل التوصيات الكهربائية..."
              className="min-h-[100px] resize-y"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-8"
            >
              حفظ التقرير الكهربائي
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
