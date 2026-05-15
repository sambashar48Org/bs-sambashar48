'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Layers,
  Plus,
  Trash2,
  Save,
  Edit3,
  CheckCircle,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  Home,
  Ruler,
  Gauge,
  AlertOctagon,
  ArrowRight,
} from 'lucide-react';
import { FOUNDATION_TYPES } from '@/lib/constants';
import {
  checkIsolatedFoundation,
  checkCombinedFoundation,
  checkMatFoundation,
  checkContinuousFoundation,
  type IsolatedFoundationResult,
  type CombinedFoundationResult,
  type MatFoundationResult,
  type ContinuousFoundationResult,
} from '@/lib/calculations';
import { useProjectStore } from '@/stores';

// ======== Types ========
type FoundationType = (typeof FOUNDATION_TYPES)[number];

interface FoundationEntry {
  id: string;
  name: string;
  type: FoundationType;
  foundationDepth: string;
  length: string;
  width: string;
  height: string;
  totalLoad: string;
  // مشتركة (Combined) fields
  P1: string;
  P2: string;
  S: string;
  L_out: string;
  // حصيرة (Mat) fields
  fc: string;
  columnLoad: string;
  columnWidth: string;
  columnDepth: string;
  columnType: string;
  // مستمرة (Continuous) fields
  q: string;
  // common
  notes: string;
}

type FoundationResult =
  | { type: 'منفردة'; hasResult: boolean; data: IsolatedFoundationResult | null }
  | { type: 'مشتركة'; hasResult: boolean; data: CombinedFoundationResult | null }
  | { type: 'حصيرة'; hasResult: boolean; data: MatFoundationResult | null }
  | { type: 'مستمرة'; hasResult: boolean; data: ContinuousFoundationResult | null }
  | { type: FoundationType; hasResult: false; data: null };

interface FoundationsProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
}

// ======== Helpers ========
const createEntry = (): FoundationEntry => ({
  id: crypto.randomUUID(),
  name: '',
  type: 'منفردة',
  foundationDepth: '',
  length: '',
  width: '',
  height: '',
  totalLoad: '',
  P1: '',
  P2: '',
  S: '',
  L_out: '',
  fc: '',
  columnLoad: '',
  columnWidth: '',
  columnDepth: '',
  columnType: 'وسطي',
  q: '',
  notes: '',
});

function restoreEntry(raw: Record<string, unknown>): FoundationEntry {
  return {
    id: (raw.id as string) || crypto.randomUUID(),
    name: (raw.name as string) || '',
    type: (FOUNDATION_TYPES as readonly string[]).includes(raw.type as string)
      ? (raw.type as FoundationType)
      : 'منفردة',
    foundationDepth: (raw.foundationDepth as string) || '',
    length: (raw.length as string) || '',
    width: (raw.width as string) || '',
    height: (raw.height as string) || '',
    totalLoad: (raw.totalLoad as string) || '',
    P1: (raw.P1 as string) || '',
    P2: (raw.P2 as string) || '',
    S: (raw.S as string) || '',
    L_out: (raw.L_out as string) || '',
    fc: (raw.fc as string) || '',
    columnLoad: (raw.columnLoad as string) || '',
    columnWidth: (raw.columnWidth as string) || '',
    columnDepth: (raw.columnDepth as string) || '',
    columnType: (raw.columnType as string) || 'وسطي',
    q: (raw.q as string) || '',
    notes: (raw.notes as string) || '',
  };
}

// ======== Column type options for mat foundation ========
const COLUMN_TYPE_OPTIONS = [
  { value: 'وسطي', label: 'وسطي' },
  { value: 'طرفي', label: 'طرفي' },
  { value: 'ركني', label: 'ركني' },
] as const;

const COLUMN_TYPE_MAP: Record<string, 'center' | 'edge' | 'corner'> = {
  'وسطي': 'center',
  'طرفي': 'edge',
  'ركني': 'corner',
};

