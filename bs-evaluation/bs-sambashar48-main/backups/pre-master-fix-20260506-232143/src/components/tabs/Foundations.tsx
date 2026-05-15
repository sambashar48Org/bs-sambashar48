'use client';

import React, { useState, useCallback, useMemo } from 'react';
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
import { Layers, Plus, Trash2, Save, CheckCircle, XCircle, Calculator } from 'lucide-react';

interface FoundationEntry {
  id: string;
  foundationName: string;
  foundationLength: string;
  foundationWidth: string;
  totalLoad: string;
  notes: string;
}

interface FoundationsProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
}

const createEntry = (): FoundationEntry => ({
  id: crypto.randomUUID(),
  foundationName: '',
  foundationLength: '',
  foundationWidth: '',
  totalLoad: '',
  notes: '',
});

function computeArea(length: number, width: number): number {
  return length * width;
}

function computeActualStress(totalLoad: number, area: number): number {
  if (area === 0) return 0;
  return (totalLoad * 1000) / area;
}

export default function Foundations({ data, onSave }: FoundationsProps) {
  const [foundationType, setFoundationType] = useState<string>(
    (data.foundationType as string) || ''
  );
  const [soilAllowableStress, setSoilAllowableStress] = useState<string>(
    (data.soilAllowableStress as string) || ''
  );
  const [entries, setEntries] = useState<FoundationEntry[]>(() => {
    if (Array.isArray(data.entries)) {
      return (data.entries as FoundationEntry[]).map((e) => ({
        ...e,
        id: e.id || crypto.randomUUID(),
      }));
    }
    return [createEntry()];
  });

  // Sync state when data prop changes (project switch)
  const [prevData, setPrevData] = useState(data);
  if (prevData !== data) {
    setPrevData(data);
    setFoundationType((data.foundationType as string) || '');
    setSoilAllowableStress((data.soilAllowableStress as string) || '');
    if (Array.isArray(data.entries)) {
      setEntries(
        (data.entries as FoundationEntry[]).map((e) => ({
          ...e,
          id: e.id || crypto.randomUUID(),
        }))
      );
    }
  }

  const addEntry = useCallback(() => {
    setEntries((prev) => [...prev, createEntry()]);
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));
  }, []);

  const updateEntry = useCallback((id: string, field: keyof FoundationEntry, value: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  }, []);

  const computedResults = useMemo(() => {
    const allowable = parseFloat(soilAllowableStress) || 0;
    return entries.map((entry) => {
      const length = parseFloat(entry.foundationLength) || 0;
      const width = parseFloat(entry.foundationWidth) || 0;
      const totalLoad = parseFloat(entry.totalLoad) || 0;
      const area = computeArea(length, width);
      const actualStress = computeActualStress(totalLoad, area);
      const isSafe = allowable > 0 ? actualStress <= allowable : false;
      return { area, actualStress, isSafe };
    });
  }, [entries, soilAllowableStress]);

  const handleSave = useCallback(() => {
    onSave({
      foundationType,
      soilAllowableStress,
      entries,
    });
  }, [foundationType, soilAllowableStress, entries, onSave]);

  const safeCount = computedResults.filter((r) => r.isSafe).length;
  const unsafeCount = computedResults.filter((r) => !r.isSafe && r.actualStress > 0).length;

  return (
    <div className="space-y-6">
      {/* Foundation Parameters Card */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Layers className="h-5 w-5" />
            </div>
            <span>تقييم الأساسات</span>
            <span className="text-xs font-normal opacity-80 me-auto">وفقاً للكود السوري 2024</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">نوع الأساس</Label>
              <Select value={foundationType} onValueChange={setFoundationType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر نوع الأساس" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="منفرد">منفرد (Isolated)</SelectItem>
                  <SelectItem value="مشترك">مشترك (Combined)</SelectItem>
                  <SelectItem value="حصيرة">حصيرة (Raft)</SelectItem>
                  <SelectItem value="ركائز">ركائز (Piles)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                إجهاد التربة المسموح <span className="text-muted-foreground">(kg/cm²)</span>
              </Label>
              <Input
                type="number"
                value={soilAllowableStress}
                onChange={(e) => setSoilAllowableStress(e.target.value)}
                placeholder="مثال: 2.5"
                className="w-full"
                dir="ltr"
              />
            </div>
          </div>

          {/* Formulas Card */}
          <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl border border-emerald-200/50">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">المعادلات الهندسية</span>
            </div>
            <div className="space-y-2 text-sm text-foreground/80 font-mono" dir="ltr">
              <p>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">Actual Stress</span>{' '}
                = (Total Load × 1000) / (Length × Width) [kg/cm²]
              </p>
              <p>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">Safety Check</span>{' '}
                : Actual Stress ≤ Soil Allowable Stress → <span className="text-emerald-600">Safe ✓</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Foundation Entries Card */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Layers className="h-5 w-5" />
              </div>
              <span>تفاصيل الأساسات</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {safeCount > 0 && (
                <span className="text-xs bg-emerald-400/30 px-2 py-1 rounded-full text-white">
                  آمن: {safeCount}
                </span>
              )}
              {unsafeCount > 0 && (
                <span className="text-xs bg-red-400/30 px-2 py-1 rounded-full text-white">
                  غير آمن: {unsafeCount}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Desktop Table Header */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-3 mb-3 px-1">
            <span className="col-span-2 text-xs font-semibold text-muted-foreground">اسم/رقم الأساس</span>
            <span className="col-span-1 text-xs font-semibold text-muted-foreground text-center">الطول (cm)</span>
            <span className="col-span-1 text-xs font-semibold text-muted-foreground text-center">العرض (cm)</span>
            <span className="col-span-1 text-xs font-semibold text-muted-foreground text-center">المساحة (cm²)</span>
            <span className="col-span-1 text-xs font-semibold text-muted-foreground text-center">الحمولة (ton)</span>
            <span className="col-span-2 text-xs font-semibold text-muted-foreground text-center">الإجهاد الفعلي (kg/cm²)</span>
            <span className="col-span-2 text-xs font-semibold text-muted-foreground text-center">النتيجة</span>
            <span className="col-span-1 text-xs font-semibold text-muted-foreground text-center">إجراء</span>
          </div>

          <div className="space-y-4">
            {entries.map((entry, index) => {
              const result = computedResults[index];
              return (
                <div
                  key={entry.id}
                  className={`p-4 rounded-xl border transition-all duration-200 ${
                    result.actualStress > 0
                      ? result.isSafe
                        ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'border-red-200 bg-red-50/50 dark:bg-red-950/20'
                      : 'border-border bg-card'
                  }`}
                >
                  {/* Mobile Layout */}
                  <div className="lg:hidden space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        أساس #{index + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => removeEntry(entry.id)}
                        disabled={entries.length <= 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs text-muted-foreground">اسم/رقم الأساس</Label>
                        <Input
                          value={entry.foundationName}
                          onChange={(e) => updateEntry(entry.id, 'foundationName', e.target.value)}
                          placeholder="مثال: F1"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">الطول (cm)</Label>
                        <Input
                          type="number"
                          value={entry.foundationLength}
                          onChange={(e) => updateEntry(entry.id, 'foundationLength', e.target.value)}
                          placeholder="0"
                          className="h-9 text-sm"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">العرض (cm)</Label>
                        <Input
                          type="number"
                          value={entry.foundationWidth}
                          onChange={(e) => updateEntry(entry.id, 'foundationWidth', e.target.value)}
                          placeholder="0"
                          className="h-9 text-sm"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">الحمولة الكلية (ton)</Label>
                        <Input
                          type="number"
                          value={entry.totalLoad}
                          onChange={(e) => updateEntry(entry.id, 'totalLoad', e.target.value)}
                          placeholder="0"
                          className="h-9 text-sm"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">المساحة (cm²)</Label>
                        <div className="h-9 flex items-center px-3 rounded-md bg-muted text-sm font-medium" dir="ltr">
                          {result.area > 0 ? result.area.toLocaleString('en') : '—'}
                        </div>
                      </div>
                    </div>

                    {/* Results */}
                    {result.actualStress > 0 && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">الإجهاد الفعلي</Label>
                          <div
                            className={`h-9 flex items-center px-3 rounded-md text-sm font-bold ${
                              result.isSafe
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                            }`}
                            dir="ltr"
                          >
                            {result.actualStress.toFixed(2)} kg/cm²
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">النتيجة</Label>
                          <div
                            className={`h-9 flex items-center justify-center gap-1.5 rounded-md text-sm font-bold ${
                              result.isSafe
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                            }`}
                          >
                            {result.isSafe ? (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                آمن
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4" />
                                غير آمن
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">ملاحظات</Label>
                      <Textarea
                        value={entry.notes}
                        onChange={(e) => updateEntry(entry.id, 'notes', e.target.value)}
                        placeholder="ملاحظات إضافية..."
                        className="min-h-[60px] text-sm resize-y"
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden lg:grid lg:grid-cols-12 gap-3 items-center">
                    <div className="col-span-2">
                      <Input
                        value={entry.foundationName}
                        onChange={(e) => updateEntry(entry.id, 'foundationName', e.target.value)}
                        placeholder={`F${index + 1}`}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="col-span-1">
                      <Input
                        type="number"
                        value={entry.foundationLength}
                        onChange={(e) => updateEntry(entry.id, 'foundationLength', e.target.value)}
                        placeholder="0"
                        className="h-9 text-sm text-center"
                        dir="ltr"
                      />
                    </div>
                    <div className="col-span-1">
                      <Input
                        type="number"
                        value={entry.foundationWidth}
                        onChange={(e) => updateEntry(entry.id, 'foundationWidth', e.target.value)}
                        placeholder="0"
                        className="h-9 text-sm text-center"
                        dir="ltr"
                      />
                    </div>
                    <div className="col-span-1">
                      <div className="h-9 flex items-center justify-center rounded-md bg-muted text-sm font-medium" dir="ltr">
                        {result.area > 0 ? result.area.toLocaleString('en') : '—'}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <Input
                        type="number"
                        value={entry.totalLoad}
                        onChange={(e) => updateEntry(entry.id, 'totalLoad', e.target.value)}
                        placeholder="0"
                        className="h-9 text-sm text-center"
                        dir="ltr"
                      />
                    </div>
                    <div className="col-span-2">
                      <div
                        className={`h-9 flex items-center justify-center rounded-md text-sm font-bold ${
                          result.actualStress > 0
                            ? result.isSafe
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                        dir="ltr"
                      >
                        {result.actualStress > 0 ? `${result.actualStress.toFixed(2)} kg/cm²` : '—'}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div
                        className={`h-9 flex items-center justify-center gap-1.5 rounded-md text-sm font-bold ${
                          result.actualStress > 0
                            ? result.isSafe
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {result.actualStress > 0 ? (
                          result.isSafe ? (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              آمن
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4" />
                              غير آمن
                            </>
                          )
                        ) : (
                          '—'
                        )}
                      </div>
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => removeEntry(entry.id)}
                        disabled={entries.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Desktop Notes Row */}
                  <div className="hidden lg:block mt-2">
                    <Textarea
                      value={entry.notes}
                      onChange={(e) => updateEntry(entry.id, 'notes', e.target.value)}
                      placeholder="ملاحظات إضافية..."
                      className="min-h-[40px] text-sm resize-y"
                      rows={1}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Entry Button */}
          <Button
            variant="outline"
            className="w-full mt-4 border-dashed border-2 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-solid"
            onClick={addEntry}
          >
            <Plus className="h-4 w-4 me-2" />
            إضافة أساس جديد
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-8"
        >
          <Save className="h-4 w-4 me-2" />
          حفظ البيانات
        </Button>
      </div>
    </div>
  );
}
