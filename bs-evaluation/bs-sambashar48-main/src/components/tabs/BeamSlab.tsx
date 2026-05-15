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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  ChevronDown,
  ChevronUp,
  Ruler,
  Gauge,
} from 'lucide-react';
import {
  checkSlabThickness,
  checkBeamThickness,
  checkFlexure,
  checkShear,
  calculateStirrups,
  compareReinforcement,
  checkPunchingShear,
  calculateSlabMomentShear,
} from '@/lib/calculations';
import { useProjectStore } from '@/stores';

// =====================================================================
// Types
// =====================================================================

type SlabSubType =
  | 'oneWaySolid'
  | 'twoWaySolid'
  | 'oneWayRibbed'
  | 'twoWayRibbed'
  | 'flatSlab';

type BeamSubType = 'dropped' | 'hidden';

interface SlabEntry {
  id: string;
  slabSubType: SlabSubType;
  floor: string;
  supportCondition: string;
  span: string;
  spanLong: string;
  spanShort: string;
  hActual: string;
  coverThickness: string;
  ribHeight: string;
  hasDropPanels: string;
  load: string;
  // Reinforcement fields
  rebarCount: string;
  rebarDiameter: string;
  cover: string;
  // Punching shear (flat slab only)
  punchingColumnWidth: string;
  punchingColumnDepth: string;
  punchingReaction: string;
  punchingColumnType: string;
  notes: string;
}

interface BeamEntry {
  id: string;
  beamSubType: BeamSubType;
  name: string;
  floor: string;
  supportCondition: string;
  span: string;
  width: string;
  depth: string;
  cover: string;
  rebarCount: string;
  rebarDiameter: string;
  moment: string;
  shear: string;
  stirrupDiameter: string;
  stirrupLegs: string;
  Fs: string;
  notes: string;
}

interface BeamSlabProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
}

// =====================================================================
// Constants
// =====================================================================

const SLAB_SUB_TYPE_OPTIONS: { value: SlabSubType; label: string }[] = [
  { value: 'oneWaySolid', label: 'بلاطة مصمتة باتجاه واحد' },
  { value: 'twoWaySolid', label: 'بلاطة مصمتة باتجاهين' },
  { value: 'oneWayRibbed', label: 'بلاطة هوردي باتجاه واحد' },
  { value: 'twoWayRibbed', label: 'بلاطة هوردي باتجاهين' },
  { value: 'flatSlab', label: 'بلاطة فطرية' },
];

const BEAM_SUB_TYPE_OPTIONS: { value: BeamSubType; label: string }[] = [
  { value: 'dropped', label: 'جائز ساقط' },
  { value: 'hidden', label: 'جائز مخفي' },
];

const STANDARD_SUPPORT_CONDITIONS = [
  'بسيط',
  'مستمر من طرف واحد',
  'مستمر من طرفين',
  'كابولي حر',
];

const FLAT_SLAB_CONDITIONS = ['مع تيجان', 'بدون تيجان'];

const PUNCHING_COLUMN_TYPES = [
  { value: 'center', label: 'وسطي' },
  { value: 'edge', label: 'طرفي' },
  { value: 'corner', label: 'ركني' },
];

const STIRRUP_DIAMETER_OPTIONS = ['6', '8', '10', '12', '14'];
const REBAR_DIAMETER_OPTIONS = ['10', '12', '14', '16', '18', '20', '22', '25', '28', '32'];

// =====================================================================
// Helpers
// =====================================================================

const createSlabEntry = (): SlabEntry => ({
  id: crypto.randomUUID(),
  slabSubType: 'oneWaySolid',
  floor: '',
  supportCondition: '',
  span: '',
  spanLong: '',
  spanShort: '',
  hActual: '',
  coverThickness: '',
  ribHeight: '',
  hasDropPanels: 'بدون تيجان',
  load: '',
  rebarCount: '',
  rebarDiameter: '',
  cover: '2.5',
  punchingColumnWidth: '',
  punchingColumnDepth: '',
  punchingReaction: '',
  punchingColumnType: 'center',
  notes: '',
});

const createBeamEntry = (): BeamEntry => ({
  id: crypto.randomUUID(),
  beamSubType: 'dropped',
  name: '',
  floor: '',
  supportCondition: '',
  span: '',
  width: '',
  depth: '',
  cover: '4',
  rebarCount: '',
  rebarDiameter: '',
  moment: '',
  shear: '',
  stirrupDiameter: '8',
  stirrupLegs: '2',
  Fs: '',
  notes: '',
});

function restoreSlabEntry(raw: Record<string, unknown>): SlabEntry {
  const validSubTypes: SlabSubType[] = [
    'oneWaySolid', 'twoWaySolid', 'oneWayRibbed', 'twoWayRibbed', 'flatSlab',
  ];
  return {
    id: (raw.id as string) || crypto.randomUUID(),
    slabSubType: validSubTypes.includes(raw.slabSubType as SlabSubType)
      ? (raw.slabSubType as SlabSubType)
      : 'oneWaySolid',
    floor: (raw.floor as string) || '',
    supportCondition: (raw.supportCondition as string) || '',
    span: String(raw.span ?? ''),
    spanLong: String(raw.spanLong ?? ''),
    spanShort: String(raw.spanShort ?? ''),
    hActual: String(raw.hActual ?? ''),
    coverThickness: String(raw.coverThickness ?? ''),
    ribHeight: String(raw.ribHeight ?? ''),
    hasDropPanels: (raw.hasDropPanels as string) || 'بدون تيجان',
    load: String(raw.load ?? ''),
    rebarCount: String(raw.rebarCount ?? ''),
    rebarDiameter: String(raw.rebarDiameter ?? ''),
    cover: String(raw.cover ?? '2.5'),
    punchingColumnWidth: String(raw.punchingColumnWidth ?? ''),
    punchingColumnDepth: String(raw.punchingColumnDepth ?? ''),
    punchingReaction: String(raw.punchingReaction ?? ''),
    punchingColumnType: (raw.punchingColumnType as string) || 'center',
    notes: (raw.notes as string) || '',
  };
}

function restoreBeamEntry(raw: Record<string, unknown>): BeamEntry {
  const validSubTypes: BeamSubType[] = ['dropped', 'hidden'];
  return {
    id: (raw.id as string) || crypto.randomUUID(),
    beamSubType: validSubTypes.includes(raw.beamSubType as BeamSubType)
      ? (raw.beamSubType as BeamSubType)
      : 'dropped',
    name: (raw.name as string) || '',
    floor: (raw.floor as string) || '',
    supportCondition: (raw.supportCondition as string) || '',
    span: String(raw.span ?? ''),
    width: String(raw.width ?? ''),
    depth: String(raw.depth ?? ''),
    cover: String(raw.cover ?? '4'),
    rebarCount: String(raw.rebarCount ?? ''),
    rebarDiameter: String(raw.rebarDiameter ?? ''),
    moment: String(raw.moment ?? ''),
    shear: String(raw.shear ?? ''),
    stirrupDiameter: String(raw.stirrupDiameter ?? '8'),
    stirrupLegs: String(raw.stirrupLegs ?? '2'),
    Fs: String(raw.Fs ?? ''),
    notes: (raw.notes as string) || '',
  };
}

function getEffectiveH(slab: SlabEntry): number {
  if (slab.slabSubType === 'oneWayRibbed' || slab.slabSubType === 'twoWayRibbed') {
    return (parseFloat(slab.coverThickness) || 0) + (parseFloat(slab.ribHeight) || 0);
  }
  return parseFloat(slab.hActual) || 0;
}