// ======== Component ========
export default function Foundations({ data, onSave }: FoundationsProps) {
  // Access structural report for auto-filling allowable bearing
  const structuralReport = useProjectStore((s) => s.projectData.structural_report);
  const soilAllowable = useMemo(() => {
    const sr = structuralReport as Record<string, unknown> | undefined;
    if (!sr) return 0;
    const soilReport = sr.soilReport as Record<string, unknown> | undefined;
    if (!soilReport) return 0;
    return Number(soilReport.allowableBearing) || 0;
  }, [structuralReport]);

  // ---- State ----
  const [isEditing, setIsEditing] = useState(true);

  const [hasBasement, setHasBasement] = useState<boolean>(
    Boolean(data.hasBasement)
  );
  const [basementDescription, setBasementDescription] = useState<string>(
    (data.basementDescription as string) || ''
  );

  const [allowableSoilStress, setAllowableSoilStress] = useState<string>(() => {
    const saved = data.allowableSoilStress;
    if (saved !== undefined && saved !== null && saved !== '') {
      return String(saved);
    }
    return soilAllowable > 0 ? String(soilAllowable) : '';
  });

  const [entries, setEntries] = useState<FoundationEntry[]>(() => {
    if (Array.isArray(data.foundations)) {
      return (data.foundations as Record<string, unknown>[]).map(restoreEntry);
    }
    if (Array.isArray(data.entries)) {
      return (data.entries as Record<string, unknown>[]).map(restoreEntry);
    }
    return [createEntry()];
  });

  // Sync state when data prop changes (project switch)
  const [prevData, setPrevData] = useState(data);
  if (prevData !== data) {
    setPrevData(data);
    setHasBasement(Boolean(data.hasBasement));
    setBasementDescription((data.basementDescription as string) || '');
    const saved = data.allowableSoilStress;
    if (saved !== undefined && saved !== null && saved !== '') {
      setAllowableSoilStress(String(saved));
    } else {
      setAllowableSoilStress(soilAllowable > 0 ? String(soilAllowable) : '');
    }
    if (Array.isArray(data.foundations)) {
      setEntries((data.foundations as Record<string, unknown>[]).map(restoreEntry));
    } else if (Array.isArray(data.entries)) {
      setEntries((data.entries as Record<string, unknown>[]).map(restoreEntry));
    }
  }

  // ---- Entry Actions ----
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

  // ---- Computed Results ----
  const allowable = parseFloat(allowableSoilStress) || 0;

  const results = useMemo(() => {
    return entries.map((entry): FoundationResult => {
      const fType = entry.type;

      if (fType === 'منفردة') {
        const length = parseFloat(entry.length) || 0;
        const width = parseFloat(entry.width) || 0;
        const load = parseFloat(entry.totalLoad) || 0;

        if (length <= 0 || width <= 0 || load <= 0 || allowable <= 0) {
          return { type: 'منفردة', hasResult: false, data: null };
        }

        const result = checkIsolatedFoundation({
          load,
          length,
          width,
          allowableStress: allowable,
        });

        return { type: 'منفردة', hasResult: true, data: result };
      }

      if (fType === 'مشتركة') {
        const L = parseFloat(entry.length) || 0;
        const B = parseFloat(entry.width) || 0;
        const P1 = parseFloat(entry.P1) || 0;
        const P2 = parseFloat(entry.P2) || 0;
        const S = parseFloat(entry.S) || 0;
        const L_out = parseFloat(entry.L_out) || 0;

        if (L <= 0 || B <= 0 || P1 <= 0 || P2 <= 0 || S <= 0 || allowable <= 0) {
          return { type: 'مشتركة', hasResult: false, data: null };
        }

        const result = checkCombinedFoundation({
          P1,
          P2,
          S,
          L,
          B,
          L_out,
          allowableStress: allowable,
        });

        return { type: 'مشتركة', hasResult: true, data: result };
      }

      if (fType === 'حصيرة') {
        const matThickness = parseFloat(entry.height) || 0;
        const fc = parseFloat(entry.fc) || 0;
        const columnLoad = parseFloat(entry.columnLoad) || 0;
        const columnWidth = parseFloat(entry.columnWidth) || 40;
        const columnDepth = parseFloat(entry.columnDepth) || 40;
        const colTypeKey = COLUMN_TYPE_MAP[entry.columnType] || 'center';

        if (matThickness <= 0 || fc <= 0 || columnLoad <= 0) {
          return { type: 'حصيرة', hasResult: false, data: null };
        }

        const result = checkMatFoundation({
          columnLoad,
          matThickness,
          fc,
          columnWidth,
          columnDepth,
          columnType: colTypeKey,
        });

        return { type: 'حصيرة', hasResult: true, data: result };
      }

      if (fType === 'مستمرة') {
        const B = parseFloat(entry.width) || 0;
        const q = parseFloat(entry.q) || 0;

        if (B <= 0 || q <= 0 || allowable <= 0) {
          return { type: 'مستمرة', hasResult: false, data: null };
        }

        const result = checkContinuousFoundation({
          q,
          B,
          allowableStress: allowable,
        });

        return { type: 'مستمرة', hasResult: true, data: result };
      }

      return { type: fType, hasResult: false, data: null };
    });
  }, [entries, allowable]);

  const safeCount = results.filter((r) => r.hasResult && r.data?.safe).length;
  const unsafeCount = results.filter((r) => r.hasResult && r.data && !r.data.safe).length;

  // ---- Save ----
  const handleSave = useCallback(() => {
    const payload = {
      hasBasement,
      basementDescription,
      foundations: entries.map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        foundationDepth: e.foundationDepth,
        length: e.length,
        width: e.width,
        height: e.height,
        totalLoad: e.totalLoad,
        P1: e.P1,
        P2: e.P2,
        S: e.S,
        L_out: e.L_out,
        fc: e.fc,
        columnLoad: e.columnLoad,
        columnWidth: e.columnWidth,
        columnDepth: e.columnDepth,
        columnType: e.columnType,
        q: e.q,
        notes: e.notes,
      })),
      allowableSoilStress: allowableSoilStress,
    };
    onSave(payload);
    setIsEditing(false);
  }, [hasBasement, basementDescription, entries, allowableSoilStress, onSave]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  // ---- Helper: check if result is safe ----
  const isResultSafe = (r: FoundationResult): boolean => {
    if (!r.hasResult || !r.data) return false;
    return r.data.safe;
  };

  // ======== Render: Type-specific form fields ========
  const renderTypeFields = (entry: FoundationEntry, index: number) => {
    switch (entry.type) {
      case 'منفردة':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Name */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                اسم / رقم الأساس
              </Label>
              <Input
                value={entry.name}
                onChange={(e) => updateEntry(entry.id, 'name', e.target.value)}
                placeholder={`F${index + 1}`}
                className="h-9 text-sm"
                disabled={!isEditing}
              />
            </div>

            {/* Depth */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                عمق التأسيس (سم)
              </Label>
              <Input
                type="number"
                value={entry.foundationDepth}
                onChange={(e) => updateEntry(entry.id, 'foundationDepth', e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
                dir="ltr"
                disabled={!isEditing}
              />
            </div>

            {/* Length */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                الطول L (سم)
              </Label>
              <Input
                type="number"
                value={entry.length}
                onChange={(e) => updateEntry(entry.id, 'length', e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
                dir="ltr"
                disabled={!isEditing}
              />
            </div>

            {/* Width */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                العرض W (سم)
              </Label>
              <Input
                type="number"
                value={entry.width}
                onChange={(e) => updateEntry(entry.id, 'width', e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
                dir="ltr"
                disabled={!isEditing}
              />
            </div>

            {/* Height */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                الارتفاع H (سم)
              </Label>
              <Input
                type="number"
                value={entry.height}
                onChange={(e) => updateEntry(entry.id, 'height', e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
                dir="ltr"
                disabled={!isEditing}
              />
            </div>

            {/* Total Load */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                الحمولة الكلية (طن)
              </Label>
              <Input
                type="number"
                value={entry.totalLoad}
                onChange={(e) => updateEntry(entry.id, 'totalLoad', e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
                dir="ltr"
                disabled={!isEditing}
              />
            </div>
          </div>
        );

      case 'مشتركة':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Name */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                اسم / رقم الأساس
              </Label>
              <Input
                value={entry.name}
                onChange={(e) => updateEntry(entry.id, 'name', e.target.value)}
                placeholder={`F${index + 1}`}
                className="h-9 text-sm"
                disabled={!isEditing}
              />
            </div>

            {/* Depth */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                عمق التأسيس (سم)
              </Label>
              <Input
                type="number"
                value={entry.foundationDepth}
                onChange={(e) => updateEntry(entry.id, 'foundationDepth', e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
                dir="ltr"
                disabled={!isEditing}
              />
            </div>

            {/* Length */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                الطول L (سم)
              </Label>
              <Input
                type="number"
                value={entry.length}
                onChange={(e) => updateEntry(entry.id, 'length', e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
                dir="ltr"
                disabled={!isEditing}
              />
            </div>

            {/* Width B */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                العرض B (سم)
              </Label>
              <Input
                type="number"
                value={entry.width}
                onChange={(e) => updateEntry(entry.id, 'width', e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
                dir="ltr"
                disabled={!isEditing}
              />
            </div>

            {/* Height */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                الارتفاع H (سم)
              </Label>
              <Input
                type="number"
                value={entry.height}
                onChange={(e) => updateEntry(entry.id, 'height', e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
                dir="ltr"
                disabled={!isEditing}
              />
            </div>

            {/* P1 */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                حمل العمود الخارجي P₁ (طن)
              </Label>
              <Input
                type="number"
                value={entry.P1}
                onChange={(e) => updateEntry(entry.id, 'P1', e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
                dir="ltr"
                disabled={!isEditing}
              />
            </div>

            {/* P2 */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                حمل العمود الداخلي P₂ (طن)
              </Label>
              <Input
                type="number"
                value={entry.P2}
                onChange={(e) => updateEntry(entry.id, 'P2', e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
                dir="ltr"
                disabled={!isEditing}
              />
            </div>

            {/* S */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                المسافة بين العمودين S (سم)
              </Label>
              <Input
                type="number"
                value={entry.S}
                onChange={(e) => updateEntry(entry.id, 'S', e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
                dir="ltr"
                disabled={!isEditing}
              />
            </div>

            {/* L_out */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                البروز الخارجي L_out (سم)
              </Label>
              <Input
                type="number"
                value={entry.L_out}
                onChange={(e) => updateEntry(entry.id, 'L_out', e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
                dir="ltr"
                disabled={!isEditing}
              />
            </div>
          </div>
        );

      case 'حصيرة':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Name */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                اسم / رقم الأساس
              </Label>
              <Input
                value={entry.name}
                onChange={(e) => updateEntry(entry.id, 'name', e.target.value)}
                placeholder={`Raft-${index + 1}`}
                className="h-9 text-sm"
                disabled={!isEditing}
              />
            </div>

            {/* Depth */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                عمق التأسيس (سم)
              </Label>
              <Input
                type="number"
                value={entry.foundationDepth}
                onChange={(e) => updateEntry(entry.id, 'foundationDepth', e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
                dir="ltr"
                disabled={!isEditing}
              />
            </div>

            {/* Mat Thickness */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                سماكة الحصيرة H (سم)
              </Label>
              <Input
                type="number"
                value={entry.height}
                onChange={(e) => updateEntry(entry.id, 'height', e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
                dir="ltr"
                disabled={!isEditing}
              />
            </div>

            {/* fc */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                المقاومة الاسطوانية f&apos;c (كغ/سم²)
              </Label>
              <Input
                type="number"
                value={entry.fc}
                onChange={(e) => updateEntry(entry.id, 'fc', e.target.value)}
                placeholder="مثال: 250"
                className="h-9 text-sm"
                dir="ltr"
                disabled={!isEditing}
              />
            </div>

            {/* Column Load */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                حمل أكبر عمود (طن)
              </Label>
              <Input
                type="number"
                value={entry.columnLoad}
                onChange={(e) => updateEntry(entry.id, 'columnLoad', e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
                dir="ltr"
                disabled={!isEditing}
              />
            </div>

            {/* Column Width */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                عرض العمود (سم)
              </Label>
              <Input
                type="number"
                value={entry.columnWidth}
                onChange={(e) => updateEntry(entry.id, 'columnWidth', e.target.value)}
                placeholder="40"
                className="h-9 text-sm"
                dir="ltr"
                disabled={!isEditing}
              />
            </div>

            {/* Column Depth */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                عمق العمود (سم)
              </Label>
              <Input
                type="number"
                value={entry.columnDepth}
                onChange={(e) => updateEntry(entry.id, 'columnDepth', e.target.value)}
                placeholder="40"
                className="h-9 text-sm"
                dir="ltr"
                disabled={!isEditing}
              />
            </div>

            {/* Column Type */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                موقع العمود
              </Label>
              <Select
                value={entry.columnType}
                onValueChange={(val) => updateEntry(entry.id, 'columnType', val)}
                disabled={!isEditing}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLUMN_TYPE_OPTIONS.map((ct) => (
                    <SelectItem key={ct.value} value={ct.value}>
                      {ct.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'مستمرة':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Name */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                اسم / رقم الأساس
              </Label>
              <Input
                value={entry.name}
                onChange={(e) => updateEntry(entry.id, 'name', e.target.value)}
                placeholder={`CW-${index + 1}`}
                className="h-9 text-sm"
                disabled={!isEditing}
              />
            </div>

            {/* Depth */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                عمق التأسيس (سم)
              </Label>
              <Input
                type="number"
                value={entry.foundationDepth}
                onChange={(e) => updateEntry(entry.id, 'foundationDepth', e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
                dir="ltr"
                disabled={!isEditing}
              />
            </div>

            {/* Width B */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                العرض B (سم)
              </Label>
              <Input
                type="number"
                value={entry.width}
                onChange={(e) => updateEntry(entry.id, 'width', e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
                dir="ltr"
                disabled={!isEditing}
              />
            </div>

            {/* Height */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                الارتفاع H (سم)
              </Label>
              <Input
                type="number"
                value={entry.height}
                onChange={(e) => updateEntry(entry.id, 'height', e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
                dir="ltr"
                disabled={!isEditing}
              />
            </div>

            {/* q */}
            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <Label className="text-xs text-muted-foreground">
                الحمولة الخطية q (طن/م)
              </Label>
              <Input
                type="number"
                value={entry.q}
                onChange={(e) => updateEntry(entry.id, 'q', e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
                dir="ltr"
                disabled={!isEditing}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ======== Render: Type-specific results ========
  const renderResultContent = (result: FoundationResult, entry: FoundationEntry) => {
    if (!result.hasResult || !result.data) return null;

    switch (result.type) {
      case 'منفردة': {
        const d = result.data as IsolatedFoundationResult;
        return (
          <div className="space-y-3">
            {/* Actual Stress */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">الإجهاد الفعلي</span>
              </div>
              <span
                className={`text-sm font-bold px-3 py-1 rounded-md ${
                  d.safe
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                }`}
                dir="ltr"
              >
                {d.actualStress.toFixed(2)} كغ/سم²
              </span>
            </div>

            {/* Allowable Stress */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">الإجهاد المسموح</span>
              </div>
              <span className="text-sm font-bold px-3 py-1 rounded-md bg-muted" dir="ltr">
                {d.allowableStress.toFixed(2)} كغ/سم²
              </span>
            </div>

            {/* Status */}
            <div
              className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                d.safe
                  ? 'bg-emerald-100/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-100/50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {d.safe ? (
                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
                <span className="text-sm font-bold">
                  {d.safe ? 'آمن (محقق)' : 'غير آمن (غير محقق)'}
                </span>
              </div>
            </div>

            {/* Usage Ratio */}
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">نسبة الإجهاد المستخدم</span>
                <span
                  className={`text-xs font-bold ${
                    d.safe ? 'text-emerald-600' : 'text-red-600'
                  }`}
                  dir="ltr"
                >
                  {((d.actualStress / d.allowableStress) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    d.safe ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                  style={{
                    width: `${Math.min((d.actualStress / d.allowableStress) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        );
      }

      case 'مشتركة': {
        const d = result.data as CombinedFoundationResult;
        return (
          <div className="space-y-3">
            {/* Eccentricity */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">اللامركزية e</span>
              </div>
              <span className="text-sm font-bold px-3 py-1 rounded-md bg-muted" dir="ltr">
                {d.eccentricity.toFixed(2)} سم
              </span>
            </div>

            {/* Case Status */}
            <div
              className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                d.eccentricityCase === 'ideal'
                  ? 'bg-emerald-100/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                  : d.eccentricityCase === 'acceptable'
                    ? 'bg-amber-100/50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                    : 'bg-red-100/50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {d.eccentricityCase === 'ideal' ? (
                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : d.eccentricityCase === 'acceptable' ? (
                  <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                ) : (
                  <AlertOctagon className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
                <span className="text-sm font-bold">
                  {d.eccentricityCase === 'ideal'
                    ? 'حالة مثالية — توزيع منتظم'
                    : d.eccentricityCase === 'acceptable'
                      ? 'حالة مقبولة — توزيع شبه منحرف'
                      : 'خطر: دوران — توزيع غير منتظم'}
                </span>
              </div>
            </div>

            {/* σ Max */}
            {(d.eccentricityCase === 'ideal' || d.eccentricityCase === 'acceptable') && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">الإجهاد الأقصى</span>
                </div>
                <span
                  className={`text-sm font-bold px-3 py-1 rounded-md ${
                    d.sigmaMax <= d.allowableStress
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                  }`}
                  dir="ltr"
                >
                  {d.sigmaMax.toFixed(2)} كغ/سم²
                </span>
              </div>
            )}

            {/* σ Min */}
            {(d.eccentricityCase === 'ideal' || d.eccentricityCase === 'acceptable') && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">الإجهاد الأدنى</span>
                </div>
                <span
                  className={`text-sm font-bold px-3 py-1 rounded-md ${
                    d.sigmaMin >= 0
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                  }`}
                  dir="ltr"
                >
                  {d.sigmaMin.toFixed(2)} كغ/سم²
                </span>
              </div>
            )}

            {/* Allowable Stress */}
            {(d.eccentricityCase === 'ideal' || d.eccentricityCase === 'acceptable') && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">الإجهاد المسموح</span>
                </div>
                <span className="text-sm font-bold px-3 py-1 rounded-md bg-muted" dir="ltr">
                  {d.allowableStress.toFixed(2)} كغ/سم²
                </span>
              </div>
            )}

            {/* Overall Status */}
            <div
              className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                d.safe
                  ? 'bg-emerald-100/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-100/50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {d.safe ? (
                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
                <span className="text-sm font-bold">
                  {d.safe ? 'الأساس آمن' : 'الأساس غير آمن'}
                </span>
              </div>
            </div>

            {/* Suggestion (danger case) */}
            {d.suggestion && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                <span className="text-sm text-red-700 dark:text-red-300">{d.suggestion}</span>
              </div>
            )}
          </div>
        );
      }

      case 'حصيرة': {
        const d = result.data as MatFoundationResult;
        return (
          <div className="space-y-3">
            {/* Actual Punching Stress */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">إجهاد الثقب الفعلي</span>
              </div>
              <span
                className={`text-sm font-bold px-3 py-1 rounded-md ${
                  d.safe
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                }`}
                dir="ltr"
              >
                {d.vp.toFixed(2)} كغ/سم²
              </span>
            </div>

            {/* Allowable Punching Stress */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">مقاومة الثقب المسموحة</span>
              </div>
              <span className="text-sm font-bold px-3 py-1 rounded-md bg-muted" dir="ltr">
                {d.vcp.toFixed(2)} كغ/سم²
              </span>
            </div>

            {/* Effective Depth */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">العمق الفعال d</span>
              </div>
              <span className="text-sm font-bold px-3 py-1 rounded-md bg-muted" dir="ltr">
                {d.d.toFixed(2)} سم
              </span>
            </div>

            {/* Critical Perimeter */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">محيط المقطع الحرج b₀</span>
              </div>
              <span className="text-sm font-bold px-3 py-1 rounded-md bg-muted" dir="ltr">
                {d.bo.toFixed(2)} سم
              </span>
            </div>

            {/* Status */}
            <div
              className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                d.safe
                  ? 'bg-emerald-100/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-100/50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {d.safe ? (
                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
                <span className="text-sm font-bold">
                  {d.safe ? 'الحصيرة آمنة ضد الثقب' : 'خطر: اختراق العمود للحصيرة'}
                </span>
              </div>
            </div>

            {/* Suggestion */}
            {d.suggestion && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                <span className="text-sm text-red-700 dark:text-red-300">{d.suggestion}</span>
              </div>
            )}
          </div>
        );
      }

      case 'مستمرة': {
        const d = result.data as ContinuousFoundationResult;
        return (
          <div className="space-y-3">
            {/* Actual Stress */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">الإجهاد الفعلي</span>
              </div>
              <span
                className={`text-sm font-bold px-3 py-1 rounded-md ${
                  d.safe
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                }`}
                dir="ltr"
              >
                {d.actualStress.toFixed(2)} كغ/سم²
              </span>
            </div>

            {/* Allowable Stress */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">الإجهاد المسموح</span>
              </div>
              <span className="text-sm font-bold px-3 py-1 rounded-md bg-muted" dir="ltr">
                {d.allowableStress.toFixed(2)} كغ/سم²
              </span>
            </div>

            {/* Status */}
            <div
              className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                d.safe
                  ? 'bg-emerald-100/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-100/50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {d.safe ? (
                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
                <span className="text-sm font-bold">
                  {d.safe ? 'الأساس المستمر آمن' : 'الأساس المستمر غير آمن'}
                </span>
              </div>
            </div>

            {/* B_min suggestion */}
            {d.Bmin !== undefined && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <ArrowRight className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <span className="text-sm text-amber-700 dark:text-amber-300">
                  العرض الأدنى المطلوب: {d.Bmin} سم
                </span>
              </div>
            )}

            {/* Usage Ratio (if safe or close) */}
            {d.safe && (
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">نسبة الإجهاد المستخدم</span>
                  <span
                    className={`text-xs font-bold ${
                      d.safe ? 'text-emerald-600' : 'text-red-600'
                    }`}
                    dir="ltr"
                  >
                    {((d.actualStress / d.allowableStress) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      d.safe ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                    style={{
                      width: `${Math.min((d.actualStress / d.allowableStress) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* ============================================ */}
      {/* Section 1: معلومات عامة — General Info      */}
      {/* ============================================ */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Layers className="h-5 w-5" />
            </div>
            <span>تقييم الأساسات</span>
            <span className="text-xs font-normal opacity-80 me-auto">
              وفقاً للكود العربي السوري 2024
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Basement Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
            <div className="flex items-center gap-3">
              <Home className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <Label className="text-sm font-medium text-foreground/90">
                  يوجد قبو / ملجأ
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  تحديد ما إذا كان المبنى يحتوي على قبو أو ملجأ
                </p>
              </div>
            </div>
            <Switch
              checked={hasBasement}
              onCheckedChange={(checked) => {
                setHasBasement(checked);
                if (!checked) setBasementDescription('');
              }}
              disabled={!isEditing}
              className="data-[state=checked]:bg-emerald-600"
            />
          </div>

          {/* Basement Description — conditional */}
          {hasBasement && (
            <div className="mt-4 space-y-2 animate-in fade-in-0 slide-in-from-top-2 duration-200">
              <Label className="text-sm font-medium text-foreground/80">
                وصف القبو / الملجأ
              </Label>
              <Textarea
                value={basementDescription}
                onChange={(e) => setBasementDescription(e.target.value)}
                placeholder="أدخل وصف القبو أو الملجأ (الارتفاع، الاستخدام، الملاحظات)..."
                className="min-h-[80px] text-sm resize-y"
                rows={3}
                disabled={!isEditing}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* Section 2 & 3 & 4: بيانات الأساس            */}
      {/* ============================================ */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Ruler className="h-5 w-5" />
              </div>
              <span>بيانات الأساسات</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {safeCount > 0 && (
                <span className="text-xs bg-emerald-400/30 px-2.5 py-1 rounded-full text-white font-medium">
                  آمن: {safeCount}
                </span>
              )}
              {unsafeCount > 0 && (
                <span className="text-xs bg-red-400/30 px-2.5 py-1 rounded-full text-white font-medium">
                  غير آمن: {unsafeCount}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* ---- Soil Allowable Stress ---- */}
          <div className="mb-6 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/20 dark:to-teal-950/20">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <Label className="text-sm font-semibold text-foreground/90">
                إجهاد التربة المسموح به (كغ/سم²)
              </Label>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {soilAllowable > 0
                ? `يتم التعبئة تلقائياً من تقرير الإنشاءات (${soilAllowable} كغ/سم²). يمكنك تعديل القيمة يدوياً.`
                : 'لم يتم العثور على بيانات إجهاد التربة في تقرير الإنشاءات. أدخل القيمة يدوياً.'}
            </p>
            <div className="max-w-xs">
              <Input
                type="number"
                value={allowableSoilStress}
                onChange={(e) => setAllowableSoilStress(e.target.value)}
                placeholder="مثال: 2.5"
                className="h-10 text-sm font-medium"
                dir="ltr"
                disabled={!isEditing}
              />
            </div>
          </div>

          {/* ---- Foundation Entries ---- */}
          <div className="space-y-4">
            {entries.map((entry, index) => {
              const result = results[index];
              const entryIsSafe = isResultSafe(result);
              const hasResult = result.hasResult;
              return (
                <div
                  key={entry.id}
                  className={`p-4 rounded-xl border transition-all duration-200 ${
                    hasResult
                      ? entryIsSafe
                        ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'border-red-200 bg-red-50/50 dark:bg-red-950/20'
                      : 'border-border bg-card'
                  }`}
                >
                  {/* Entry Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
                        أساس #{index + 1}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium">
                        {entry.type}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => removeEntry(entry.id)}
                      disabled={entries.length <= 1 || !isEditing}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Type Selector — always visible */}
                  <div className="mb-4 max-w-xs">
                    <Label className="text-xs text-muted-foreground">نوع الأساس</Label>
                    <Select
                      value={entry.type}
                      onValueChange={(val) => updateEntry(entry.id, 'type', val)}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="h-9 text-sm mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FOUNDATION_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dynamic Fields based on type */}
                  {renderTypeFields(entry, index)}

                  {/* Notes */}
                  <div className="mt-3 space-y-1">
                    <Label className="text-xs text-muted-foreground">ملاحظات</Label>
                    <Textarea
                      value={entry.notes}
                      onChange={(e) => updateEntry(entry.id, 'notes', e.target.value)}
                      placeholder="ملاحظات إضافية..."
                      className="min-h-[50px] text-sm resize-y"
                      rows={1}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Entry Button */}
          {isEditing && (
            <Button
              variant="outline"
              className="w-full mt-4 border-dashed border-2 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-solid"
              onClick={addEntry}
            >
              <Plus className="h-4 w-4 me-2" />
              إضافة أساس جديد
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* Section 5: النتائج — Results (Accordion)     */}
      {/* ============================================ */}
      {entries.some((_, i) => results[i]?.hasResult) && (
        <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span>نتائج فحص الأساسات</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* Summary Bar */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              {safeCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg">
                  <CheckCircle className="h-4 w-4" />
                  <span>{safeCount} آمن</span>
                </div>
              )}
              {unsafeCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm font-medium text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-3 py-1.5 rounded-lg">
                  <XCircle className="h-4 w-4" />
                  <span>{unsafeCount} غير آمن</span>
                </div>
              )}
            </div>

            {/* Accordion Results */}
            <Accordion type="multiple" className="w-full space-y-2">
              {entries.map((entry, index) => {
                const result = results[index];
                if (!result?.hasResult) return null;

                const entryName = entry.name || `أساس #${index + 1}`;
                const entryIsSafe = isResultSafe(result);

                return (
                  <AccordionItem
                    key={entry.id}
                    value={entry.id}
                    className={`rounded-xl border-2 px-1 transition-colors ${
                      entryIsSafe
                        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10'
                        : 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10'
                    }`}
                  >
                    <AccordionTrigger className="px-3 py-3 hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            entryIsSafe
                              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                              : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                          }`}
                        >
                          {entryIsSafe ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                        </div>
                        <div className="text-start">
                          <span className="text-sm font-semibold">{entryName}</span>
                          <span className="text-xs text-muted-foreground block">
                            {entry.type}
                            {entry.foundationDepth ? ` — عمق التأسيس: ${entry.foundationDepth} سم` : ''}
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-3">
                      {renderResultContent(result, entry)}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* ============================================ */}
      {/* Bottom Buttons                                */}
      {/* ============================================ */}
      <div className="flex justify-end gap-3">
        {!isEditing ? (
          <Button
            onClick={handleEdit}
            variant="outline"
            className="border-emerald-300 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 px-8"
          >
            <Edit3 className="h-4 w-4 me-2" />
            تعديل البيانات
          </Button>
        ) : (
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-8"
          >
            <Save className="h-4 w-4 me-2" />
            حفظ البيانات
          </Button>
        )}
      </div>
    </div>
  );
}
