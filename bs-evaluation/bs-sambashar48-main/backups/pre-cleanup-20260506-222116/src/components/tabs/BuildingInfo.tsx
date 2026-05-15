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
import { Building2 } from 'lucide-react';

interface BuildingInfoProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
}

const defaultFormData: Record<string, string> = {
  buildingName: '',
  buildingLocation: '',
  buildingType: '',
  buildingUsage: '',
  numberOfFloors: '',
  buildingAge: '',
  totalArea: '',
  structuralSystem: '',
  contractor: '',
  designer: '',
  yearBuilt: '',
  evaluationDate: new Date().toISOString().split('T')[0],
  evaluationPurpose: '',
  generalNotes: '',
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
  if (!initial.evaluationDate) {
    initial.evaluationDate = new Date().toISOString().split('T')[0];
  }
  return initial;
}

export default function BuildingInfo({ data, onSave }: BuildingInfoProps) {
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
          <SelectValue placeholder={placeholder || `اختر ${label}`} />
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

  const inputField = (
    label: string,
    field: string,
    type: string = 'text',
    placeholder?: string
  ) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground/80">{label}</Label>
      <Input
        type={type}
        value={formData[field] || ''}
        onChange={(e) => handleChange(field, e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="w-full"
        dir={type === 'text' || type === 'date' ? (isRTL ? 'rtl' : 'ltr') : 'ltr'}
      />
    </div>
  );

  return (
    <div className="space-y-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {inputField('اسم المنشأة', 'buildingName', 'text', 'أدخل اسم المنشأة')}
            {inputField('موقع المنشأة', 'buildingLocation', 'text', 'أدخل موقع المنشأة')}

            {selectField('نوع المنشأة', 'buildingType', [
              { value: 'سكني', label: 'سكني' },
              { value: 'تجاري', label: 'تجاري' },
              { value: 'صناعي', label: 'صناعي' },
              { value: 'تعليمي', label: 'تعليمي' },
              { value: 'صحي', label: 'صحي' },
              { value: 'أخرى', label: 'أخرى' },
            ])}

            {inputField('استخدام المنشأة', 'buildingUsage', 'text', 'أدخل استخدام المنشأة')}
            {inputField('عدد الطوابق', 'numberOfFloors', 'number', '0')}
            {inputField('عمر المبنى', 'buildingAge', 'number', 'سنوات')}
            {inputField('المساحة الكلية', 'totalArea', 'number', 'م²')}
            {inputField('سنة البناء', 'yearBuilt', 'number', 'مثال: 2010')}
            {inputField('المقاول', 'contractor', 'text', 'اسم المقاول')}
            {inputField('المصمم', 'designer', 'text', 'اسم المصمم')}

            {selectField('النظام الإنشائي', 'structuralSystem', [
              { value: 'هيكلي', label: 'هيكلي' },
              { value: 'إطاري', label: 'إطاري' },
              { value: 'جدران حاملة', label: 'جدران حاملة' },
              { value: 'مختلط', label: 'مختلط' },
            ])}

            {inputField('تاريخ التقييم', 'evaluationDate', 'date')}

            {selectField('غاية التقييم', 'evaluationPurpose', [
              { value: 'بيع', label: 'بيع' },
              { value: 'شراء', label: 'شراء' },
              { value: 'ترميم', label: 'ترميم' },
              { value: 'توسيع', label: 'توسيع' },
              { value: 'تقييم هيكلي', label: 'تقييم هيكلي' },
              { value: 'أخرى', label: 'أخرى' },
            ])}
          </div>

          <div className="mt-6">
            <Label className="text-sm font-medium text-foreground/80">ملاحظات عامة</Label>
            <Textarea
              value={formData.generalNotes || ''}
              onChange={(e) => handleChange('generalNotes', e.target.value)}
              onBlur={handleBlur}
              placeholder="أدخل أي ملاحظات عامة..."
              className="mt-2 min-h-[100px] resize-y"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-8"
            >
              حفظ البيانات
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