function getSlabSupportCondition(slab: SlabEntry): string {
  if (slab.slabSubType === 'flatSlab') {
    return slab.hasDropPanels;
  }
  return slab.supportCondition;
}

function rebarArea(count: number, diameterMm: number): number {
  // As = n × π/4 × d² (mm² → cm²)
  return count * (Math.PI / 4) * Math.pow(diameterMm / 10, 2);
}

// =====================================================================
// Sub-components
// =====================================================================

function StatusChip({ safe, label }: { safe: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-lg ${
        safe
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
      }`}
    >
      {safe ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      {label}
    </span>
  );
}

function ResultRow({
  icon,
  label,
  value,
  safe,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  safe?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span
        className={`text-sm font-bold px-3 py-1 rounded-md ${
          safe !== undefined
            ? safe
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
            : 'bg-muted text-foreground'
        }`}
        dir="ltr"
      >
        {value}
      </span>
    </div>
  );
}

function StatusBanner({ safe, label }: { safe: boolean; label: string }) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border-2 ${
        safe
          ? 'bg-emerald-100/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
          : 'bg-red-100/50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      }`}
    >
      <div className="flex items-center gap-2">
        {safe ? (
          <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
        )}
        <span className="text-sm font-bold">{label}</span>
      </div>
      <span className="text-lg">{safe ? '✅' : '❌'}</span>
    </div>
  );
}

// =====================================================================
// Main Component
// =====================================================================

