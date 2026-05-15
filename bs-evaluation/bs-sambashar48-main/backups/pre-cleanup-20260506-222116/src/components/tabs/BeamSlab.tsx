'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Layers,
  AlertTriangle,
  Calculator,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from 'lucide-react';

// ─── Stirrup Area Table ───
const STIRRUP_AREA: Record<string, number> = {
  '6': 0.283,
  '8': 0.503,
  '10': 0.785,
  '12': 1.131,
};

// ─── Types ───
interface SlabEntry {
  id: string;
  slabType: 'solid' | 'ribbed';
  slabName: string;
  floor: string;
  slabThickness: string;
  effectiveDepth: string;
  appliedMoment: string;
  appliedShear: string;
  rebarArea: string;
  wingWidth: string;     // for ribbed - flexure b
  ribWidth: string;      // for ribbed - shear b
  notes: string;
}

interface BeamEntry {
  id: string;
  beamType: 'dropped' | 'hidden';
  beamName: string;
  floor: string;
  sectionWidth: string;
  sectionDepth: string;
  effectiveDepth: string;
  appliedMoment: string;
  appliedShear: string;
  rebarArea: string;
  stirrupDiameter: string;
  stirrupLegs: string;
  notes: string;
}

interface PunchingInput {
  columnWidth: string;
  columnDepth: string;
  slabEffectiveDepth: string;
  columnReaction: string;
}

interface BeamSlabProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
}

// ─── Calculation Result Types ───
interface FlexureResult {
  n: number;
  kd: number;
  jd: number;
  fc: number;
  fcAllowable: number;
  fs: number;
  fsAllowable: number;
  flexureSafe: boolean;
  overReinforced: boolean;
}

interface ShearResult {
  v: number;
  vc: number;
  vmax: number;
  sectionSafe: boolean;    // v <= vmax
  stirrupsNeeded: boolean;  // v > vc
  shearSafe: boolean;       // v <= vc
}

interface StirrupResult {
  asv: number;
  fs: number;
  sRequired: number;
  smax: number;
  useSmax: boolean;
}

interface PunchingResult {
  b0: number;
  vp: number;
  vcp: number;
  isSafe: boolean;
}

// ─── Factory Functions ───
const createSlabEntry = (): SlabEntry => ({
  id: crypto.randomUUID(),
  slabType: 'solid',
  slabName: '',
  floor: '',
  slabThickness: '',
  effectiveDepth: '',
  appliedMoment: '',
  appliedShear: '',
  rebarArea: '',
  wingWidth: '50',
  ribWidth: '16.5',
  notes: '',
});

const createBeamEntry = (): BeamEntry => ({
  id: crypto.randomUUID(),
  beamType: 'dropped',
  beamName: '',
  floor: '',
  sectionWidth: '',
  sectionDepth: '',
  effectiveDepth: '',
  appliedMoment: '',
  appliedShear: '',
  rebarArea: '',
  stirrupDiameter: '8',
  stirrupLegs: '2',
  notes: '',
});

const defaultPunching: PunchingInput = {
  columnWidth: '',
  columnDepth: '',
  slabEffectiveDepth: '',
  columnReaction: '',
};

const defaultParams = {
  fc: '250',
  fy: '4200',
  steelType: '240/350',
};

// ─── Pure Calculation Functions ───
function calcFlexure(
  Mw: number,
  As: number,
  fc: number,
  fy: number,
  b: number,
  d: number
): FlexureResult {
  if (Mw <= 0 || As <= 0 || fc <= 0 || fy <= 0 || b <= 0 || d <= 0) {
    return {
      n: 0, kd: 0, jd: 0, fc: 0, fcAllowable: 0, fs: 0, fsAllowable: 0,
      flexureSafe: false, overReinforced: false,
    };
  }

  const n = 2000000 / (15000 * Math.sqrt(fc));
  const nAs = n * As;
  const discriminant = nAs * nAs + 2 * nAs * b * d;
  const kd = discriminant >= 0 ? (-nAs + Math.sqrt(discriminant)) / b : 0;
  const jd = d - kd / 3;
  const Mw_kgcm = Mw * 100000;

  const fcStress = b * kd * jd > 0 ? (2 * Mw_kgcm) / (b * kd * jd) : 0;
  const fsStress = As * jd > 0 ? Mw_kgcm / (As * jd) : 0;

  const fcAllowable = 0.4 * fc;
  const fsAllowable = 0.5 * fy;

  const overReinforced = (As * fy) / (0.85 * fc * b * d) > 0.75;
  const flexureSafe = fcStress <= fcAllowable && fsStress <= fsAllowable && !overReinforced;

  return {
    n, kd, jd,
    fc: fcStress,
    fcAllowable,
    fs: fsStress,
    fsAllowable,
    flexureSafe,
    overReinforced,
  };
}

function calcShear(
  Vw: number,
  b: number,
  d: number,
  fc: number
): ShearResult {
  if (Vw <= 0 || b <= 0 || d <= 0 || fc <= 0) {
    return {
      v: 0, vc: 0, vmax: 0,
      sectionSafe: false, stirrupsNeeded: false, shearSafe: false,
    };
  }

  const v = (Vw * 1000) / (b * d);
  const vc = 0.5 * Math.sqrt(fc);
  const vmax = 2.5 * Math.sqrt(fc);

  return {
    v,
    vc,
    vmax,
    sectionSafe: v <= vmax,
    stirrupsNeeded: v > vc,
    shearSafe: v <= vc,
  };
}

