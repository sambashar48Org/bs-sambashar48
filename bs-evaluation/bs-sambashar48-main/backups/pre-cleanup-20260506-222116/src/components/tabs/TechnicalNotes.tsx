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
import { ClipboardCheck, Plus, Trash2 } from 'lucide-react';

interface TechnicalNotesProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
}

interface ObservationEntry {
  id: string;
  number: string;
  location: string;
  description: string;
  severity: string;
  priority: string;
  photos: string;
  additionalNotes: string;
}

const defaultObservationEntry = (index: number): ObservationEntry => ({
  id: crypto.randomUUID(),
  number: String(index + 1),
  location: '',
  description: '',
  severity: '',
  priority: '',
  photos: '',
  additionalNotes: '',
});

const severityOptions = [
  { value: 'جيد', label: 'جيد' },
  { value: 'متوسط', label: 'متوسط' },
  { value: 'سيء', label: 'سيء' },
  { value: 'حرج', label: 'حرج' },
];

const priorityOptions = [
  { value: 'عالية', label: 'عالية' },
  { value: 'متوسطة', label: 'متوسطة' },
  { value: 'منخفضة', label: 'منخفضة' },
];

export default function TechnicalNotes({ data, onSave }: TechnicalNotesProps) {
  const { isRTL } = useTranslation();

  const [observations, setObservations] = useState<ObservationEntry[]>(() => {
    if (data.observations && Array.isArray(data.observations)) {
      return (data.observations as ObservationEntry[]).map((obs, i) => ({
        ...obs,
        number: obs.number || String(i + 1),
      }));
    }
    return [defaultObservationEntry(0)];
  });

  const [overallAssessment, setOverallAssessment] = useState(
    () => (data.overallAssessment ? String(data.overallAssessment) : '')
  );
  const [technicalRecommendations, setTechnicalRecommendations] = useState(
    () => (data.technicalRecommendations ? String(data.technicalRecommendations) : '')
  );

  // Sync state when data prop changes (e.g., project switch)
  const [prevData, setPrevData] = useState(data);
  if (prevData !== data) {
    setPrevData(data);
    if (data.observations && Array.isArray(data.observations)) {
      setObservations(
        (data.observations as ObservationEntry[]).map((obs, i) => ({
          ...obs,
          number: obs.number || String(i + 1),
        }))
      );
    } else {
      setObservations([defaultObservationEntry(0)]);
    }
    setOverallAssessment(data.overallAssessment ? String(data.overallAssessment) : '');
    setTechnicalRecommendations(
      data.technicalRecommendations ? String(data.technicalRecommendations) : ''
    );
  }

  // Auto-save on blur
  const handleBlur = useCallback(() => {
    onSave({
      observations,
      overallAssessment,
      technicalRecommendations,
    });
  }, [observations, overallAssessment, technicalRecommendations, onSave]);

  const addObservation = () => {
    setObservations((prev) => [
      ...prev,
      defaultObservationEntry(prev.length),
    ]);
  };

  const removeObservation = (id: string) => {
    if (observations.length <= 1) return;
    setObservations((prev) => {
      const filtered = prev.filter((obs) => obs.id !== id);
      return filtered.map((obs, i) => ({ ...obs, number: String(i + 1) }));
    });
  };

  const updateObservation = (
    id: string,
    field: keyof ObservationEntry,
    value: string
  ) => {
    setObservations((prev) =>
      prev.map((obs) => (obs.id === id ? { ...obs, [field]: value } : obs))
    );
  };

  const handleSave = () => {
    onSave({
      observations,
      overallAssessment,
      technicalRecommendations,
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
      {/* Observations List */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <span>الملاحظات الفنية</span>
            </CardTitle>
            <Button
              onClick={addObservation}
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm transition-all"
            >
              <Plus className="h-4 w-4 me-1" />
              إضافة ملاحظة
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-5">
            {observations.map((obs, index) => (
              <div
                key={obs.id}
                className="border border-border/60 rounded-xl p-4 bg-muted/30 space-y-4"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    ملاحظة رقم {index + 1}
                  </span>
                  {observations.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeObservation(obs.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectField(
                    'الحالة',
                    obs.severity,
                    (val) => updateObservation(obs.id, 'severity', val),
                    severityOptions
                  )}

                  {selectField(
                    'الأولوية',
                    obs.priority,
                    (val) => updateObservation(obs.id, 'priority', val),
                    priorityOptions
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/70">
                      الموقع
                    </Label>
                    <Input
                      type="text"
                      value={obs.location}
                      onChange={(e) =>
                        updateObservation(obs.id, 'location', e.target.value)
                      }
                      onBlur={handleBlur}
                      placeholder="حدد موقع الملاحظة..."
                      className="w-full"
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                    <Label className="text-xs font-medium text-foreground/70">
                      الوصف
                    </Label>
                    <Textarea
                      value={obs.description}
                      onChange={(e) =>
                        updateObservation(obs.id, 'description', e.target.value)
                      }
                      onBlur={handleBlur}
                      placeholder="صف الملاحظة بالتفصيل..."
                      className="min-h-[80px] resize-y"
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium text-foreground/70">
                      الصور الملتقطة
                    </Label>
                    <Input
                      type="text"
                      value={obs.photos}
                      onChange={(e) =>
                        updateObservation(obs.id, 'photos', e.target.value)
                      }
                      onBlur={handleBlur}
                      placeholder="وصف الصور الملتقطة للملاحظة..."
                      className="w-full"
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/70">
                      ملاحظات إضافية
                    </Label>
                    <Input
                      type="text"
                      value={obs.additionalNotes}
                      onChange={(e) =>
                        updateObservation(obs.id, 'additionalNotes', e.target.value)
                      }
                      onBlur={handleBlur}
                      placeholder="أي ملاحظات إضافية..."
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

      {/* Assessment & Recommendations */}
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
            <span>التقييم والتوصيات</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              تقييم عام
            </Label>
            <Textarea
              value={overallAssessment}
              onChange={(e) => setOverallAssessment(e.target.value)}
              onBlur={handleBlur}
              placeholder="أدخل التقييم العام للملاحظات الفنية..."
              className="min-h-[100px] resize-y"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              توصيات فنية
            </Label>
            <Textarea
              value={technicalRecommendations}
              onChange={(e) => setTechnicalRecommendations(e.target.value)}
              onBlur={handleBlur}
              placeholder="أدخل التوصيات الفنية..."
              className="min-h-[100px] resize-y"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-8"
            >
              حفظ الملاحظات الفنية
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
