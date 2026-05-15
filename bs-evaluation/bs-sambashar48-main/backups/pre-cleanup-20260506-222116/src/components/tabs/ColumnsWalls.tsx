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
import {
  Columns3,
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  XCircle,
  Calculator,
  ShieldAlert,
} from 'lucide-react';

interface ColumnEntry {
  id: string;
  columnName: string;
  floor: string;
  sectionWidth: string;
  sectionDepth: string;
  load: string;
  fc: string;
  notes: string;
}

interface PunchingInput {
  selectedColumnId: string;
  columnWidth: string;
  columnDepth: string;
  slabThickness: string;
  effectiveDepth: string;
  columnReaction: string;
  fc: string;
}

interface ColumnsWallsProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
}

const createColumnEntry = (): ColumnEntry => ({
  id: crypto.randomUUID(),
  columnName: '',
  floor: '',
  sectionWidth: '',
  sectionDepth: '',
  load: '',
  fc: '',
  notes: '',
});

const defaultPunching: PunchingInput = {
  selectedColumnId: '',
  columnWidth: '',
  columnDepth: '',
  slabThickness: '',
  effectiveDepth: '',
  columnReaction: '',
  fc: '',
};

export default function ColumnsWalls({ data, onSave }: ColumnsWallsProps) {
  const [entries, setEntries] = useState<ColumnEntry[]>(() => {
    if (Array.isArray(data.columns)) {
      return (data.columns as ColumnEntry[]).map((e) => ({
        ...e,
        id: e.id || crypto.randomUUID(),
      }));
    }
    return [createColumnEntry()];
  });

  const [punching, setPunching] = useState<PunchingInput>(() => {
    if (data.punching && typeof data.punching === 'object') {
      return { ...defaultPunching, ...(data.punching as Partial<PunchingInput>) };
    }
    return { ...defaultPunching };
  });

  // Sync state when data prop changes (project switch)
  const [prevData, setPrevData] = useState(data);
  if (prevData !== data) {
    setPrevData(data);
    if (Array.isArray(data.columns)) {
      setEntries(
        (data.columns as ColumnEntry[]).map((e) => ({
          ...e,
          id: e.id || crypto.randomUUID(),
        }))
      );
    }
    if (data.punching && typeof data.punching === 'object') {
      setPunching({ ...defaultPunching, ...(data.punching as Partial<PunchingInput>) });
    }
  }

  // Column actions
  const addEntry = useCallback(() => {
    setEntries((prev) => [...prev, createColumnEntry()]);
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));
  }, []);

  const updateEntry = useCallback((id: string, field: keyof ColumnEntry, value: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  }, []);

  // Punching actions
  const updatePunching = useCallback((field: keyof PunchingInput, value: string) => {
    setPunching((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleColumnSelect = useCallback(
    (columnId: string) => {
      const selected = entries.find((e) => e.id === columnId);
      if (selected) {
        setPunching((prev) => ({
          ...prev,
          selectedColumnId: columnId,
          columnWidth: selected.sectionWidth || prev.columnWidth,
          columnDepth: selected.sectionDepth || prev.columnDepth,
          fc: selected.fc || prev.fc,
        }));
      } else {
        setPunching((prev) => ({
          ...prev,
          selectedColumnId: columnId,
        }));
      }
    },
    [entries]
  );

  // Computed results for columns
  const columnResults = useMemo(() => {
    return entries.map((entry) => {
      const width = parseFloat(entry.sectionWidth) || 0;
      const depth = parseFloat(entry.sectionDepth) || 0;
      const load = parseFloat(entry.load) || 0;
      const fc = parseFloat(entry.fc) || 0;
      const area = width * depth;
      const actualStress = area > 0 ? (load * 1000) / area : 0;
      const allowableStress = 0.3 * fc;
      const isSafe = allowableStress > 0 ? actualStress <= allowableStress : false;
      return { area, actualStress, allowableStress, isSafe };
    });
  }, [entries]);

  // Punching shear results
  const punchingResult = useMemo(() => {
    const colW = parseFloat(punching.columnWidth) || 0;
    const colD = parseFloat(punching.columnDepth) || 0;
    const d = parseFloat(punching.effectiveDepth) || 0;
    const reaction = parseFloat(punching.columnReaction) || 0;
    const fc = parseFloat(punching.fc) || 0;

    const b0 = 2 * ((colW + d) + (colD + d));
    const Av = b0 * d;
    const vp = b0 * d > 0 ? (reaction * 1000) / (b0 * d) : 0;
    const vcp = fc > 0 ? 0.5 * Math.sqrt(fc) : 0;
    const isSafe = vcp > 0 ? vp <= vcp : false;

    return { b0, Av, vp, vcp, isSafe };
  }, [punching]);

  const handleSave = useCallback(() => {
    onSave({
      columns: entries,
      punching,
    });
  }, [entries, punching, onSave]);

  const colSafeCount = columnResults.filter((r) => r.isSafe).length;
  const colUnsafeCount = columnResults.filter((r) => !r.isSafe && r.actualStress > 0).length;

  return (
    <div className="space-y-6">
      {/* Section 1: Columns/Walls Evaluation */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Columns3 className="h-5 w-5" />
              </div>
              <span>تقييم الأعمدة والجدران</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {colSafeCount > 0 && (
                <span className="text-xs bg-emerald-400/30 px-2 py-1 rounded-full text-white">
                  آمن: {colSafeCount}
                </span>
              )}
              {colUnsafeCount > 0 && (
                <span className="text-xs bg-red-400/30 px-2 py-1 rounded-full text-white">
                  غير آمن: {colUnsafeCount}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Formulas */}
          <div className="mb-5 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl border border-emerald-200/50">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">المعادلات الهندسية</span>
            </div>
            <div className="space-y-2 text-sm text-foreground/80 font-mono" dir="ltr">
              <p>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">Actual Stress</span>{' '}
                = (Load × 1000) / (Width × Depth) [kg/cm²]
              </p>
              <p>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">Allowable Stress</span>{' '}
                = 0.3 × f&apos;c [kg/cm²]
              </p>
              <p>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">Safety</span>{' '}
                : Actual Stress ≤ Allowable Stress → <span className="text-emerald-600">Safe ✓</span>
              </p>
            </div>
          </div>

          {/* Desktop Table Header */}
          <div className="hidden xl:grid xl:grid-cols-12 gap-3 mb-3 px-1">
            <span className="col-span-1 text-xs font-semibold text-muted-foreground">اسم العمود</span>
            <span className="col-span-1 text-xs font-semibold text-muted-foreground text-center">الطابق</span>
            <span className="col-span-1 text-xs font-semibold text-muted-foreground text-center">العرض (cm)</span>
            <span className="col-span-1 text-xs font-semibold text-muted-foreground text-center">العمق (cm)</span>
            <span className="col-span-1 text-xs font-semibold text-muted-foreground text-center">المساحة (cm²)</span>
            <span className="col-span-1 text-xs font-semibold text-muted-foreground text-center">الحمولة (ton)</span>
            <span className="col-span-1 text-xs font-semibold text-muted-foreground text-center">f&apos;c</span>
            <span className="col-span-1 text-xs font-semibold text-muted-foreground text-center">الإجهاد الفعلي</span>
            <span className="col-span-1 text-xs font-semibold text-muted-foreground text-center">الإجهاد المسموح</span>
            <span className="col-span-1 text-xs font-semibold text-muted-foreground text-center">النتيجة</span>
            <span className="col-span-1 text-xs font-semibold text-muted-foreground text-center">إجراء</span>
          </div>

          <div className="space-y-4">
            {entries.map((entry, index) => {
              const result = columnResults[index];
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
                  <div className="xl:hidden space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        عمود #{index + 1}
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
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">اسم/رقم العمود</Label>
                        <Input
                          value={entry.columnName}
                          onChange={(e) => updateEntry(entry.id, 'columnName', e.target.value)}
                          placeholder="C1"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">الطابق</Label>
                        <Input
                          value={entry.floor}
                          onChange={(e) => updateEntry(entry.id, 'floor', e.target.value)}
                          placeholder="ط1"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">عرض المقطع (cm)</Label>
                        <Input
                          type="number"
                          value={entry.sectionWidth}
                          onChange={(e) => updateEntry(entry.id, 'sectionWidth', e.target.value)}
                          placeholder="0"
                          className="h-9 text-sm"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">عمق المقطع (cm)</Label>
                        <Input
                          type="number"
                          value={entry.sectionDepth}
                          onChange={(e) => updateEntry(entry.id, 'sectionDepth', e.target.value)}
                          placeholder="0"
                          className="h-9 text-sm"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">الحمولة (ton)</Label>
                        <Input
                          type="number"
                          value={entry.load}
                          onChange={(e) => updateEntry(entry.id, 'load', e.target.value)}
                          placeholder="0"
                          className="h-9 text-sm"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">f'c (kg/cm²)</Label>
                        <Input
                          type="number"
                          value={entry.fc}
                          onChange={(e) => updateEntry(entry.id, 'fc', e.target.value)}
                          placeholder="250"
                          className="h-9 text-sm"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    {/* Results Mobile */}
                    {result.actualStress > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">الإجهاد الفعلي</Label>
                          <div
                            className={`h-9 flex items-center justify-center rounded-md text-xs font-bold ${
                              result.isSafe
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                            }`}
                            dir="ltr"
                          >
                            {result.actualStress.toFixed(2)}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">الإجهاد المسموح</Label>
                          <div className="h-9 flex items-center justify-center rounded-md bg-muted text-xs font-medium" dir="ltr">
                            {result.allowableStress.toFixed(2)}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">النتيجة</Label>
                          <div
                            className={`h-9 flex items-center justify-center gap-1 rounded-md text-xs font-bold ${
                              result.isSafe
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                            }`}
                          >
                            {result.isSafe ? (
                              <>
                                <CheckCircle className="h-3.5 w-3.5" />
                                آمن
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3.5 w-3.5" />
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
                        className="min-h-[50px] text-sm resize-y"
                        rows={1}
                      />
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden xl:grid xl:grid-cols-12 gap-3 items-center">
                    <div className="col-span-1">
                      <Input
                        value={entry.columnName}
                        onChange={(e) => updateEntry(entry.id, 'columnName', e.target.value)}
                        placeholder={`C${index + 1}`}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="col-span-1">
                      <Input
                        value={entry.floor}
                        onChange={(e) => updateEntry(entry.id, 'floor', e.target.value)}
                        placeholder="ط1"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="col-span-1">
                      <Input
                        type="number"
                        value={entry.sectionWidth}
                        onChange={(e) => updateEntry(entry.id, 'sectionWidth', e.target.value)}
                        placeholder="0"
                        className="h-9 text-sm text-center"
                        dir="ltr"
                      />
                    </div>
                    <div className="col-span-1">
                      <Input
                        type="number"
                        value={entry.sectionDepth}
                        onChange={(e) => updateEntry(entry.id, 'sectionDepth', e.target.value)}
                        placeholder="0"
                        className="h-9 text-sm text-center"
                        dir="ltr"
                      />
                    </div>
                    <div className="col-span-1">
                      <div className="h-9 flex items-center justify-center rounded-md bg-muted text-xs font-medium" dir="ltr">
                        {result.area > 0 ? result.area.toLocaleString('en') : '—'}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <Input
                        type="number"
                        value={entry.load}
                        onChange={(e) => updateEntry(entry.id, 'load', e.target.value)}
                        placeholder="0"
                        className="h-9 text-sm text-center"
                        dir="ltr"
                      />
                    </div>
                    <div className="col-span-1">
                      <Input
                        type="number"
                        value={entry.fc}
                        onChange={(e) => updateEntry(entry.id, 'fc', e.target.value)}
                        placeholder="250"
                        className="h-9 text-sm text-center"
                        dir="ltr"
                      />
                    </div>
                    <div className="col-span-1">
                      <div
                        className={`h-9 flex items-center justify-center rounded-md text-xs font-bold ${
                          result.actualStress > 0
                            ? result.isSafe
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                        dir="ltr"
                      >
                        {result.actualStress > 0 ? result.actualStress.toFixed(2) : '—'}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="h-9 flex items-center justify-center rounded-md bg-muted text-xs font-medium" dir="ltr">
                        {result.allowableStress > 0 ? result.allowableStress.toFixed(2) : '—'}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div
                        className={`h-9 flex items-center justify-center gap-1 rounded-md text-xs font-bold ${
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
                              <CheckCircle className="h-3.5 w-3.5" />
                              آمن
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3.5 w-3.5" />
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

                  {/* Desktop Notes */}
                  <div className="hidden xl:block mt-2">
                    <Textarea
                      value={entry.notes}
                      onChange={(e) => updateEntry(entry.id, 'notes', e.target.value)}
                      placeholder="ملاحظات إضافية..."
                      className="min-h-[36px] text-sm resize-y"
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
            إضافة عمود جديد
          </Button>
        </CardContent>
      </Card>

      {/* Section 2: Punching Shear Check */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <span>فحص قص الثقب (Punching Shear)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Formulas */}
          <div className="mb-5 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl border border-amber-200/50">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-800 dark:text-amber-400">معادلات قص الثقب</span>
            </div>
            <div className="space-y-2 text-sm text-foreground/80 font-mono" dir="ltr">
              <p>
                <span className="font-semibold text-amber-700 dark:text-amber-400">b₀</span> = 2 × [(Col.W + d) + (Col.D + d)]
              </p>
              <p>
                <span className="font-semibold text-amber-700 dark:text-amber-400">Aᵥ</span> = b₀ × d
              </p>
              <p>
                <span className="font-semibold text-amber-700 dark:text-amber-400">vₚ</span> = (Reaction × 1000) / (b₀ × d) [kg/cm²]
              </p>
              <p>
                <span className="font-semibold text-amber-700 dark:text-amber-400">vₚ.ₚ</span> = 0.5 × √(f&apos;c) [kg/cm²]
              </p>
              <p>
                <span className="font-semibold text-amber-700 dark:text-amber-400">Safety</span> : vₚ ≤ vₚ.ₚ →{' '}
                <span className="text-emerald-600">Safe ✓</span>
              </p>
            </div>
          </div>

          {/* Column Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">اختر العمود للفحص</Label>
              <Select
                value={punching.selectedColumnId}
                onValueChange={handleColumnSelect}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر عمود من القائمة" />
                </SelectTrigger>
                <SelectContent>
                  {entries.map((entry, idx) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.columnName || `عمود #${idx + 1}`}
                      {entry.floor ? ` - ${entry.floor}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                سماكة البلاطة <span className="text-muted-foreground">(cm)</span>
              </Label>
              <Input
                type="number"
                value={punching.slabThickness}
                onChange={(e) => {
                  updatePunching('slabThickness', e.target.value);
                  // Auto-calculate effective depth (slab thickness - 2.5cm cover)
                  const thickness = parseFloat(e.target.value);
                  if (thickness > 0) {
                    updatePunching('effectiveDepth', String(thickness - 2.5));
                  }
                }}
                placeholder="مثال: 20"
                className="w-full"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                عرض العمود <span className="text-muted-foreground">(cm)</span>
              </Label>
              <Input
                type="number"
                value={punching.columnWidth}
                onChange={(e) => updatePunching('columnWidth', e.target.value)}
                placeholder="0"
                className="w-full"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                عمق العمود <span className="text-muted-foreground">(cm)</span>
              </Label>
              <Input
                type="number"
                value={punching.columnDepth}
                onChange={(e) => updatePunching('columnDepth', e.target.value)}
                placeholder="0"
                className="w-full"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                العمق الفعلي (d) <span className="text-muted-foreground">(cm)</span>
              </Label>
              <Input
                type="number"
                value={punching.effectiveDepth}
                onChange={(e) => updatePunching('effectiveDepth', e.target.value)}
                placeholder="العمق الفعلي"
                className="w-full"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                رد فعل العمود <span className="text-muted-foreground">(ton)</span>
              </Label>
              <Input
                type="number"
                value={punching.columnReaction}
                onChange={(e) => updatePunching('columnReaction', e.target.value)}
                placeholder="0"
                className="w-full"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                المقاومة الأسطوانية f&apos;c <span className="text-muted-foreground">(kg/cm²)</span>
              </Label>
              <Input
                type="number"
                value={punching.fc}
                onChange={(e) => updatePunching('fc', e.target.value)}
                placeholder="250"
                className="w-full"
                dir="ltr"
              />
            </div>
          </div>

          {/* Punching Results */}
          <div className="p-5 rounded-xl border-2 transition-all duration-200 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-foreground">نتائج فحص قص الثقب</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground block">b₀ (cm)</span>
                <div className="h-10 flex items-center justify-center rounded-lg bg-muted text-sm font-semibold" dir="ltr">
                  {punchingResult.b0 > 0 ? punchingResult.b0.toFixed(1) : '—'}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground block">Aᵥ (cm²)</span>
                <div className="h-10 flex items-center justify-center rounded-lg bg-muted text-sm font-semibold" dir="ltr">
                  {punchingResult.Av > 0 ? punchingResult.Av.toFixed(1) : '—'}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground block">vₚ (kg/cm²)</span>
                <div
                  className={`h-10 flex items-center justify-center rounded-lg text-sm font-bold ${
                    punchingResult.vp > 0
                      ? punchingResult.isSafe
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                      : 'bg-muted text-muted-foreground'
                  }`}
                  dir="ltr"
                >
                  {punchingResult.vp > 0 ? punchingResult.vp.toFixed(3) : '—'}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground block">vₚ.ₚ (kg/cm²)</span>
                <div className="h-10 flex items-center justify-center rounded-lg bg-muted text-sm font-semibold" dir="ltr">
                  {punchingResult.vcp > 0 ? punchingResult.vcp.toFixed(3) : '—'}
                </div>
              </div>
              <div className="space-y-1 col-span-2 md:col-span-1">
                <span className="text-xs text-muted-foreground block">النتيجة</span>
                <div
                  className={`h-10 flex items-center justify-center gap-1.5 rounded-lg text-sm font-bold ${
                    punchingResult.vp > 0
                      ? punchingResult.isSafe
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {punchingResult.vp > 0 ? (
                    punchingResult.isSafe ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        آمن تجاه الثقب
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        خطر ثقب ❌
                      </>
                    )
                  ) : (
                    '—'
                  )}
                </div>
              </div>
            </div>

            {/* Recommendation when unsafe */}
            {punchingResult.vp > 0 && !punchingResult.isSafe && (
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200/50">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">
                    توصية لمعالجة خطر الثقب:
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400/80">
                    زيادة سماكة البلاطة، أو إضافة بلاطة سقوط (Drop Panel)، أو تيجان أعمدة (Column Capitals).
                  </p>
                </div>
              </div>
            )}
          </div>
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