function calcStirrups(
  v: number,
  vc: number,
  b: number,
  d: number,
  stirrupDiameter: string,
  stirrupLegs: string,
  steelType: string
): StirrupResult {
  const barArea = STIRRUP_AREA[stirrupDiameter] || 0.503;
  const legs = parseInt(stirrupLegs) || 2;
  const asv = barArea * legs;

  const fs = steelType === '240/350' ? 1400 : 2000;
  const vExcess = v - vc;

  const sRequired = vExcess > 0 ? (asv * fs) / (vExcess * b) : 0;
  const smax = Math.min(d / 2, 20);
  const useSmax = sRequired >= smax;

  return { asv, fs, sRequired, smax, useSmax };
}

function calcPunching(
  colW: number,
  colD: number,
  d: number,
  reaction: number,
  fc: number
): PunchingResult {
  if (colW <= 0 || colD <= 0 || d <= 0 || reaction <= 0 || fc <= 0) {
    return { b0: 0, vp: 0, vcp: 0, isSafe: false };
  }

  const b0 = 2 * ((colW + d) + (colD + d));
  const vp = (reaction * 1000) / (b0 * d);
  const vcp = 0.5 * Math.sqrt(fc);

  return { b0, vp, vcp, isSafe: vp <= vcp };
}

// ─── Result Display Chips ───
function ResultChip({
  label,
  actual,
  allowed,
  unit,
  small,
}: {
  label: string;
  actual: number;
  allowed: number;
  unit?: string;
  small?: boolean;
}) {
  const safe = allowed > 0 ? actual <= allowed : false;
  const h = small ? 'h-8' : 'h-10';
  const textSize = small ? 'text-xs' : 'text-sm';

  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground block">{label}</span>
      <div className="grid grid-cols-2 gap-1">
        <div
          className={`${h} flex flex-col items-center justify-center rounded-lg ${textSize} font-bold ${
            actual > 0
              ? safe
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
              : 'bg-muted text-muted-foreground font-medium'
          }`}
          dir="ltr"
        >
          {actual > 0 ? actual.toFixed(2) : '—'}
          {unit && <span className="text-[10px] font-normal opacity-70">{unit}</span>}
        </div>
        <div
          className={`${h} flex flex-col items-center justify-center rounded-lg ${textSize} font-semibold bg-muted`}
          dir="ltr"
        >
          {allowed > 0 ? allowed.toFixed(2) : '—'}
          {unit && <span className="text-[10px] font-normal opacity-70">{unit}</span>}
        </div>
      </div>
      <div className="flex gap-1 text-[10px] text-muted-foreground">
        <span className="truncate">الفعلي</span>
        <span>•</span>
        <span className="truncate">المسموح</span>
      </div>
    </div>
  );
}

// ─── Status Badge ───
function StatusBadge({ safe, label }: { safe: boolean; label: string }) {
  return (
    <div
      className={`h-10 flex items-center justify-center gap-1.5 rounded-lg text-sm font-bold ${
        safe
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
      }`}
    >
      {safe ? (
        <>
          <CheckCircle className="h-4 w-4" />
          {label}
        </>
      ) : (
        <>
          <XCircle className="h-4 w-4" />
          {label}
        </>
      )}
    </div>
  );
}