export default function BeamSlab({ data, onSave }: BeamSlabProps) {
  // Read f'c from structural report (hammer test)
  const structuralReport = useProjectStore((s) => s.projectData.structural_report);
  const fcFromReport = useMemo(() => {
    const sr = structuralReport as Record<string, unknown> | undefined;
    if (!sr) return 0;
    const hammerTest = sr.hammerTest as Record<string, unknown> | undefined;
    if (!hammerTest) return 0;
    return Number(hammerTest.fc) || 0;
  }, [structuralReport]);

  // ---- State ----
  const [isEditing, setIsEditing] = useState(true);
  const [activeElementType, setActiveElementType] = useState<'slabs' | 'beams'>('slabs');

  // General Parameters
  const [fc, setFc] = useState<string>(() => {
    const saved = data.fc;
    if (saved !== undefined && saved !== null && saved !== '') return String(saved);
    return fcFromReport > 0 ? String(fcFromReport) : '250';
  });

  const [fy, setFy] = useState<string>(() => {
    const saved = data.fy;
    if (saved !== undefined && saved !== null && saved !== '') return String(saved);
    return '4200';
  });

  // Slab entries
  const [slabs, setSlabs] = useState<SlabEntry[]>(() => {
    if (Array.isArray(data.slabs)) {
      return (data.slabs as Record<string, unknown>[]).map(restoreSlabEntry);
    }
    return [createSlabEntry()];
  });

  // Beam entries
  const [beams, setBeams] = useState<BeamEntry[]>(() => {
    if (Array.isArray(data.beams)) {
      return (data.beams as Record<string, unknown>[]).map(restoreBeamEntry);
    }
    return [createBeamEntry()];
  });

  // Collapsible states for results
  const [openResults, setOpenResults] = useState<Record<string, boolean>>({});

  // Sync state when data prop changes (project switch)
  const [prevData, setPrevData] = useState(data);
  if (prevData !== data) {
    setPrevData(data);
    const savedFc = data.fc;
    if (savedFc !== undefined && savedFc !== null && savedFc !== '') {
      setFc(String(savedFc));
    } else if (fcFromReport > 0) {
      setFc(String(fcFromReport));
    }
    const savedFy = data.fy;
    if (savedFy !== undefined && savedFy !== null && savedFy !== '') {
      setFy(String(savedFy));
    }
    if (Array.isArray(data.slabs)) {
      setSlabs((data.slabs as Record<string, unknown>[]).map(restoreSlabEntry));
    }
    if (Array.isArray(data.beams)) {
      setBeams((data.beams as Record<string, unknown>[]).map(restoreBeamEntry));
    }
    setOpenResults({});
  }

  // Parsed params
  const fcVal = parseFloat(fc) || 0;
  const fyVal = parseFloat(fy) || 0;

  // ---- Slab Actions ----
  const addSlab = useCallback(() => setSlabs((p) => [...p, createSlabEntry()]), []);
  const removeSlab = useCallback(
    (id: string) => setSlabs((p) => (p.length > 1 ? p.filter((e) => e.id !== id) : p)),
    [],
  );
  const updateSlab = useCallback(
    (id: string, field: keyof SlabEntry, value: string) =>
      setSlabs((p) => p.map((e) => (e.id === id ? { ...e, [field]: value } : e))),
    [],
  );
  const toggleResult = useCallback((id: string) => {
    setOpenResults((p) => ({ ...p, [id]: !p[id] }));
  }, []);

  // ---- Beam Actions ----
  const addBeam = useCallback(() => setBeams((p) => [...p, createBeamEntry()]), []);
  const removeBeam = useCallback(
    (id: string) => setBeams((p) => (p.length > 1 ? p.filter((e) => e.id !== id) : p)),
    [],
  );
  const updateBeam = useCallback(
    (id: string, field: keyof BeamEntry, value: string) =>
      setBeams((p) => p.map((e) => (e.id === id ? { ...e, [field]: value } : e))),
    [],
  );

  // ---- Slab Results ----
  const slabResults = useMemo(() => {
    return slabs.map((slab) => {
      const h = getEffectiveH(slab);
      const supportCond = getSlabSupportCondition(slab);
      if (h <= 0 || fcVal <= 0) {
        return {
          thicknessSafe: false, hMin: 0, hasThicknessResult: false,
          punchingSafe: false, hasPunchingResult: false,
          hasFlexureResult: false, flexureSafe: false,
          hasShearResult: false, shearSafe: false, sectionSafe: false,
          hasRebarResult: false, rebarSafe: false,
          Mgovernor: 0, fcStress: 0, fsStress: 0, fcAllow: 0, fsAllow: 0,
          overReinforced: false, kd: 0, jd: 0, nVal: 0, omega: 0,
          vActual: 0, vcVal: 0, vmaxVal: 0,
          AsProvided: 0, asMin: 0,
          Mpositive: 0, Mnegative: 0, Vshear: 0, w: 0,
        };
      }

      let spanVal = 0;
      let spanLongVal: number | undefined;
      let spanShortVal: number | undefined;

      if (slab.slabSubType === 'twoWaySolid' || slab.slabSubType === 'twoWayRibbed') {
        spanLongVal = parseFloat(slab.spanLong) || 0;
        spanShortVal = parseFloat(slab.spanShort) || 0;
        spanVal = spanLongVal || spanShortVal;
      } else {
        spanVal = parseFloat(slab.span) || 0;
      }

      if (spanVal <= 0) {
        return {
          thicknessSafe: false, hMin: 0, hasThicknessResult: false,
          punchingSafe: false, hasPunchingResult: false,
          hasFlexureResult: false, flexureSafe: false,
          hasShearResult: false, shearSafe: false, sectionSafe: false,
          hasRebarResult: false, rebarSafe: false,
          Mgovernor: 0, fcStress: 0, fsStress: 0, fcAllow: 0, fsAllow: 0,
          overReinforced: false, kd: 0, jd: 0, nVal: 0, omega: 0,
          vActual: 0, vcVal: 0, vmaxVal: 0,
          AsProvided: 0, asMin: 0,
          Mpositive: 0, Mnegative: 0, Vshear: 0, w: 0,
        };
      }

      const thicknessCheck = checkSlabThickness({
        slabType: slab.slabSubType,
        supportCondition: supportCond,
        span: spanVal,
        hActual: h,
        spanLong: spanLongVal,
        spanShort: spanShortVal,
      });

      // Punching shear for flat slabs
      let punchingSafe = false;
      let hasPunchingResult = false;
      if (slab.slabSubType === 'flatSlab') {
        const colW = parseFloat(slab.punchingColumnWidth) || 0;
        const colD = parseFloat(slab.punchingColumnDepth) || 0;
        const reaction = parseFloat(slab.punchingReaction) || 0;
        if (colW > 0 && colD > 0 && reaction > 0 && h > 0 && fcVal > 0) {
          const punchingCheck = checkPunchingShear({
            columnWidth: colW,
            columnDepth: colD,
            slabThickness: h,
            reaction,
            fc: fcVal,
            columnType: (slab.punchingColumnType as 'center' | 'edge' | 'corner') || 'center',
          });
          punchingSafe = punchingCheck.safe;
          hasPunchingResult = true;
        }
      }

      // ---- Flexure & Shear for slabs ----
      const load = parseFloat(slab.load) || 0;
      const slabCover = parseFloat(slab.cover) || 2.5;
      const nRebar = parseFloat(slab.rebarCount) || 0;
      const dRebar = parseFloat(slab.rebarDiameter) || 0;

      // Effective depth
      const d = h > slabCover ? h - slabCover : 0;

      // Slab reinforcement area (per 1m width)
      const As = nRebar > 0 && dRebar > 0 ? rebarArea(nRebar, dRebar) : 0;

      // Moment & Shear from load
      let hasFlexureResult = false;
      let flexureSafe = false;
      let hasShearResult = false;
      let shearSafe = false;
      let sectionSafe = false;
      let hasRebarResult = false;
      let rebarSafe = false;
      let Mgovernor = 0;
      let fcStress = 0;
      let fsStress = 0;
      let fcAllow = 0;
      let fsAllow = 0;
      let overReinforced = false;
      let kd = 0;
      let jd = 0;
      let nVal = 0;
      let omega = 0;
      let vActual = 0;
      let vcVal = 0;
      let vmaxVal = 0;
      let asMin = 0;
      let Mpositive = 0;
      let Mnegative = 0;
      let Vshear = 0;
      let w = 0;

      if (load > 0 && d > 0 && supportCond && fyVal > 0) {
        const shortSpan = slab.slabSubType === 'twoWaySolid' || slab.slabSubType === 'twoWayRibbed'
          ? (spanShortVal || spanVal)
          : spanVal;

        const momentShear = calculateSlabMomentShear({
          load,
          span: shortSpan,
          supportCondition: supportCond,
          slabType: slab.slabSubType,
          spanLong: spanLongVal,
          spanShort: spanShortVal,
        });

        Mgovernor = momentShear.Mgovernor;
        Mpositive = momentShear.Mpositive;
        Mnegative = momentShear.Mnegative;
        Vshear = momentShear.V;
        w = momentShear.w;

        // Flexure check (b = 100 cm strip)
        if (As > 0 && Mgovernor > 0) {
          const flex = checkFlexure({
            moment: Mgovernor,
            width: 100, // شريحة 1م
            effectiveDepth: d,
            As,
            fc: fcVal,
            fy: fyVal,
            isSlab: true,
          });
          flexureSafe = flex.safe;
          fcStress = flex.fc;
          fsStress = flex.fs;
          fcAllow = flex.fcAllowable;
          fsAllow = flex.fsAllowable;
          overReinforced = flex.overReinforced;
          kd = flex.kd;
          jd = flex.jd;
          nVal = flex.n;
          omega = As > 0 && d > 0 ? (As / (100 * d)) * fyVal / fcVal : 0;
          hasFlexureResult = true;
        }

        // Shear check (b = 100 cm strip, V is in طن/م)
        if (Vshear > 0 && d > 0) {
          const sc = checkShear({
            shear: Vshear, // طن/م — قوة القص لشريحة 1م
            width: 100,    // شريحة 1م
            effectiveDepth: d,
            fc: fcVal,
          });
          shearSafe = !sc.stirrupsNeeded;
          sectionSafe = sc.safe;
          vActual = sc.v;
          vcVal = sc.vc;
          vmaxVal = sc.vmax;
          hasShearResult = true;
        }

        // Minimum reinforcement check
        if (As > 0 && d > 0) {
          const rc = compareReinforcement({
            AsProvided: As,
            fc: fcVal,
            fy: fyVal,
            element: 'slab',
            width: 100,
            effectiveDepth: d,
          });
          rebarSafe = rc.safe;
          asMin = rc.AsMin;
          hasRebarResult = true;
        }
      }

      return {
        thicknessSafe: thicknessCheck.safe,
        hMin: thicknessCheck.hMin,
        hasThicknessResult: true,
        punchingSafe,
        hasPunchingResult,
        hasFlexureResult,
        flexureSafe,
        hasShearResult,
        shearSafe,
        sectionSafe,
        hasRebarResult,
        rebarSafe,
        Mgovernor,
        fcStress,
        fsStress,
        fcAllow,
        fsAllow,
        overReinforced,
        kd,
        jd,
        nVal,
        omega: Math.round(omega * 10000) / 10000,
        vActual,
        vcVal,
        vmaxVal,
        AsProvided: As,
        asMin,
        Mpositive,
        Mnegative,
        Vshear,
        w,
      };
    });
  }, [slabs, fcVal, fyVal]);

  // ---- Beam Results ----
  const beamResults = useMemo(() => {
    return beams.map((beam) => {
      const span = parseFloat(beam.span) || 0;
      const b = parseFloat(beam.width) || 0;
      const h = parseFloat(beam.depth) || 0;
      const cover = parseFloat(beam.cover) || 4;
      const M = parseFloat(beam.moment) || 0;
      const V = parseFloat(beam.shear) || 0;
      const nRebar = parseFloat(beam.rebarCount) || 0;
      const dRebar = parseFloat(beam.rebarDiameter) || 0;
      const dStirrup = parseFloat(beam.stirrupDiameter) || 8;
      const nLegs = parseInt(beam.stirrupLegs) || 2;
      const supportCond = beam.supportCondition;

      const d = h > cover ? h - cover : 0;
      const As = nRebar > 0 && dRebar > 0 ? rebarArea(nRebar, dRebar) : 0;

      // Thickness check
      let thicknessSafe = false;
      let hMin = 0;
      let hasThicknessResult = false;
      if (h > 0 && span > 0 && supportCond) {
        const tc = checkBeamThickness({ supportCondition: supportCond, span, hActual: h });
        thicknessSafe = tc.safe;
        hMin = tc.hMin;
        hasThicknessResult = true;
      }

      // Flexure check
      let flexureSafe = false;
      let hasFlexureResult = false;
      let fcStress = 0;
      let fsStress = 0;
      let fcAllow = 0;
      let fsAllow = 0;
      let overReinforced = false;
      let kdVal = 0;
      let jdVal = 0;
      let nFlex = 0;
      let omegaVal = 0;
      if (M > 0 && b > 0 && d > 0 && As > 0 && fcVal > 0 && fyVal > 0) {
        const flex = checkFlexure({ moment: M, width: b, effectiveDepth: d, As, fc: fcVal, fy: fyVal });
        flexureSafe = flex.safe;
        fcStress = flex.fc;
        fsStress = flex.fs;
        fcAllow = flex.fcAllowable;
        fsAllow = flex.fsAllowable;
        overReinforced = flex.overReinforced;
        kdVal = flex.kd;
        jdVal = flex.jd;
        nFlex = flex.n;
        omegaVal = As > 0 && d > 0 ? (As / (b * d)) * fyVal / fcVal : 0;
        hasFlexureResult = true;
      }

      // Shear check
      let shearSafe = false;
      let sectionSafe = false;
      let hasShearResult = false;
      let vActual = 0;
      let vcVal = 0;
      let vmaxVal = 0;
      let stirrupsNeeded = false;
      if (V > 0 && b > 0 && d > 0 && fcVal > 0) {
        const sc = checkShear({ shear: V, width: b, effectiveDepth: d, fc: fcVal });
        shearSafe = !sc.stirrupsNeeded;
        sectionSafe = sc.safe;
        vActual = sc.v;
        vcVal = sc.vc;
        vmaxVal = sc.vmax;
        stirrupsNeeded = sc.stirrupsNeeded;
        hasShearResult = true;
      }

      // Reinforcement comparison
      let rebarSafe = false;
      let hasRebarResult = false;
      let asMin = 0;
      if (As > 0 && b > 0 && d > 0 && fcVal > 0 && fyVal > 0) {
        const rc = compareReinforcement({ AsProvided: As, fc: fcVal, fy: fyVal, element: 'beam', width: b, effectiveDepth: d });
        rebarSafe = rc.safe;
        asMin = rc.AsMin;
        hasRebarResult = true;
      }

      // Stirrup calculation
      let stirrupSpacing = 0;
      let stirrupSmax = 0;
      let stirrupSafe = false;
      let hasStirrupResult = false;
      if (stirrupsNeeded && V > 0 && b > 0 && d > 0 && fcVal > 0 && fyVal > 0) {
        const st = calculateStirrups({
          shear: V, width: b, effectiveDepth: d, fc: fcVal, fy: fyVal,
          stirrupDiameter: dStirrup, stirrupLegs: nLegs,
          Fs: parseFloat(beam.Fs) || undefined,
        });
        stirrupSpacing = st.spacing;
        stirrupSmax = st.spacingMax;
        stirrupSafe = st.safe;
        hasStirrupResult = true;
      }

      return {
        thicknessSafe, hMin, hasThicknessResult,
        flexureSafe, hasFlexureResult, fcStress, fsStress, fcAllow, fsAllow, overReinforced,
        kdVal, jdVal, nFlex, omegaVal: Math.round(omegaVal * 10000) / 10000,
        shearSafe, sectionSafe, hasShearResult, vActual, vcVal, vmaxVal, stirrupsNeeded,
        rebarSafe, hasRebarResult, asMin, As,
        stirrupSpacing, stirrupSmax, stirrupSafe, hasStirrupResult,
        d, // effective depth for display
      };
    });
  }, [beams, fcVal, fyVal]);

  // Counters — slabs: safe if thickness OK and (no flexure result OR flexure OK) and (no shear result OR section OK)
  const slabSafeCount = slabResults.filter((r) =>
    r.hasThicknessResult && r.thicknessSafe
    && (!r.hasFlexureResult || r.flexureSafe)
    && (!r.hasShearResult || r.sectionSafe)
  ).length;
  const slabUnsafeCount = slabResults.filter((r) =>
    r.hasThicknessResult && (!r.thicknessSafe || (r.hasFlexureResult && !r.flexureSafe) || (r.hasShearResult && !r.sectionSafe))
  ).length;
  const beamSafeCount = beamResults.filter((r) => r.hasThicknessResult && r.thicknessSafe && r.hasFlexureResult && r.flexureSafe && (!r.hasShearResult || r.sectionSafe)).length;
  const beamUnsafeCount = beamResults.filter((r) => r.hasThicknessResult && (!r.thicknessSafe || (r.hasFlexureResult && !r.flexureSafe) || (r.hasShearResult && !r.sectionSafe))).length;

  // ---- Save ----
  const handleSave = useCallback(() => {
    const payload = {
      fc,
      fy,
      slabs: slabs.map((s) => ({
        id: s.id,
        slabSubType: s.slabSubType,
        floor: s.floor,
        supportCondition: s.supportCondition,
        span: s.span,
        spanLong: s.spanLong,
        spanShort: s.spanShort,
        hActual: s.hActual,
        coverThickness: s.coverThickness,
        ribHeight: s.ribHeight,
        hasDropPanels: s.hasDropPanels,
        load: s.load,
        rebarCount: s.rebarCount,
        rebarDiameter: s.rebarDiameter,
        cover: s.cover,
        punchingColumnWidth: s.punchingColumnWidth,
        punchingColumnDepth: s.punchingColumnDepth,
        punchingReaction: s.punchingReaction,
        punchingColumnType: s.punchingColumnType,
        notes: s.notes,
      })),
      beams: beams.map((b) => ({
        id: b.id,
        beamSubType: b.beamSubType,
        name: b.name,
        floor: b.floor,
        supportCondition: b.supportCondition,
        span: b.span,
        width: b.width,
        depth: b.depth,
        cover: b.cover,
        rebarCount: b.rebarCount,
        rebarDiameter: b.rebarDiameter,
        moment: b.moment,
        shear: b.shear,
        stirrupDiameter: b.stirrupDiameter,
        stirrupLegs: b.stirrupLegs,
        Fs: b.Fs,
        notes: b.notes,
      })),
    };
    onSave(payload);
    setIsEditing(false);
  }, [fc, fy, slabs, beams, onSave]);

  const handleEdit = useCallback(() => setIsEditing(true), []);

  // =====================================================================
  // Render
  // =====================================================================

  const currentSlabType = slabs[0]?.slabSubType || 'oneWaySolid';
  const currentBeamType = beams[0]?.beamSubType || 'dropped';

  return (
    <div className="space-y-6">
      {/* ═══════ Section A: General Parameters ═══════ */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Layers className="h-5 w-5" />
            </div>
            <span>معاملات عامة — الجوائز والبلاطات</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* f'c */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                المقاومة الاسطوانية f&apos;c{' '}
                <span className="text-muted-foreground">(كغ/سم²)</span>
              </Label>
              <Input
                type="number"
                value={fc}
                onChange={(e) => setFc(e.target.value)}
                placeholder="250"
                dir="ltr"
                disabled={!isEditing}
              />
              {fcFromReport > 0 && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  تم التعبئة التلقائية من تقرير تجربة المطرقة ({fcFromReport})
                </p>
              )}
            </div>

            {/* fy */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                إجهاد خضوع الحديد fy{' '}
                <span className="text-muted-foreground">(كغ/سم²)</span>
              </Label>
              <Input
                type="number"
                value={fy}
                onChange={(e) => setFy(e.target.value)}
                placeholder="4200"
                dir="ltr"
                disabled={!isEditing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════ Section B: Element Type Selection ═══════ */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Layers className="h-5 w-5" />
              </div>
              <span>اختيار نوع العنصر</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {activeElementType === 'slabs' && (
                <>
                  {slabSafeCount > 0 && (
                    <span className="text-xs bg-emerald-400/30 px-2.5 py-1 rounded-full text-white font-medium">
                      آمن: {slabSafeCount}
                    </span>
                  )}
                  {slabUnsafeCount > 0 && (
                    <span className="text-xs bg-red-400/30 px-2.5 py-1 rounded-full text-white font-medium">
                      غير آمن: {slabUnsafeCount}
                    </span>
                  )}
                </>
              )}
              {activeElementType === 'beams' && (
                <>
                  {beamSafeCount > 0 && (
                    <span className="text-xs bg-emerald-400/30 px-2.5 py-1 rounded-full text-white font-medium">
                      آمن: {beamSafeCount}
                    </span>
                  )}
                  {beamUnsafeCount > 0 && (
                    <span className="text-xs bg-red-400/30 px-2.5 py-1 rounded-full text-white font-medium">
                      غير آمن: {beamUnsafeCount}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Element Type Toggle */}
          <div className="flex gap-2 mb-5">
            <Button
              variant={activeElementType === 'slabs' ? 'default' : 'outline'}
              className={`flex-1 h-10 text-sm font-medium transition-all ${
                activeElementType === 'slabs'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                  : 'border-emerald-200 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
              }`}
              onClick={() => setActiveElementType('slabs')}
            >
              <Layers className="h-4 w-4 me-2" />
              بلاطات
            </Button>
            <Button
              variant={activeElementType === 'beams' ? 'default' : 'outline'}
              className={`flex-1 h-10 text-sm font-medium transition-all ${
                activeElementType === 'beams'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                  : 'border-emerald-200 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
              }`}
              onClick={() => setActiveElementType('beams')}
            >
              <Ruler className="h-4 w-4 me-2" />
              جوائز
            </Button>
          </div>

          {/* ─── SLABS ─── */}
          {activeElementType === 'slabs' && (
            <div className="space-y-4">
              {/* Slab Sub-type Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">نوع البلاطة</Label>
                <Select
                  value={currentSlabType}
                  onValueChange={(val) => {
                    const newType = val as SlabSubType;
                    setSlabs([createSlabEntry()]);
                    // Set default support condition
                    const entry = createSlabEntry();
                    entry.slabSubType = newType;
                    if (newType === 'flatSlab') {
                      entry.hasDropPanels = 'بدون تيجان';
                    } else {
                      entry.supportCondition = 'بسيط';
                    }
                    setSlabs([entry]);
                  }}
                  disabled={!isEditing}
                >
                  <SelectTrigger className="w-full h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SLAB_SUB_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Slab Entries */}
              {slabs.map((slab, index) => {
                const result = slabResults[index];
                const isOpen = openResults[slab.id] || false;
                const isTwoWay = slab.slabSubType === 'twoWaySolid' || slab.slabSubType === 'twoWayRibbed';
                const isRibbed = slab.slabSubType === 'oneWayRibbed' || slab.slabSubType === 'twoWayRibbed';
                const isFlat = slab.slabSubType === 'flatSlab';
                const supportConditions = isFlat ? FLAT_SLAB_CONDITIONS : STANDARD_SUPPORT_CONDITIONS;
                const h = getEffectiveH(slab);

                return (
                  <div
                    key={slab.id}
                    className={`p-4 rounded-xl border transition-all duration-200 ${
                      result.hasThicknessResult
                        ? result.thicknessSafe
                          ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20'
                          : 'border-red-200 bg-red-50/50 dark:bg-red-950/20'
                        : 'border-border bg-card'
                    }`}
                  >
                    {/* Entry Header */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
                        بلاطة #{index + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => removeSlab(slab.id)}
                        disabled={slabs.length <= 1 || !isEditing}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Floor */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">الطابق</Label>
                        <Input
                          value={slab.floor}
                          onChange={(e) => updateSlab(slab.id, 'floor', e.target.value)}
                          placeholder="ط1"
                          className="h-9 text-sm"
                          disabled={!isEditing}
                        />
                      </div>

                      {/* Support Condition */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          {isFlat ? 'تيجان' : 'طبيعة الاستناد'}
                        </Label>
                        <Select
                          value={isFlat ? slab.hasDropPanels : slab.supportCondition}
                          onValueChange={(val) => {
                            if (isFlat) {
                              updateSlab(slab.id, 'hasDropPanels', val);
                            } else {
                              updateSlab(slab.id, 'supportCondition', val);
                            }
                          }}
                          disabled={!isEditing}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="اختر..." />
                          </SelectTrigger>
                          <SelectContent>
                            {supportConditions.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Spans */}
                      {isTwoWay ? (
                        <>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">المجاز الطويل (سم)</Label>
                            <Input
                              type="number"
                              value={slab.spanLong}
                              onChange={(e) => updateSlab(slab.id, 'spanLong', e.target.value)}
                              placeholder="0"
                              className="h-9 text-sm"
                              dir="ltr"
                              disabled={!isEditing}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">المجاز القصير (سم)</Label>
                            <Input
                              type="number"
                              value={slab.spanShort}
                              onChange={(e) => updateSlab(slab.id, 'spanShort', e.target.value)}
                              placeholder="0"
                              className="h-9 text-sm"
                              dir="ltr"
                              disabled={!isEditing}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">المجاز (سم)</Label>
                          <Input
                            type="number"
                            value={slab.span}
                            onChange={(e) => updateSlab(slab.id, 'span', e.target.value)}
                            placeholder="0"
                            className="h-9 text-sm"
                            dir="ltr"
                            disabled={!isEditing}
                          />
                        </div>
                      )}

                      {/* Thickness fields */}
                      {isRibbed ? (
                        <>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">سمك الغطاء (سم)</Label>
                            <Input
                              type="number"
                              value={slab.coverThickness}
                              onChange={(e) => updateSlab(slab.id, 'coverThickness', e.target.value)}
                              placeholder="0"
                              className="h-9 text-sm"
                              dir="ltr"
                              disabled={!isEditing}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">ارتفاع العصب (سم)</Label>
                            <Input
                              type="number"
                              value={slab.ribHeight}
                              onChange={(e) => updateSlab(slab.id, 'ribHeight', e.target.value)}
                              placeholder="0"
                              className="h-9 text-sm"
                              dir="ltr"
                              disabled={!isEditing}
                            />
                          </div>
                        </>
                      ) : !isTwoWay ? (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">السماكة المنفذة h (سم)</Label>
                          <Input
                            type="number"
                            value={slab.hActual}
                            onChange={(e) => updateSlab(slab.id, 'hActual', e.target.value)}
                            placeholder="0"
                            className="h-9 text-sm"
                            dir="ltr"
                            disabled={!isEditing}
                          />
                        </div>
                      ) : null}

                      {/* Two-way solid also needs hActual */}
                      {isTwoWay && !isRibbed && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">السماكة المنفذة h (سم)</Label>
                          <Input
                            type="number"
                            value={slab.hActual}
                            onChange={(e) => updateSlab(slab.id, 'hActual', e.target.value)}
                            placeholder="0"
                            className="h-9 text-sm"
                            dir="ltr"
                            disabled={!isEditing}
                          />
                        </div>
                      )}

                      {/* Load */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">الحمولة (طن/م²)</Label>
                        <Input
                          type="number"
                          value={slab.load}
                          onChange={(e) => updateSlab(slab.id, 'load', e.target.value)}
                          placeholder="0"
                          className="h-9 text-sm"
                          dir="ltr"
                          disabled={!isEditing}
                        />
                      </div>

                      {/* Reinforcement Section */}
                      <div className="col-span-full mt-1 mb-1">
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          بيانات التسليح (للحسبة الإنشائية)
                        </div>
                      </div>

                      {/* Rebar Count */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">عدد حديد التسليح / م</Label>
                        <Input
                          type="number"
                          value={slab.rebarCount}
                          onChange={(e) => updateSlab(slab.id, 'rebarCount', e.target.value)}
                          placeholder="0"
                          className="h-9 text-sm"
                          dir="ltr"
                          disabled={!isEditing}
                        />
                      </div>

                      {/* Rebar Diameter */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">قطر الحديد (مم)</Label>
                        <Select
                          value={slab.rebarDiameter}
                          onValueChange={(v) => updateSlab(slab.id, 'rebarDiameter', v)}
                          disabled={!isEditing}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="اختر..." />
                          </SelectTrigger>
                          <SelectContent>
                            {REBAR_DIAMETER_OPTIONS.map((d) => (
                              <SelectItem key={d} value={d}>
                                {d} مم
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Cover */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">الغطاء (سم)</Label>
                        <Input
                          type="number"
                          value={slab.cover}
                          onChange={(e) => updateSlab(slab.id, 'cover', e.target.value)}
                          placeholder="2.5"
                          className="h-9 text-sm"
                          dir="ltr"
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    {/* Punching Shear Fields (flat slab only) */}
                    {isFlat && (
                      <div className="mt-3 p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                          <ShieldCheck className="h-4 w-4" />
                          بيانات فحص قص الثقب
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">عرض العمود (سم)</Label>
                            <Input
                              type="number"
                              value={slab.punchingColumnWidth}
                              onChange={(e) => updateSlab(slab.id, 'punchingColumnWidth', e.target.value)}
                              placeholder="0"
                              className="h-9 text-sm"
                              dir="ltr"
                              disabled={!isEditing}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">عمق العمود (سم)</Label>
                            <Input
                              type="number"
                              value={slab.punchingColumnDepth}
                              onChange={(e) => updateSlab(slab.id, 'punchingColumnDepth', e.target.value)}
                              placeholder="0"
                              className="h-9 text-sm"
                              dir="ltr"
                              disabled={!isEditing}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">رد فعل العمود (طن)</Label>
                            <Input
                              type="number"
                              value={slab.punchingReaction}
                              onChange={(e) => updateSlab(slab.id, 'punchingReaction', e.target.value)}
                              placeholder="0"
                              className="h-9 text-sm"
                              dir="ltr"
                              disabled={!isEditing}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">نوع العمود</Label>
                            <Select
                              value={slab.punchingColumnType}
                              onValueChange={(v) => updateSlab(slab.id, 'punchingColumnType', v)}
                              disabled={!isEditing}
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PUNCHING_COLUMN_TYPES.map((ct) => (
                                  <SelectItem key={ct.value} value={ct.value}>
                                    {ct.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    <div className="mt-3 space-y-1">
                      <Label className="text-xs text-muted-foreground">ملاحظات</Label>
                      <Textarea
                        value={slab.notes}
                        onChange={(e) => updateSlab(slab.id, 'notes', e.target.value)}
                        placeholder="ملاحظات إضافية..."
                        className="min-h-[50px] text-sm resize-y"
                        rows={1}
                        disabled={!isEditing}
                      />
                    </div>

                    {/* Inline Results Toggle */}
                    {(result.hasThicknessResult || result.hasPunchingResult || result.hasFlexureResult || result.hasShearResult) && (
                      <Collapsible open={isOpen} onOpenChange={() => toggleResult(slab.id)}>
                        <CollapsibleTrigger className="w-full flex items-center justify-center gap-1.5 px-4 py-2 mt-3 border-t text-xs text-muted-foreground hover:bg-muted/50 transition-colors rounded-b-xl">
                          {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          {isOpen ? 'إخفاء النتائج' : 'عرض النتائج'}
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="pt-3 space-y-2">
                            {/* Thickness Result */}
                            {result.hasThicknessResult && (
                              <>
                                <ResultRow
                                  icon={<Ruler className="h-4 w-4 text-muted-foreground" />}
                                  label="السماكة الدنيا المطلوبة"
                                  value={`${result.hMin.toFixed(1)} سم`}
                                />
                                <ResultRow
                                  icon={<Ruler className="h-4 w-4 text-muted-foreground" />}
                                  label="السماكة المنفذة"
                                  value={`${h.toFixed(1)} سم`}
                                />
                                <StatusBanner
                                  safe={result.thicknessSafe}
                                  label={result.thicknessSafe ? 'شرط السماكة — محقق' : 'شرط السماكة — غير محقق'}
                                />
                              </>
                            )}

                            {/* Moment & Flexure Check */}
                            {result.hasFlexureResult && (
                              <>
                                <div className="pt-2" />
                                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
                                  فحص الانعطاف (شريحة 1م)
                                </div>
                                {result.Mpositive > 0 && (
                                  <ResultRow
                                    icon={<Gauge className="h-4 w-4 text-muted-foreground" />}
                                    label="العزم الموجب M+ (طن.سم/م)"
                                    value={`${result.Mpositive.toFixed(2)}`}
                                  />
                                )}
                                {result.Mnegative > 0 && (
                                  <ResultRow
                                    icon={<Gauge className="h-4 w-4 text-muted-foreground" />}
                                    label="العزم السالب M- (طن.سم/م)"
                                    value={`${result.Mnegative.toFixed(2)}`}
                                  />
                                )}
                                <ResultRow
                                  icon={<Gauge className="h-4 w-4 text-muted-foreground" />}
                                  label="إجهاد الخرسانة fc"
                                  value={`${result.fcStress.toFixed(2)} / ${result.fcAllow.toFixed(2)} كغ/سم²`}
                                  safe={result.fcStress <= result.fcAllow}
                                />
                                <ResultRow
                                  icon={<Gauge className="h-4 w-4 text-muted-foreground" />}
                                  label="إجهاد الحديد fs"
                                  value={`${result.fsStress.toFixed(2)} / ${result.fsAllow.toFixed(2)} كغ/سم²`}
                                  safe={result.fsStress <= result.fsAllow}
                                />
                                <ResultRow
                                  icon={<Ruler className="h-4 w-4 text-muted-foreground" />}
                                  label="العمق الفعال d / kd / jd"
                                  value={`${(h - (parseFloat(slab.cover) || 2.5)).toFixed(1)} / ${result.kd.toFixed(2)} / ${result.jd.toFixed(2)} سم`}
                                />
                                <ResultRow
                                  icon={<Ruler className="h-4 w-4 text-muted-foreground" />}
                                  label="نسبة التسليح ω"
                                  value={`${result.omega.toFixed(4)}`}
                                  safe={result.omega <= 0.6375}
                                />
                                {result.overReinforced && (
                                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                    <span className="text-xs text-amber-700 dark:text-amber-300">مقطع مُصلح (تسليح زائد — ω &gt; 0.6375)</span>
                                  </div>
                                )}
                                <StatusBanner
                                  safe={result.flexureSafe}
                                  label={result.flexureSafe ? 'فحص الانعطاف — محقق' : 'فحص الانعطاف — غير محقق'}
                                />
                              </>
                            )}

                            {/* Shear Check */}
                            {result.hasShearResult && (
                              <>
                                <div className="pt-2" />
                                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
                                  فحص القص (شريحة 1م)
                                </div>
                                <ResultRow
                                  icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
                                  label="إجهاد القص v"
                                  value={`${result.vActual.toFixed(2)} كغ/سم²`}
                                  safe={result.vActual <= result.vcVal}
                                />
                                <ResultRow
                                  icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
                                  label="مقاومة الخرسانة للقص vc"
                                  value={`${result.vcVal.toFixed(2)} كغ/سم²`}
                                />
                                <StatusBanner
                                  safe={result.sectionSafe}
                                  label={result.sectionSafe ? 'فحص القص — محقق' : 'فحص القص — غير محقق'}
                                />
                              </>
                            )}

                            {/* Minimum Reinforcement */}
                            {result.hasRebarResult && (
                              <>
                                <div className="pt-2" />
                                <ResultRow
                                  icon={<Ruler className="h-4 w-4 text-muted-foreground" />}
                                  label="التسليح المقدم"
                                  value={`${result.AsProvided.toFixed(2)} سم²/م`}
                                  safe={result.rebarSafe}
                                />
                                <ResultRow
                                  icon={<Ruler className="h-4 w-4 text-muted-foreground" />}
                                  label="التسليح الدنيا المطلوب"
                                  value={`${result.asMin.toFixed(2)} سم²/م`}
                                />
                                <StatusBanner
                                  safe={result.rebarSafe}
                                  label={result.rebarSafe ? 'شرط التسليح الدنيا — محقق' : 'شرط التسليح الدنيا — غير محقق'}
                                />
                              </>
                            )}

                            {/* Punching Shear Result */}
                            {isFlat && result.hasPunchingResult && (
                              <div className="pt-2">
                                <StatusBanner
                                  safe={result.punchingSafe}
                                  label={result.punchingSafe ? 'قص الثقب — آمن (محقق)' : 'قص الثقب — غير آمن (غير محقق)'}
                                />
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                );
              })}

              {/* Add Slab */}
              {isEditing && (
                <Button
                  variant="outline"
                  className="w-full mt-2 border-dashed border-2 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-solid"
                  onClick={addSlab}
                >
                  <Plus className="h-4 w-4 me-2" />
                  إضافة بلاطة جديدة
                </Button>
              )}
            </div>
          )}

          {/* ─── BEAMS ─── */}
          {activeElementType === 'beams' && (
            <div className="space-y-4">
              {/* Beam Sub-type Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">نوع الجائز</Label>
                <Select
                  value={currentBeamType}
                  onValueChange={(val) => {
                    const newType = val as BeamSubType;
                    const entry = createBeamEntry();
                    entry.beamSubType = newType;
                    if (newType === 'hidden') {
                      entry.cover = '2.5';
                    }
                    setBeams([entry]);
                  }}
                  disabled={!isEditing}
                >
                  <SelectTrigger className="w-full h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BEAM_SUB_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currentBeamType === 'hidden' && (
                  <p className="text-[10px] text-muted-foreground">
                    الجائز المخفي يأخذ سماكة البلاطة الهوردية. أدخل السماكة الكلية للبلاطة في حقل "عمق المقطع".
                  </p>
                )}
              </div>

              {/* Beam Entries */}
              {beams.map((beam, index) => {
                const result = beamResults[index];
                const isOpen = openResults[beam.id] || false;
                const isHidden = beam.beamSubType === 'hidden';

                return (
                  <div
                    key={beam.id}
                    className={`p-4 rounded-xl border transition-all duration-200 ${
                      result.hasThicknessResult
                        ? result.thicknessSafe && result.flexureSafe !== false && result.sectionSafe !== false
                          ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20'
                          : 'border-red-200 bg-red-50/50 dark:bg-red-950/20'
                        : 'border-border bg-card'
                    }`}
                  >
                    {/* Entry Header */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
                        {isHidden ? 'جائز مخفي' : 'جائز ساقط'} #{index + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => removeBeam(beam.id)}
                        disabled={beams.length <= 1 || !isEditing}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Name */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">اسم الجائز</Label>
                        <Input
                          value={beam.name}
                          onChange={(e) => updateBeam(beam.id, 'name', e.target.value)}
                          placeholder={`B${index + 1}`}
                          className="h-9 text-sm"
                          disabled={!isEditing}
                        />
                      </div>

                      {/* Floor */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">الطابق</Label>
                        <Input
                          value={beam.floor}
                          onChange={(e) => updateBeam(beam.id, 'floor', e.target.value)}
                          placeholder="ط1"
                          className="h-9 text-sm"
                          disabled={!isEditing}
                        />
                      </div>

                      {/* Support Condition */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">طبيعة الاستناد</Label>
                        <Select
                          value={beam.supportCondition}
                          onValueChange={(val) => updateBeam(beam.id, 'supportCondition', val)}
                          disabled={!isEditing}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="اختر..." />
                          </SelectTrigger>
                          <SelectContent>
                            {STANDARD_SUPPORT_CONDITIONS.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Span */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">المجاز (سم)</Label>
                        <Input
                          type="number"
                          value={beam.span}
                          onChange={(e) => updateBeam(beam.id, 'span', e.target.value)}
                          placeholder="0"
                          className="h-9 text-sm"
                          dir="ltr"
                          disabled={!isEditing}
                        />
                      </div>

                      {/* Width */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          عرض المقطع b (سم)
                        </Label>
                        <Input
                          type="number"
                          value={beam.width}
                          onChange={(e) => updateBeam(beam.id, 'width', e.target.value)}
                          placeholder={isHidden ? 'عرض العصب' : '0'}
                          className="h-9 text-sm"
                          dir="ltr"
                          disabled={!isEditing}
                        />
                      </div>

                      {/* Depth */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          {isHidden ? 'سماكة البلاطة الكلية h (سم)' : 'عمق المقطع h (سم)'}
                        </Label>
                        <Input
                          type="number"
                          value={beam.depth}
                          onChange={(e) => updateBeam(beam.id, 'depth', e.target.value)}
                          placeholder={isHidden ? 'سمك الغطاء + العصب' : '0'}
                          className="h-9 text-sm"
                          dir="ltr"
                          disabled={!isEditing}
                        />
                      </div>

                      {/* Cover */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">الغطاء (سم)</Label>
                        <Input
                          type="number"
                          value={beam.cover}
                          onChange={(e) => updateBeam(beam.id, 'cover', e.target.value)}
                          placeholder="4"
                          className="h-9 text-sm"
                          dir="ltr"
                          disabled={!isEditing}
                        />
                      </div>

                      {/* Rebar Count */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">عدد حديد التسليح</Label>
                        <Input
                          type="number"
                          value={beam.rebarCount}
                          onChange={(e) => updateBeam(beam.id, 'rebarCount', e.target.value)}
                          placeholder="0"
                          className="h-9 text-sm"
                          dir="ltr"
                          disabled={!isEditing}
                        />
                      </div>

                      {/* Rebar Diameter */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">قطر الحديد (مم)</Label>
                        <Select
                          value={beam.rebarDiameter}
                          onValueChange={(v) => updateBeam(beam.id, 'rebarDiameter', v)}
                          disabled={!isEditing}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="اختر..." />
                          </SelectTrigger>
                          <SelectContent>
                            {REBAR_DIAMETER_OPTIONS.map((d) => (
                              <SelectItem key={d} value={d}>
                                {d} مم
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Moment */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">العزم (طن.سم)</Label>
                        <Input
                          type="number"
                          value={beam.moment}
                          onChange={(e) => updateBeam(beam.id, 'moment', e.target.value)}
                          placeholder="0"
                          className="h-9 text-sm"
                          dir="ltr"
                          disabled={!isEditing}
                        />
                      </div>

                      {/* Shear */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">القوة القاصة (طن)</Label>
                        <Input
                          type="number"
                          value={beam.shear}
                          onChange={(e) => updateBeam(beam.id, 'shear', e.target.value)}
                          placeholder="0"
                          className="h-9 text-sm"
                          dir="ltr"
                          disabled={!isEditing}
                        />
                      </div>

                      {/* Stirrup Diameter */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">قطر الأسوار (مم)</Label>
                        <Select
                          value={beam.stirrupDiameter}
                          onValueChange={(v) => updateBeam(beam.id, 'stirrupDiameter', v)}
                          disabled={!isEditing}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STIRRUP_DIAMETER_OPTIONS.map((d) => (
                              <SelectItem key={d} value={d}>
                                {d} مم
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Stirrup Legs */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">عدد فروع الأسوار</Label>
                        <Select
                          value={beam.stirrupLegs}
                          onValueChange={(v) => updateBeam(beam.id, 'stirrupLegs', v)}
                          disabled={!isEditing}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6].map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Fs — Stirrup Steel Stress */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">إجهاد الحديد للأساور Fs (كغ/سم²)</Label>
                        <Input
                          type="number"
                          value={beam.Fs}
                          onChange={(e) => updateBeam(beam.id, 'Fs', e.target.value)}
                          placeholder="0.5 × fy"
                          className="h-9 text-sm"
                          dir="ltr"
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="mt-3 space-y-1">
                      <Label className="text-xs text-muted-foreground">ملاحظات</Label>
                      <Textarea
                        value={beam.notes}
                        onChange={(e) => updateBeam(beam.id, 'notes', e.target.value)}
                        placeholder="ملاحظات إضافية..."
                        className="min-h-[50px] text-sm resize-y"
                        rows={1}
                        disabled={!isEditing}
                      />
                    </div>

                    {/* Inline Results Toggle */}
                    {(result.hasThicknessResult || result.hasFlexureResult || result.hasShearResult) && (
                      <Collapsible open={isOpen} onOpenChange={() => toggleResult(beam.id)}>
                        <CollapsibleTrigger className="w-full flex items-center justify-center gap-1.5 px-4 py-2 mt-3 border-t text-xs text-muted-foreground hover:bg-muted/50 transition-colors rounded-b-xl">
                          {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          {isOpen ? 'إخفاء النتائج' : 'عرض النتائج'}
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="pt-3 space-y-2">
                            {/* Thickness Check */}
                            {result.hasThicknessResult && (
                              <>
                                <ResultRow
                                  icon={<Ruler className="h-4 w-4 text-muted-foreground" />}
                                  label="السماكة الدنيا المطلوبة"
                                  value={`${result.hMin.toFixed(1)} سم`}
                                />
                                <StatusBanner
                                  safe={result.thicknessSafe}
                                  label={result.thicknessSafe ? 'شرط السماكة — محقق' : 'شرط السماكة — غير محقق'}
                                />
                              </>
                            )}

                            {/* Flexure Check */}
                            {result.hasFlexureResult && (
                              <>
                                <div className="pt-2" />
                                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
                                  فحص الانعطاف
                                </div>
                                <ResultRow
                                  icon={<Ruler className="h-4 w-4 text-muted-foreground" />}
                                  label="n / kd / jd"
                                  value={`${result.nFlex} / ${result.kdVal.toFixed(2)} / ${result.jdVal.toFixed(2)} سم`}
                                />
                                <ResultRow
                                  icon={<Gauge className="h-4 w-4 text-muted-foreground" />}
                                  label="إجهاد الخرسانة fc"
                                  value={`${result.fcStress.toFixed(2)} / ${result.fcAllow.toFixed(2)} كغ/سم²`}
                                  safe={result.fcStress <= result.fcAllow}
                                />
                                <ResultRow
                                  icon={<Gauge className="h-4 w-4 text-muted-foreground" />}
                                  label="إجهاد الحديد fs"
                                  value={`${result.fsStress.toFixed(2)} / ${result.fsAllow.toFixed(2)} كغ/سم²`}
                                  safe={result.fsStress <= result.fsAllow}
                                />
                                <ResultRow
                                  icon={<Ruler className="h-4 w-4 text-muted-foreground" />}
                                  label="نسبة التسليح ω"
                                  value={`${result.omegaVal.toFixed(4)}`}
                                  safe={result.omegaVal <= 0.6375}
                                />
                                {result.overReinforced && (
                                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                    <span className="text-xs text-amber-700 dark:text-amber-300">مقطع مُصلح (تسليح زائد — ω &gt; 0.6375)</span>
                                  </div>
                                )}
                                <StatusBanner
                                  safe={result.flexureSafe}
                                  label={result.flexureSafe ? 'فحص الانعطاف — محقق' : 'فحص الانعطاف — غير محقق'}
                                />
                              </>
                            )}

                            {/* Shear Check */}
                            {result.hasShearResult && (
                              <>
                                <div className="pt-2" />
                                <ResultRow
                                  icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
                                  label="إجهاد القص v"
                                  value={`${result.vActual.toFixed(2)} كغ/سم²`}
                                  safe={result.vActual <= result.vcVal}
                                />
                                <ResultRow
                                  icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
                                  label="مقاومة الخرسانة للقص vc"
                                  value={`${result.vcVal.toFixed(2)} كغ/سم²`}
                                />
                                <StatusBanner
                                  safe={result.sectionSafe}
                                  label={result.sectionSafe ? 'فحص القص — محقق (v ≤ vmax)' : 'فحص القص — غير محقق (يتجاوز vmax)'}
                                />
                                {result.stirrupsNeeded && (
                                  <StatusBanner
                                    safe={result.shearSafe}
                                    label={result.shearSafe ? 'لا تحتاج أسوار (v ≤ vc)' : 'تحتاج أسوار قص (v > vc)'}
                                  />
                                )}
                              </>
                            )}

                            {/* Reinforcement Comparison */}
                            {result.hasRebarResult && (
                              <>
                                <div className="pt-2" />
                                <ResultRow
                                  icon={<Ruler className="h-4 w-4 text-muted-foreground" />}
                                  label="التسليح المقدم"
                                  value={`${result.As.toFixed(2)} سم²`}
                                  safe={result.rebarSafe}
                                />
                                <ResultRow
                                  icon={<Ruler className="h-4 w-4 text-muted-foreground" />}
                                  label="التسليح الدنيا المطلوب"
                                  value={`${result.asMin.toFixed(2)} سم²`}
                                />
                                <StatusBanner
                                  safe={result.rebarSafe}
                                  label={result.rebarSafe ? 'شرط التسليح الدنيا — محقق' : 'شرط التسليح الدنيا — غير محقق'}
                                />
                              </>
                            )}

                            {/* Stirrup Spacing */}
                            {result.hasStirrupResult && (
                              <>
                                <div className="pt-2" />
                                <ResultRow
                                  icon={<Ruler className="h-4 w-4 text-muted-foreground" />}
                                  label="التباعد الأقصى smax"
                                  value={`${result.stirrupSmax} سم`}
                                />
                                <ResultRow
                                  icon={<Ruler className="h-4 w-4 text-muted-foreground" />}
                                  label="تباعد الأطواق المحسوب"
                                  value={`${result.stirrupSpacing} سم`}
                                  safe={result.stirrupSafe}
                                />
                                <StatusBanner
                                  safe={result.stirrupSafe}
                                  label={result.stirrupSafe ? 'الأطواق كافية — محقق' : 'الأطواق غير كافية — غير محقق'}
                                />
                              </>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                );
              })}

              {/* Add Beam */}
              {isEditing && (
                <Button
                  variant="outline"
                  className="w-full mt-2 border-dashed border-2 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-solid"
                  onClick={addBeam}
                >
                  <Plus className="h-4 w-4 me-2" />
                  إضافة جائز جديد
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════ Bottom Buttons ═══════ */}
      <div className="flex justify-end gap-3">
        {!isEditing ? (
          <Button
            onClick={handleEdit}
            variant="outline"
            className="border-emerald-300 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 px-8"
          >
            <Edit3 className="h-4 w-4 me-2" />
            تعديل
          </Button>
        ) : (
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-8"
          >
            <Save className="h-4 w-4 me-2" />
            حفظ
          </Button>
        )}
      </div>
    </div>
  );
}
