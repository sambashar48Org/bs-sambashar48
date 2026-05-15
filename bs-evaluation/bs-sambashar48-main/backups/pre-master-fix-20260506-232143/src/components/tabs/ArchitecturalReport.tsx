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
import { Plus, Trash2 } from 'lucide-react';

interface ArchitecturalReportProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
}

interface FloorEntry {
  id: string;
  floorNumber: string;
  usageType: string;
  floorArea: string;
  floorCondition: string;
  wallCondition: string;
  windowCondition: string;
  doorCondition: string;
  notes: string;
}

const defaultFloorEntry = (): FloorEntry => ({
  id: crypto.randomUUID(),
  floorNumber: '',
  usageType: '',
  floorArea: '',
  floorCondition: '',
  wallCondition: '',
  windowCondition: '',
  doorCondition: '',
  notes: '',
});

const conditionOptions = [
  { value: 'جيد', label: 'جيد' },
  { value: 'متوسط', label: 'متوسط' },
  { value: 'سيء', label: 'سيء' },
];

const usageTypeOptions = [
  { value: 'سكني', label: 'سكني' },
  { value: 'تجاري', label: 'تجاري' },
  { value: 'مكتبي', label: 'مكتبي' },
  { value: 'تخزين', label: 'تخزين' },
  { value: 'مواقف', label: 'مواقف' },
  { value: 'خدمات', label: 'خدمات' },
  { value: 'أخرى', label: 'أخرى' },
];

export default function ArchitecturalReport({ data, onSave }: ArchitecturalReportProps) {
  const { isRTL } = useTranslation();

  const [generalAssessment, setGeneralAssessment] = useState(
    () => (data.generalAssessment ? String(data.generalAssessment) : '')
  );
  const [recommendations, setRecommendations] = useState(
    () => (data.recommendations ? String(data.recommendations) : '')
  );
  const [floors, setFloors] = useState<FloorEntry[]>(() =>
    data.floors && Array.isArray(data.floors)
      ? (data.floors as FloorEntry[])
      : [defaultFloorEntry()]
  );

  // Sync state when data prop changes (e.g., project switch)
  const [prevData, setPrevData] = useState(data);
  if (prevData !== data) {
    setPrevData(data);
    setGeneralAssessment(data.generalAssessment ? String(data.generalAssessment) : '');
    setRecommendations(data.recommendations ? String(data.recommendations) : '');
    setFloors(
      data.floors && Array.isArray(data.floors)
        ? (data.floors as FloorEntry[])
        : [defaultFloorEntry()]
    );
  }

  // Auto-save on blur
  const handleBlur = useCallback(() => {
    onSave({
      generalAssessment,
      recommendations,
      floors,
    });
  }, [generalAssessment, recommendations, floors, onSave]);

  const addFloor = () => {
    setFloors((prev) => [...prev, defaultFloorEntry()]);
  };

  const removeFloor = (id: string) => {
    if (floors.length <= 1) return;
    setFloors((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFloor = (id: string, field: keyof FloorEntry, value: string) => {
    setFloors((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const handleSave = () => {
    onSave({
      generalAssessment,
      recommendations,
      floors,
    });
  };

  const selectField = (
    label: string,
    value: string,
    onChange: (val: string) => void,
    options: { value: string; label: string }[],
    placeholder?: string
  ) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground/70">{label}</Label>
      <Select value={value} onValueChange={onChange}>
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

  return (
    <div className="space-y-6">
      {/* General Assessment */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <span>التقرير المعماري</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium text-foreground/80 mb-2 block">
                التقييم العام
              </Label>
              <Textarea
                value={generalAssessment}
                onChange={(e) => setGeneralAssessment(e.target.value)}
                onBlur={handleBlur}
                placeholder="أدخل التقييم العام للحالة المعمارية..."
                className="min-h-[100px] resize-y"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Floor Entries */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
              </div>
              <span>بيانات الطوابق</span>
            </CardTitle>
            <Button
              onClick={addFloor}
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm transition-all"
            >
              <Plus className="h-4 w-4 me-1" />
              إضافة طابق
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-5">
            {floors.map((floor, index) => (
              <div
                key={floor.id}
                className="border border-border/60 rounded-xl p-4 bg-muted/30 space-y-4"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    الطابق {index + 1}
                  </span>
                  {floors.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeFloor(floor.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/70">رقم الطابق</Label>
                    <Input
                      type="number"
                      value={floor.floorNumber}
                      onChange={(e) => updateFloor(floor.id, 'floorNumber', e.target.value)}
                      onBlur={handleBlur}
                      placeholder="رقم"
                      className="w-full"
                      dir="ltr"
                    />
                  </div>

                  {selectField(
                    'نوع الاستخدام',
                    floor.usageType,
                    (val) => updateFloor(floor.id, 'usageType', val),
                    usageTypeOptions
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/70">مساحة الطابق (م²)</Label>
                    <Input
                      type="number"
                      value={floor.floorArea}
                      onChange={(e) => updateFloor(floor.id, 'floorArea', e.target.value)}
                      onBlur={handleBlur}
                      placeholder="المساحة"
                      className="w-full"
                      dir="ltr"
                    />
                  </div>

                  {selectField(
                    'حالة الأرضية',
                    floor.floorCondition,
                    (val) => updateFloor(floor.id, 'floorCondition', val),
                    conditionOptions
                  )}

                  {selectField(
                    'حالة الجدران',
                    floor.wallCondition,
                    (val) => updateFloor(floor.id, 'wallCondition', val),
                    conditionOptions
                  )}

                  {selectField(
                    'حالة النوافذ',
                    floor.windowCondition,
                    (val) => updateFloor(floor.id, 'windowCondition', val),
                    conditionOptions
                  )}

                  {selectField(
                    'حالة الأبواب',
                    floor.doorCondition,
                    (val) => updateFloor(floor.id, 'doorCondition', val),
                    conditionOptions
                  )}

                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                    <Label className="text-xs font-medium text-foreground/70">ملاحظات</Label>
                    <Input
                      type="text"
                      value={floor.notes}
                      onChange={(e) => updateFloor(floor.id, 'notes', e.target.value)}
                      onBlur={handleBlur}
                      placeholder="ملاحظات إضافية..."
                      className="w-full"
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </div>
            <span>التوصيات العامة</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Textarea
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            onBlur={handleBlur}
            placeholder="أدخل التوصيات المعمارية..."
            className="min-h-[100px] resize-y"
            dir={isRTL ? 'rtl' : 'ltr'}
          />

          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-8"
            >
              حفظ التقرير المعماري
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