// ─── Main Component ───
export default function BeamSlab({ data, onSave }: BeamSlabProps) {
  // General Parameters
  const [params, setParams] = useState(() => {
    if (data.params && typeof data.params === 'object') {
      return { ...defaultParams, ...(data.params as Partial<typeof defaultParams>) };
    }
    return { ...defaultParams };
  });

  // Slab entries
  const [slabs, setSlabs] = useState<SlabEntry[]>(() => {
    if (Array.isArray(data.slabs)) {
      return (data.slabs as SlabEntry[]).map((e) => ({
        ...e,
        id: e.id || crypto.randomUUID(),
      }));
    }
    return [createSlabEntry()];
  });

  // Beam entries
  const [beams, setBeams] = useState<BeamEntry[]>(() => {
    if (Array.isArray(data.beams)) {
      return (data.beams as BeamEntry[]).map((e) => ({
        ...e,
        id: e.id || crypto.randomUUID(),
      }));
    }
    return [createBeamEntry()];
  });

  // Punching
  const [punching, setPunching] = useState<PunchingInput>(() => {
    if (data.punching && typeof data.punching === 'object') {
      return { ...defaultPunching, ...(data.punching as Partial<PunchingInput>) };
    }
    return { ...defaultPunching };
  });

  // Collapsible states
  const [openSlabCalcs, setOpenSlabCalcs] = useState<Record<string, boolean>>({});
  const [openBeamCalcs, setOpenBeamCalcs] = useState<Record<string, boolean>>({});

  // Sync state when data prop changes
  const [prevData, setPrevData] = useState(data);
  if (prevData !== data) {
    setPrevData(data);
    if (data.params && typeof data.params === 'object') {
      setParams({ ...defaultParams, ...(data.params as Partial<typeof defaultParams>) });
    }
    if (Array.isArray(data.slabs)) {
      setSlabs((data.slabs as SlabEntry[]).map((e) => ({ ...e, id: e.id || crypto.randomUUID() })));
    }
    if (Array.isArray(data.beams)) {
      setBeams((data.beams as BeamEntry[]).map((e) => ({ ...e, id: e.id || crypto.randomUUID() })));
    }
    if (data.punching && typeof data.punching === 'object') {
      setPunching({ ...defaultPunching, ...(data.punching as Partial<PunchingInput>) });
    }
  }

  // Parsed params
  const fcVal = parseFloat(params.fc) || 0;
  const fyVal = parseFloat(params.fy) || 0;

  // ─── Slab Calculations ───
  const slabResults = useMemo(() => {
    return slabs.map((slab) => {
      const thickness = parseFloat(slab.slabThickness) || 0;
      const d = parseFloat(slab.effectiveDepth) || 0;
      const Mw = parseFloat(slab.appliedMoment) || 0;
      const Vw = parseFloat(slab.appliedShear) || 0;
      const As = parseFloat(slab.rebarArea) || 0;

      let bFlexure: number;
      let bShear: number;

      if (slab.slabType === 'ribbed') {
        bFlexure = parseFloat(slab.wingWidth) || 50;
        bShear = parseFloat(slab.ribWidth) || 16.5;
      } else {
        bFlexure = 100;
        bShear = 100;
      }

      const effectiveD = d > 0 ? d : thickness - 2.5;

      const flexure = calcFlexure(Mw, As, fcVal, fyVal, bFlexure, effectiveD);
      const shear = calcShear(Vw, bShear, effectiveD, fcVal);

      return { flexure, shear, bFlexure, bShear, effectiveD };
    });
  }, [slabs, fcVal, fyVal]);

  // ─── Beam Calculations ───
  const beamResults = useMemo(() => {
    return beams.map((beam) => {
      const b = parseFloat(beam.sectionWidth) || 0;
      const d = parseFloat(beam.effectiveDepth) || 0;
      const Mw = parseFloat(beam.appliedMoment) || 0;
      const Vw = parseFloat(beam.appliedShear) || 0;
      const As = parseFloat(beam.rebarArea) || 0;

      const flexure = calcFlexure(Mw, As, fcVal, fyVal, b, d);
      const shear = calcShear(Vw, b, d, fcVal);
      const stirrups = shear.stirrupsNeeded
        ? calcStirrups(shear.v, shear.vc, b, d, beam.stirrupDiameter, beam.stirrupLegs, params.steelType)
        : null;

      return { flexure, shear, stirrups };
    });
  }, [beams, fcVal, fyVal, params.steelType]);

  // ─── Punching Calculation ───
  const punchingResult = useMemo(() => {
    const colW = parseFloat(punching.columnWidth) || 0;
    const colD = parseFloat(punching.columnDepth) || 0;
    const d = parseFloat(punching.slabEffectiveDepth) || 0;
    const reaction = parseFloat(punching.columnReaction) || 0;
    return calcPunching(colW, colD, d, reaction, fcVal);
  }, [punching, fcVal]);

  // ─── Actions ───
  const updateParam = useCallback((field: string, value: string) => {
    setParams((prev) => ({ ...prev, [field]: value }));
  }, []);

  const addSlab = useCallback(() => {
    setSlabs((prev) => [...prev, createSlabEntry()]);
  }, []);

  const removeSlab = useCallback((id: string) => {
    setSlabs((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));
  }, []);

  const updateSlab = useCallback((id: string, field: keyof SlabEntry, value: string) => {
    setSlabs((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  }, []);

  const addBeam = useCallback(() => {
    setBeams((prev) => [...prev, createBeamEntry()]);
  }, []);

  const removeBeam = useCallback((id: string) => {
    setBeams((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));
  }, []);

  const updateBeam = useCallback((id: string, field: keyof BeamEntry, value: string) => {
    setBeams((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  }, []);

  const updatePunchingField = useCallback((field: keyof PunchingInput, value: string) => {
    setPunching((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleSlabCalc = useCallback((id: string) => {
    setOpenSlabCalcs((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleBeamCalc = useCallback((id: string) => {
    setOpenBeamCalcs((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleSave = useCallback(() => {
    onSave({
      params,
      slabs,
      beams,
      punching,
    });
  }, [params, slabs, beams, punching, onSave]);

  // ─── Counters ───
  const slabSafeFlex = slabResults.filter((r) => r.flexure.flexureSafe && r.flexure.fc > 0).length;
  const slabUnsafeFlex = slabResults.filter((r) => !r.flexure.flexureSafe && r.flexure.fc > 0).length;
  const slabSafeShear = slabResults.filter((r) => r.shear.shearSafe && r.shear.v > 0).length;
  const slabUnsafeShear = slabResults.filter((r) => !r.shear.shearSafe && r.shear.v > 0).length;

  const beamSafeFlex = beamResults.filter((r) => r.flexure.flexureSafe && r.flexure.fc > 0).length;
  const beamUnsafeFlex = beamResults.filter((r) => !r.flexure.flexureSafe && r.flexure.fc > 0).length;
  const beamSafeShear = beamResults.filter((r) => r.shear.shearSafe && r.shear.v > 0).length;
  const beamUnsafeShear = beamResults.filter((r) => !r.shear.shearSafe && r.shear.v > 0).length;

  // ─── Render ───
  return (
    <div className="space-y-6">
      {/* ═══════ Section 1: General Parameters ═══════ */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Layers className="h-5 w-5" />
            </div>
            <span>المعطيات العامة - الجوائز والبلاطات</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                المقاومة الأسطوانية f&apos;c <span className="text-muted-foreground">(kg/cm²)</span>
              </Label>
              <Input
                type="number"
                value={params.fc}
                onChange={(e) => updateParam('fc', e.target.value)}
                placeholder="250"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                إجهاد خضوع الحديد fy <span className="text-muted-foreground">(kg/cm²)</span>
              </Label>
              <Input
                type="number"
                value={params.fy}
                onChange={(e) => updateParam('fy', e.target.value)}
                placeholder="4200"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">نوع الحديد</Label>
              <Select
                value={params.steelType}
                onValueChange={(v) => updateParam('steelType', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="240/350">240/350</SelectItem>
                  <SelectItem value="400/600">400/600</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════ Section 2: Slabs ═══════ */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Layers className="h-5 w-5" />
              </div>
              <span>البلاطات</span>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {slabSafeFlex > 0 && (
                <span className="text-xs bg-emerald-400/30 px-2 py-1 rounded-full text-white">
                  انعطاف آمن: {slabSafeFlex}
                </span>
              )}
              {slabUnsafeFlex > 0 && (
                <span className="text-xs bg-red-400/30 px-2 py-1 rounded-full text-white">
                  انعطاف غير آمن: {slabUnsafeFlex}
                </span>
              )}
              {slabSafeShear > 0 && (
                <span className="text-xs bg-emerald-400/30 px-2 py-1 rounded-full text-white">
                  قص آمن: {slabSafeShear}
                </span>
              )}
              {slabUnsafeShear > 0 && (
                <span className="text-xs bg-red-400/30 px-2 py-1 rounded-full text-white">
                  قص غير آمن: {slabUnsafeShear}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Formulas */}
          <div className="mb-5 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30 rounded-xl border border-teal-200/50">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-semibold text-teal-800 dark:text-teal-400">معادلات الانعطاف (العملات)</span>
            </div>
            <div className="space-y-1.5 text-sm text-foreground/80 font-mono" dir="ltr">
              <p>n = Es / Ec = 2,000,000 / (15,000 × √f&apos;c)</p>
              <p>kd = (−n×As + √((n×As)² + 2×n×As×b×d)) / b</p>
              <p>jd = d − kd/3</p>
              <p>fc = (2 × Mw × 100,000) / (b × kd × jd)</p>
              <p>fs = (Mw × 100,000) / (As × jd)</p>
              <p>
                <span className="font-semibold text-teal-700 dark:text-teal-400">Check</span> : fc ≤ 0.4×f&apos;c{' '}
                <span className="mx-1">AND</span> fs ≤ 0.5×fy → <span className="text-emerald-600">SAFE ✓</span>
              </p>
            </div>
            <div className="flex items-center gap-2 mt-3 mb-2">
              <Calculator className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-semibold text-teal-800 dark:text-teal-400">معادلات القص (البلاطات)</span>
            </div>
            <div className="space-y-1.5 text-sm text-foreground/80 font-mono" dir="ltr">
              <p>v = (Vw × 1,000) / (b × d) [kg/cm²]</p>
              <p>vc = 0.5 × √f&apos;c — لا تحتاج تسليح قص للبلاطات</p>
              <p>vmax = 2.5 × √f&apos;c — الحد الأعظمي</p>
              <p>
                <span className="font-semibold text-teal-700 dark:text-teal-400">Check</span> : v ≤ vc →{' '}
                <span className="text-emerald-600">SAFE (لا تحتاج أسوار)</span>
              </p>
            </div>
          </div>

          {/* Slab Entries */}
          <div className="space-y-4">
            {slabs.map((slab, index) => {
              const result = slabResults[index];
              const isOpen = openSlabCalcs[slab.id] || false;
              const hasResults = result.flexure.fc > 0;

              return (
                <div
                  key={slab.id}
                  className={`rounded-xl border transition-all duration-200 ${
                    hasResults
                      ? result.flexure.flexureSafe && result.shear.shearSafe
                        ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'border-red-200 bg-red-50/50 dark:bg-red-950/20'
                      : 'border-border bg-card'
                  }`}
                >
                  {/* Entry Header */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        بلاطة #{index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => removeSlab(slab.id)}
                          disabled={slabs.length <= 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Input Fields */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">نوع البلاطة</Label>
                        <Select
                          value={slab.slabType}
                          onValueChange={(v) => updateSlab(slab.id, 'slabType', v)}
                        >
                          <SelectTrigger className="h-9 text-sm w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="solid">مصمتة (Solid)</SelectItem>
                            <SelectItem value="ribbed">هوردي (Ribbed)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">اسم/موقع البلاطة</Label>
                        <Input
                          value={slab.slabName}
                          onChange={(e) => updateSlab(slab.id, 'slabName', e.target.value)}
                          placeholder="S1"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">الطابق</Label>
                        <Input
                          value={slab.floor}
                          onChange={(e) => updateSlab(slab.id, 'floor', e.target.value)}
                          placeholder="ط1"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">سماكة البلاطة (cm)</Label>
                        <Input
                          type="number"
                          value={slab.slabThickness}
                          onChange={(e) => {
                            updateSlab(slab.id, 'slabThickness', e.target.value);
                            const t = parseFloat(e.target.value);
                            if (t > 0 && !slab.effectiveDepth) {
                              updateSlab(slab.id, 'effectiveDepth', String(t - 2.5));
                            }
                          }}
                          placeholder="22"
                          className="h-9 text-sm"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">العمق الفعلي d (cm)</Label>
                        <Input
                          type="number"
                          value={slab.effectiveDepth}
                          onChange={(e) => updateSlab(slab.id, 'effectiveDepth', e.target.value)}
                          placeholder="19.5"
                          className="h-9 text-sm"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">العزم Mw (T.m)</Label>
                        <Input
                          type="number"
                          value={slab.appliedMoment}
                          onChange={(e) => updateSlab(slab.id, 'appliedMoment', e.target.value)}
                          placeholder="0"
                          className="h-9 text-sm"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">القوة القاصة Vw (ton)</Label>
                        <Input
                          type="number"
                          value={slab.appliedShear}
                          onChange={(e) => updateSlab(slab.id, 'appliedShear', e.target.value)}
                          placeholder="0"
                          className="h-9 text-sm"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">مساحة التسليح As (cm²)</Label>
                        <Input
                          type="number"
                          value={slab.rebarArea}
                          onChange={(e) => updateSlab(slab.id, 'rebarArea', e.target.value)}
                          placeholder="0"
                          className="h-9 text-sm"
                          dir="ltr"
                        />
                      </div>
                      {slab.slabType === 'ribbed' && (
                        <>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">عرض الجناح (cm)</Label>
                            <Input
                              type="number"
                              value={slab.wingWidth}
                              onChange={(e) => updateSlab(slab.id, 'wingWidth', e.target.value)}
                              placeholder="50"
                              className="h-9 text-sm"
                              dir="ltr"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">عرض العصب (cm)</Label>
                            <Input
                              type="number"
                              value={slab.ribWidth}
                              onChange={(e) => updateSlab(slab.id, 'ribWidth', e.target.value)}
                              placeholder="16.5"
                              className="h-9 text-sm"
                              dir="ltr"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Quick Status */}
                    {hasResults && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        <div
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
                            result.flexure.flexureSafe
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                          }`}
                        >
                          {result.flexure.flexureSafe ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                          الانعطاف
                        </div>
                        {result.flexure.overReinforced && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            مقطع مفرط التسليح - خطر!
                          </div>
                        )}
                        {result.shear.v > 0 && (
                          <div
                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
                              result.shear.shearSafe
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                            }`}
                          >
                            {result.shear.shearSafe ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                            القص
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Collapsible Details */}
                  <Collapsible
                    open={isOpen}
                    onOpenChange={() => toggleSlabCalc(slab.id)}
                  >
                    <CollapsibleTrigger className="w-full flex items-center justify-center gap-1.5 px-4 py-2 border-t text-xs text-muted-foreground hover:bg-muted/50 transition-colors rounded-b-xl">
                      {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {isOpen ? 'إخفاء التفاصيل الحسابية' : 'عرض التفاصيل الحسابية'}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-4 border-t bg-muted/20 space-y-4">
                        {result.flexure.fc > 0 && (
                          <>
                            {/* Flexure Details */}
                            <div>
                              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                <Calculator className="h-4 w-4 text-teal-600" />
                                تفاصيل الانعطاف
                              </h4>
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                <div className="space-y-1">
                                  <span className="text-xs text-muted-foreground block">ن (نسبة النمطية)</span>
                                  <div className="h-10 flex items-center justify-center rounded-lg bg-muted text-sm font-semibold" dir="ltr">
                                    {result.flexure.n.toFixed(2)}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-xs text-muted-foreground block">kd (cm)</span>
                                  <div className="h-10 flex items-center justify-center rounded-lg bg-muted text-sm font-semibold" dir="ltr">
                                    {result.flexure.kd.toFixed(2)}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-xs text-muted-foreground block">jd (cm)</span>
                                  <div className="h-10 flex items-center justify-center rounded-lg bg-muted text-sm font-semibold" dir="ltr">
                                    {result.flexure.jd.toFixed(2)}
                                  </div>
                                </div>
                                <ResultChip
                                  label="إجهاد البيتون fc"
                                  actual={result.flexure.fc}
                                  allowed={result.flexure.fcAllowable}
                                  unit="kg/cm²"
                                  small
                                />
                                <ResultChip
                                  label="إجهاد الحديد fs"
                                  actual={result.flexure.fs}
                                  allowed={result.flexure.fsAllowable}
                                  unit="kg/cm²"
                                  small
                                />
                                <div className="space-y-1">
                                  <span className="text-xs text-muted-foreground block">النتيجة</span>
                                  <StatusBadge
                                    safe={result.flexure.flexureSafe}
                                    label={result.flexure.flexureSafe ? 'آمن' : 'غير آمن'}
                                  />
                                </div>
                              </div>
                              {result.flexure.overReinforced && (
                                <div className="flex items-start gap-3 p-3 mt-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50">
                                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                      المقطع مفرط التسليح - خطر!
                                    </p>
                                    <p className="text-xs text-amber-600 dark:text-amber-400/80 mt-1" dir="ltr">
                                      ρ = {(parseFloat(slab.rebarArea) / (result.bFlexure * result.effectiveD)).toFixed(4)} &gt; ρmax
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Shear Details */}
                            {result.shear.v > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                  <ShieldAlert className="h-4 w-4 text-teal-600" />
                                  تفاصيل القص
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                  <ResultChip
                                    label="إجهاد القص v"
                                    actual={result.shear.v}
                                    allowed={result.shear.vc}
                                    unit="kg/cm²"
                                    small
                                  />
                                  <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground block">vmax (kg/cm²)</span>
                                    <div className="h-8 flex items-center justify-center rounded-lg bg-muted text-xs font-semibold" dir="ltr">
                                      {result.shear.vmax.toFixed(2)}
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground block">v ≤ vmax</span>
                                    <StatusBadge
                                      safe={result.shear.sectionSafe}
                                      label={result.shear.sectionSafe ? 'نعم ✓' : 'لا ✗'}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground block">v ≤ vc</span>
                                    <StatusBadge
                                      safe={result.shear.shearSafe}
                                      label={result.shear.shearSafe ? 'لا تحتاج أسوار' : 'تحتاج أسوار!'}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground block">b (انعطاف/قص)</span>
                                    <div className="h-8 flex items-center justify-center rounded-lg bg-muted text-xs font-semibold" dir="ltr">
                                      {result.bFlexure} / {result.bShear} cm
                                    </div>
                                  </div>
                                </div>
                                {!result.shear.sectionSafe && (
                                  <div className="flex items-start gap-3 p-3 mt-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200/50">
                                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                                      المقطع الخرساني غير كافٍ، يجب زيادة الأبعاد
                                    </p>
                                  </div>
                                )}
                                {!result.shear.shearSafe && result.shear.sectionSafe && (
                                  <div className="flex items-start gap-3 p-3 mt-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200/50">
                                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                                      إجهاد القص يتجاوز قدرة البيتون - البلاطة غير آمنة تجاه القص
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                        {result.flexure.fc === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            أدخل جميع المعطيات لحساب النتائج
                          </p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}
          </div>

          <Button
            variant="outline"
            className="w-full mt-4 border-dashed border-2 border-teal-300 dark:border-teal-700 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 hover:border-solid"
            onClick={addSlab}
          >
            <Plus className="h-4 w-4 me-2" />
            إضافة بلاطة جديدة
          </Button>
        </CardContent>
      </Card>

      {/* ═══════ Section 3: Beams ═══════ */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-cyan-600 to-emerald-600 text-white pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Layers className="h-5 w-5" />
              </div>
              <span>الجوائز</span>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {beamSafeFlex > 0 && (
                <span className="text-xs bg-emerald-400/30 px-2 py-1 rounded-full text-white">
                  انعطاف آمن: {beamSafeFlex}
                </span>
              )}
              {beamUnsafeFlex > 0 && (
                <span className="text-xs bg-red-400/30 px-2 py-1 rounded-full text-white">
                  انعطاف غير آمن: {beamUnsafeFlex}
                </span>
              )}
              {beamSafeShear > 0 && (
                <span className="text-xs bg-emerald-400/30 px-2 py-1 rounded-full text-white">
                  قص آمن: {beamSafeShear}
                </span>
              )}
              {beamUnsafeShear > 0 && (
                <span className="text-xs bg-red-400/30 px-2 py-1 rounded-full text-white">
                  قص غير آمن: {beamUnsafeShear}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Formulas */}
          <div className="mb-5 p-4 bg-gradient-to-r from-cyan-50 to-emerald-50 dark:from-cyan-950/30 dark:to-emerald-950/30 rounded-xl border border-cyan-200/50">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="h-4 w-4 text-cyan-600" />
              <span className="text-sm font-semibold text-cyan-800 dark:text-cyan-400">معادلات الانعطاف والقص (الجوائز)</span>
            </div>
            <div className="space-y-1.5 text-sm text-foreground/80 font-mono" dir="ltr">
              <p>Flexure: same as slabs with actual b</p>
              <p>
                <span className="font-semibold text-cyan-700 dark:text-cyan-400">Stirrups</span> (if v &gt; vc):
              </p>
              <p className="mr-4">Asv = barArea × legs | Fs = {params.steelType === '240/350' ? '1400' : '2000'} kg/cm²</p>
              <p className="mr-4">s = (Asv × Fs) / ((v − vc) × b) | smax = min(d/2, 20)</p>
              <p className="mr-4">
                If s &lt; smax → use s, else → <span className="text-amber-600">use smax with warning</span>
              </p>
            </div>
          </div>

          {/* Beam Entries */}
          <div className="space-y-4">
            {beams.map((beam, index) => {
              const result = beamResults[index];
              const isOpen = openBeamCalcs[beam.id] || false;
              const hasResults = result.flexure.fc > 0;

              return (
                <div
                  key={beam.id}
                  className={`rounded-xl border transition-all duration-200 ${
                    hasResults
                      ? result.flexure.flexureSafe && result.shear.shearSafe
                        ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'border-red-200 bg-red-50/50 dark:bg-red-950/20'
                      : 'border-border bg-card'
                  }`}
                >
                  {/* Entry Header */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        جائز #{index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => removeBeam(beam.id)}
                          disabled={beams.length <= 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Input Fields */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">نوع الجائز</Label>
                        <Select
                          value={beam.beamType}
                          onValueChange={(v) => updateBeam(beam.id, 'beamType', v)}
                        >
                          <SelectTrigger className="h-9 text-sm w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dropped">ساقط (Dropped)</SelectItem>
                            <SelectItem value="hidden">مخفي (Hidden)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">اسم/موقع الجائز</Label>
                        <Input
                          value={beam.beamName}
                          onChange={(e) => updateBeam(beam.id, 'beamName', e.target.value)}
                          placeholder="B1"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">الطابق</Label>
                        <Input
                          value={beam.floor}
                          onChange={(e) => updateBeam(beam.id, 'floor', e.target.value)}
                          placeholder="ط1"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">عرض المقطع b (cm)</Label>
                        <Input
                          type="number"
                          value={beam.sectionWidth}
                          onChange={(e) => updateBeam(beam.id, 'sectionWidth', e.target.value)}
                          placeholder="30"
                          className="h-9 text-sm"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">عمق المقطع (cm)</Label>
                        <Input
                          type="number"
                          value={beam.sectionDepth}
                          onChange={(e) => updateBeam(beam.id, 'sectionDepth', e.target.value)}
                          placeholder="60"
                          className="h-9 text-sm"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">العمق الفعلي d (cm)</Label>
                        <Input
                          type="number"
                          value={beam.effectiveDepth}
                          onChange={(e) => updateBeam(beam.id, 'effectiveDepth', e.target.value)}
                          placeholder="54"
                          className="h-9 text-sm"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">العزم Mw (T.m)</Label>
                        <Input
                          type="number"
                          value={beam.appliedMoment}
                          onChange={(e) => updateBeam(beam.id, 'appliedMoment', e.target.value)}
                          placeholder="0"
                          className="h-9 text-sm"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">القوة القاصة Vw (ton)</Label>
                        <Input
                          type="number"
                          value={beam.appliedShear}
                          onChange={(e) => updateBeam(beam.id, 'appliedShear', e.target.value)}
                          placeholder="0"
                          className="h-9 text-sm"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">مساحة التسليح As (cm²)</Label>
                        <Input
                          type="number"
                          value={beam.rebarArea}
                          onChange={(e) => updateBeam(beam.id, 'rebarArea', e.target.value)}
                          placeholder="0"
                          className="h-9 text-sm"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">قطر الأسوار</Label>
                        <Select
                          value={beam.stirrupDiameter}
                          onValueChange={(v) => updateBeam(beam.id, 'stirrupDiameter', v)}
                        >
                          <SelectTrigger className="h-9 text-sm w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="6">6mm</SelectItem>
                            <SelectItem value="8">8mm</SelectItem>
                            <SelectItem value="10">10mm</SelectItem>
                            <SelectItem value="12">12mm</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">عدد أفرع الأسوار</Label>
                        <Select
                          value={beam.stirrupLegs}
                          onValueChange={(v) => updateBeam(beam.id, 'stirrupLegs', v)}
                        >
                          <SelectTrigger className="h-9 text-sm w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="4">4</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Quick Status */}
                    {hasResults && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        <div
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
                            result.flexure.flexureSafe
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                          }`}
                        >
                          {result.flexure.flexureSafe ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                          الانعطاف
                        </div>
                        {result.flexure.overReinforced && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            مقطع مفرط التسليح - خطر!
                          </div>
                        )}
                        {result.shear.v > 0 && (
                          <>
                            <div
                              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
                                result.shear.sectionSafe
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                              }`}
                            >
                              {result.shear.sectionSafe ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                              القص (المقطع)
                            </div>
                            {result.shear.sectionSafe && (
                              <div
                                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
                                  result.stirrups
                                    ? result.stirrups.useSmax
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                }`}
                              >
                                {!result.shear.stirrupsNeeded ? (
                                  <>
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    لا تحتاج أسوار
                                  </>
                                ) : result.stirrups && result.stirrups.useSmax ? (
                                  <>
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    استخدم التباعد الأعظمي
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    الأسوار كافية
                                  </>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Collapsible Details */}
                  <Collapsible
                    open={isOpen}
                    onOpenChange={() => toggleBeamCalc(beam.id)}
                  >
                    <CollapsibleTrigger className="w-full flex items-center justify-center gap-1.5 px-4 py-2 border-t text-xs text-muted-foreground hover:bg-muted/50 transition-colors rounded-b-xl">
                      {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {isOpen ? 'إخفاء التفاصيل الحسابية' : 'عرض التفاصيل الحسابية'}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-4 border-t bg-muted/20 space-y-4">
                        {result.flexure.fc > 0 && (
                          <>
                            {/* Flexure Details */}
                            <div>
                              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                <Calculator className="h-4 w-4 text-cyan-600" />
                                تفاصيل الانعطاف
                              </h4>
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                <div className="space-y-1">
                                  <span className="text-xs text-muted-foreground block">ن (نسبة النمطية)</span>
                                  <div className="h-10 flex items-center justify-center rounded-lg bg-muted text-sm font-semibold" dir="ltr">
                                    {result.flexure.n.toFixed(2)}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-xs text-muted-foreground block">kd (cm)</span>
                                  <div className="h-10 flex items-center justify-center rounded-lg bg-muted text-sm font-semibold" dir="ltr">
                                    {result.flexure.kd.toFixed(2)}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-xs text-muted-foreground block">jd (cm)</span>
                                  <div className="h-10 flex items-center justify-center rounded-lg bg-muted text-sm font-semibold" dir="ltr">
                                    {result.flexure.jd.toFixed(2)}
                                  </div>
                                </div>
                                <ResultChip
                                  label="إجهاد البيتون fc"
                                  actual={result.flexure.fc}
                                  allowed={result.flexure.fcAllowable}
                                  unit="kg/cm²"
                                  small
                                />
                                <ResultChip
                                  label="إجهاد الحديد fs"
                                  actual={result.flexure.fs}
                                  allowed={result.flexure.fsAllowable}
                                  unit="kg/cm²"
                                  small
                                />
                                <div className="space-y-1">
                                  <span className="text-xs text-muted-foreground block">النتيجة</span>
                                  <StatusBadge
                                    safe={result.flexure.flexureSafe}
                                    label={result.flexure.flexureSafe ? 'آمن' : 'غير آمن'}
                                  />
                                </div>
                              </div>
                              {result.flexure.overReinforced && (
                                <div className="flex items-start gap-3 p-3 mt-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50">
                                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                    المقطع مفرط التسليح - خطر!
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Shear Details */}
                            {result.shear.v > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                  <ShieldAlert className="h-4 w-4 text-cyan-600" />
                                  تفاصيل القص والأسوار
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                  <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground block">v (kg/cm²)</span>
                                    <div
                                      className={`h-8 flex items-center justify-center rounded-lg text-xs font-bold ${
                                        !result.shear.sectionSafe
                                          ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                                          : result.shear.shearSafe
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                      }`}
                                      dir="ltr"
                                    >
                                      {result.shear.v.toFixed(2)}
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground block">vc (kg/cm²)</span>
                                    <div className="h-8 flex items-center justify-center rounded-lg bg-muted text-xs font-semibold" dir="ltr">
                                      {result.shear.vc.toFixed(2)}
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground block">vmax (kg/cm²)</span>
                                    <div className="h-8 flex items-center justify-center rounded-lg bg-muted text-xs font-semibold" dir="ltr">
                                      {result.shear.vmax.toFixed(2)}
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground block">v ≤ vmax</span>
                                    <StatusBadge
                                      safe={result.shear.sectionSafe}
                                      label={result.shear.sectionSafe ? 'نعم ✓' : 'لا ✗'}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground block">v ≤ vc</span>
                                    <StatusBadge
                                      safe={result.shear.shearSafe}
                                      label={result.shear.shearSafe ? 'لا تحتاج أسوار' : 'تحتاج أسوار'}
                                    />
                                  </div>
                                </div>

                                {!result.shear.sectionSafe && (
                                  <div className="flex items-start gap-3 p-3 mt-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200/50">
                                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                                      المقطع الخرساني غير كافٍ، يجب زيادة الأبعاد
                                    </p>
                                  </div>
                                )}

                                {/* Stirrup Details */}
                                {result.shear.sectionSafe && result.stirrups && (
                                  <div className="mt-4 p-3 rounded-lg border bg-card">
                                    <h5 className="text-sm font-semibold text-foreground mb-3">تفاصيل الأسوار</h5>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                      <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground block">Asv (cm²)</span>
                                        <div className="h-8 flex items-center justify-center rounded-lg bg-muted text-xs font-semibold" dir="ltr">
                                          {result.stirrups.asv.toFixed(3)}
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground block">Fs (kg/cm²)</span>
                                        <div className="h-8 flex items-center justify-center rounded-lg bg-muted text-xs font-semibold" dir="ltr">
                                          {result.stirrups.fs}
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground block">s المحسوب (cm)</span>
                                        <div className="h-8 flex items-center justify-center rounded-lg bg-muted text-xs font-semibold" dir="ltr">
                                          {result.stirrups.sRequired.toFixed(1)}
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground block">smax (cm)</span>
                                        <div className="h-8 flex items-center justify-center rounded-lg bg-muted text-xs font-semibold" dir="ltr">
                                          {result.stirrups.smax.toFixed(1)}
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground block">التباعد المستخدم (cm)</span>
                                        <div
                                          className={`h-8 flex items-center justify-center rounded-lg text-xs font-bold ${
                                            result.stirrups.useSmax
                                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                          }`}
                                          dir="ltr"
                                        >
                                          {result.stirrups.useSmax ? result.stirrups.smax.toFixed(1) : result.stirrups.sRequired.toFixed(1)}
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground block">الحالة</span>
                                        <StatusBadge
                                          safe={!result.stirrups.useSmax}
                                          label={result.stirrups.useSmax ? 'استخدم smax' : 's كافٍ'}
                                        />
                                      </div>
                                    </div>
                                    {result.stirrups.useSmax && (
                                      <div className="flex items-start gap-3 p-3 mt-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50">
                                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                          استخدم التباعد الأعظمي smax = {result.stirrups.smax.toFixed(1)} cm
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {result.shear.sectionSafe && !result.shear.stirrupsNeeded && (
                                  <div className="flex items-start gap-3 p-3 mt-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200/50">
                                    <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                                      إجهاد القص أقل من مقاومة البيتون — لا تحتاج أسوار قص (يُنصح بأسوار إنشائية)
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                        {result.flexure.fc === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            أدخل جميع المعطيات لحساب النتائج
                          </p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}
          </div>

          <Button
            variant="outline"
            className="w-full mt-4 border-dashed border-2 border-cyan-300 dark:border-cyan-700 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 hover:border-solid"
            onClick={addBeam}
          >
            <Plus className="h-4 w-4 me-2" />
            إضافة جائز جديد
          </Button>
        </CardContent>
      </Card>

      {/* ═══════ Section 4: Punching Shear for Slabs ═══════ */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <span>قص الثقب - البلاطات المسطحة (Punching Shear)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Formulas */}
          <div className="mb-5 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl border border-amber-200/50">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-800 dark:text-amber-400">معادلات قص الثقب</span>
            </div>
            <div className="space-y-1.5 text-sm text-foreground/80 font-mono" dir="ltr">
              <p>b₀ = 2 × [(a + d) + (b + d)]</p>
              <p>vp = Vact / (b₀ × d)</p>
              <p>vcp = 0.5 × √f&apos;c</p>
              <p>
                <span className="font-semibold text-amber-700 dark:text-amber-400">Check</span> : vp ≤ vcp →{' '}
                <span className="text-emerald-600">SAFE ✓</span>
              </p>
            </div>
          </div>

          {/* Punching Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                عرض العمود <span className="text-muted-foreground">(cm)</span>
              </Label>
              <Input
                type="number"
                value={punching.columnWidth}
                onChange={(e) => updatePunchingField('columnWidth', e.target.value)}
                placeholder="30"
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
                onChange={(e) => updatePunchingField('columnDepth', e.target.value)}
                placeholder="30"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                العمق الفعلي للبلاطة d <span className="text-muted-foreground">(cm)</span>
              </Label>
              <Input
                type="number"
                value={punching.slabEffectiveDepth}
                onChange={(e) => updatePunchingField('slabEffectiveDepth', e.target.value)}
                placeholder="20"
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
                onChange={(e) => updatePunchingField('columnReaction', e.target.value)}
                placeholder="0"
                dir="ltr"
              />
            </div>
          </div>

          {/* Punching Results */}
          <div className="p-4 rounded-xl border-2 border-border">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-foreground">نتائج فحص قص الثقب</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground block">b₀ (cm)</span>
                <div className="h-10 flex items-center justify-center rounded-lg bg-muted text-sm font-semibold" dir="ltr">
                  {punchingResult.b0 > 0 ? punchingResult.b0.toFixed(1) : '—'}
                </div>
              </div>
              <ResultChip
                label="vp (الفعلي)"
                actual={punchingResult.vp}
                allowed={punchingResult.vcp}
                unit="kg/cm²"
              />
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground block">vcp (المسموح)</span>
                <div className="h-10 flex items-center justify-center rounded-lg bg-muted text-sm font-semibold" dir="ltr">
                  {punchingResult.vcp > 0 ? punchingResult.vcp.toFixed(3) : '—'}
                </div>
              </div>
              <div className="space-y-1 col-span-2 sm:col-span-1">
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
                        خطر ثقب
                      </>
                    )
                  ) : (
                    '—'
                  )}
                </div>
              </div>
            </div>

            {punchingResult.vp > 0 && !punchingResult.isSafe && (
              <div className="flex items-start gap-3 p-3 mt-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200/50">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">توصية لمعالجة خطر الثقب:</p>
                  <p className="text-sm text-red-600 dark:text-red-400/80">
                    زيادة سماكة البلاطة، أو إضافة بلاطة سقوط (Drop Panel)، أو تيجان أعمدة (Column Capitals).
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ═══════ Save Button ═══════ */}
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
