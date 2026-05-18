/**
 * B.S Evaluation — Engineering Calculation Engine
 * Working Stress Design (WSD) — Syrian Arab Code 2024 (6th Edition)
 * الطبعة السادسة — الكود العربي السوري 2024
 * طريقة التشغيل (الكلاسيكية) — الوحدات: كغ/سم² , طن , سم
 */

import { WSD, SLAB_ALPHA, BEAM_ALPHA, TWO_WAY_EQUIVALENT, RIBBED_SLAB_CONSTRAINTS, FLAT_SLAB_CONSTRAINTS } from './constants';

// ===================================================================
// أنواع النتائج
// ===================================================================
export interface CalcResult {
  safe: boolean;
  status: 'محقق' | 'غير محقق';
  statusAr: string;
}

export interface SlabThicknessResult extends CalcResult {
  hMin: number;
  hActual: number;
  formula: string;
}

export interface StressCheckResult extends CalcResult {
  actual: number;
  allowable: number;
  ratio: number;
}

export interface PunchingShearResult extends CalcResult {
  vp: number;
  actualStress: number;
  bo: number;
  formula: string;
}

export interface FlexureCheckResult extends CalcResult {
  kd: number;
  jd: number;
  fc: number;
  fs: number;
  fcAllowable: number;
  fsAllowable: number;
  n: number;
  overReinforced: boolean;
}

export interface ShearCheckResult extends CalcResult {
  v: number;
  vc: number;
  vmax: number;
  stirrupsNeeded: boolean;
}

export interface StirrupResult {
  spacing: number;
  spacingMax: number;
  useSmax: boolean;
  areaRequired: number;
  areaProvided: number;
  safe: boolean;
  isHighShear: boolean;
}

// ===================================================================
// أنواع نتائج الأساسات
// ===================================================================

export interface IsolatedFoundationResult extends CalcResult {
  actualStress: number;
  allowableStress: number;
}

export type EccentricityCase = 'ideal' | 'acceptable' | 'danger';

export interface CombinedFoundationResult extends CalcResult {
  eccentricity: number;
  eccentricityCase: EccentricityCase;
  sigmaMax: number;
  sigmaMin: number;
  allowableStress: number;
  suggestion?: string;
}

export interface MatFoundationResult extends CalcResult {
  vp: number;
  vcp: number;
  bo: number;
  d: number;
  suggestion?: string;
}

export interface ContinuousFoundationResult extends CalcResult {
  actualStress: number;
  allowableStress: number;
  Bmin?: number;
}

export interface ColumnWallResult extends CalcResult {
  Aeq: number;
  actualStress: number;
  allowableStress: number;
  slendernessRatio: number;
  reductionFactor: number;
  effectiveAllowable: number;
  AsProvided: number;
}

// ===================================================================
// أنواع نتائج الفحوص المتخصصة — الكود العربي السوري 2024
// ===================================================================

export type UnitSystem = 'kg_cm' | 'N_mm';

/** نتيجة الإجهادات المسموحة المركزية */
export interface AllowableStressesResult {
  /** نظام الوحدات */
  unitSystem: UnitSystem;
  /** معامل المرونة للخرسانة */
  Ec: number;
  /** معامل المرونة للحديد */
  Es: number;
  /** نسبة النمطية n = 15 (ثابتة — الطبعة السادسة) */
  n: number;
  /** إجهاد الضغط المسموح بسبب الانحناء */
  fcAllowable: number;
  /** إجهاد الضغط المسموح بحالة الضغط المحوري */
  fcAllowableAxial: number;
  /** إجهاد الخضوع المسموح للحديد */
  fsAllowable: number;
  /** مقاومة القص الخرسانية */
  vc: number;
  /** الإجهاد الأقصى للقص */
  vmax: number;
  /** مقاومة الثقب */
  vp: number;
  /** وحدات الإجهاد */
  stressUnit: string;
  /** وحدات معامل المرونة */
  modulusUnit: string;
}

/** نتيجة فحص البلاطة المصمتة باتجاه واحد */
export interface OneWaySolidSlabResult {
  thickness: SlabThicknessResult;
  flexure: FlexureCheckResult | null;
  shear: ShearCheckResult | null;
  reinforcement: { safe: boolean; AsProvided: number; AsMin: number; rhoMin: number } | null;
  overallSafe: boolean;
  overallStatusAr: string;
}

/** نتيجة فحص البلاطة المصمتة باتجاهين */
export interface TwoWaySolidSlabResult {
  thickness: SlabThicknessResult;
  flexureShort: FlexureCheckResult | null;
  flexureLong: FlexureCheckResult | null;
  shear: ShearCheckResult | null;
  reinforcement: { safe: boolean; AsProvided: number; AsMin: number; rhoMin: number } | null;
  overallSafe: boolean;
  overallStatusAr: string;
}

/** نتيجة فحص البلاطة الهوردي باتجاه واحد */
export interface OneWayRibbedSlabResult {
  thickness: SlabThicknessResult;
  geometricChecks: {
    toppingThickEnough: boolean;
    ribWidthEnough: boolean;
    hfActual: number;
    hfMin: number;
    bwActual: number;
    bwMin: number;
  };
  flexure: FlexureCheckResult | null;
  shear: ShearCheckResult | null;
  reinforcement: { safe: boolean; AsProvided: number; AsMin: number; rhoMin: number } | null;
  overallSafe: boolean;
  overallStatusAr: string;
}

/** نتيجة فحص البلاطة الهوردي باتجاهين */
export interface TwoWayRibbedSlabResult {
  thickness: SlabThicknessResult;
  geometricChecks: {
    toppingThickEnough: boolean;
    ribWidthEnough: boolean;
    hfActual: number;
    hfMin: number;
    bwActual: number;
    bwMin: number;
  };
  flexureShort: FlexureCheckResult | null;
  flexureLong: FlexureCheckResult | null;
  shear: ShearCheckResult | null;
  reinforcement: { safe: boolean; AsProvided: number; AsMin: number; rhoMin: number } | null;
  overallSafe: boolean;
  overallStatusAr: string;
}

/** نتيجة فحص البلاطة الفطرية */
export interface FlatSlabResult {
  thickness: SlabThicknessResult;
  flexure: FlexureCheckResult | null;
  shear: ShearCheckResult | null;
  punchingShear: PunchingShearResult | null;
  reinforcement: { safe: boolean; AsProvided: number; AsMin: number; rhoMin: number } | null;
  overallSafe: boolean;
  overallStatusAr: string;
}

/** نتيجة فحص الجائز الساقط */
export interface DroppedBeamResult {
  thickness: SlabThicknessResult;
  flexure: FlexureCheckResult | null;
  shear: ShearCheckResult | null;
  stirrups: StirrupResult | null;
  reinforcement: { safe: boolean; AsProvided: number; AsMin: number; rhoMin: number } | null;
  overallSafe: boolean;
  overallStatusAr: string;
}

/** نتيجة فحص الجائز المخفي */
export interface HiddenBeamResult {
  thickness: SlabThicknessResult;
  flexure: FlexureCheckResult | null;
  shear: ShearCheckResult | null;
  stirrups: StirrupResult | null;
  reinforcement: { safe: boolean; AsProvided: number; AsMin: number; rhoMin: number } | null;
  overallSafe: boolean;
  overallStatusAr: string;
}

// ===================================================================
// 0. دالة الإجهادات المسموحة المركزية — getAllowableStresses
// الكود العربي السوري 2024 — الطبعة السادسة
// ===================================================================

/**
 * دالة الإجهادات المسموحة المركزية — المرشح العام للوحدات
 * Centralized engineering configuration for WSD allowable stresses
 *
 * الطبعة السادسة 2024:
 *   Ec = 18000√f'ci (كغ/سم²) أو 5700√f'ci (MPa)
 *   n = 15 (ثابتة للحالات العادية)
 *   fc_allowable = 0.40 × f'c (انحناء)
 *   fc_allowable = 0.30 × f'c (ضغط محوري)
 *   fs_allowable = 0.50 × fy
 *   vc = 0.50√f'c (كغ/سم²) أو 0.16√f'c (MPa)
 *   vmax = 2.5√f'c (كغ/سم²) أو 0.80√f'c (MPa)
 *   vp = 0.50√f'c (كغ/سم²) أو 0.16√f'c (MPa) — للبلاطات
 */
export function getAllowableStresses(fc: number, fy: number, unitSystem: UnitSystem): AllowableStressesResult {
  const n = WSD.n; // 15 — ثابتة

  if (unitSystem === 'kg_cm') {
    return {
      unitSystem: 'kg_cm',
      Ec: WSD.Ec_kg(fc),
      Es: WSD.Es_kg,
      n,
      fcAllowable: WSD.fc_allowable_flexure * fc,   // 0.40 × f'c
      fcAllowableAxial: WSD.fc_allowable_axial * fc, // 0.30 × f'c
      fsAllowable: WSD.getFsAllowable(fy),           // 0.50 × fy
      vc: WSD.vc_kg(fc),                            // 0.50√f'c
      vmax: WSD.vmax_kg(fc),                        // 2.5√f'c
      vp: WSD.vp_kg(fc),                            // 0.50√f'c
      stressUnit: 'كغ/سم²',
      modulusUnit: 'كغ/سم²',
    };
  } else {
    return {
      unitSystem: 'N_mm',
      Ec: WSD.Ec_MPa(fc),
      Es: WSD.Es_MPa,
      n,
      fcAllowable: WSD.fc_allowable_flexure * fc,   // 0.40 × f'c
      fcAllowableAxial: WSD.fc_allowable_axial * fc, // 0.30 × f'c
      fsAllowable: WSD.getFsAllowable(fy),           // 0.50 × fy
      vc: WSD.vc_MPa(fc),                           // 0.16√f'c
      vmax: WSD.vmax_MPa(fc),                       // 0.80√f'c
      vp: WSD.vp_MPa(fc),                           // 0.16√f'c
      stressUnit: 'N/mm²',
      modulusUnit: 'N/mm²',
    };
  }
}

// ===================================================================
// 1. شرط السماكة — Slab & Beam Minimum Thickness
// ===================================================================

const conditionMap: Record<string, string> = {
  'بسيط': 'simple',
  'مستمر من طرف واحد': 'oneEndContinuous',
  'مستمر من طرفين': 'bothEndsContinuous',
  'كابولي حر': 'cantilever',
};

/**
 * فحص شرط السماكة للبلاطات
 * محدث وفق الكود العربي السوري 2024 (الطبعة السادسة)
 */
export function checkSlabThickness(params: {
  slabType: 'oneWaySolid' | 'twoWaySolid' | 'oneWayRibbed' | 'twoWayRibbed' | 'flatSlab';
  supportCondition: string;
  span: number;        // المجاز (سم)
  hActual: number;     // السماكة المنفذة (سم)
  spanLong?: number;   // المجاز الطويل للبلاطة باتجاهين
  spanShort?: number;  // المجاز القصير للبلاطة باتجاهين
  flatSlabPanelType?: 'exterior' | 'interior'; // نوع الباكية للبلاطة الفطرية
}): SlabThicknessResult {
  const { slabType, supportCondition, span, hActual, spanLong, spanShort, flatSlabPanelType } = params;
  let hMin: number;
  let formula: string;

  const condKey = conditionMap[supportCondition] || 'simple';

  if (slabType === 'oneWaySolid') {
    const alpha = SLAB_ALPHA.oneWaySolid[condKey as keyof typeof SLAB_ALPHA.oneWaySolid] || 20;
    hMin = span / alpha;
    // السماكة الدنيا المطلقة 80 مم = 8 سم
    hMin = Math.max(hMin, 8);
    formula = `h = L/${alpha} = ${span}/${alpha} = ${(span / alpha).toFixed(1)} سم (h_min = ${hMin.toFixed(1)} سم)`;
  } else if (slabType === 'twoWaySolid') {
    const lLong = spanLong || span;
    const lShort = spanShort || span;
    if (supportCondition === 'بسيط' || supportCondition === 'simple') {
      hMin = lLong / SLAB_ALPHA.twoWaySolid.simple;
      formula = `h = L_long/${SLAB_ALPHA.twoWaySolid.simple} = ${lLong}/${SLAB_ALPHA.twoWaySolid.simple} = ${hMin.toFixed(1)} سم`;
    } else {
      // المحيط المكافئ — الطبعة السادسة: P_equiv / 140
      const beta_c = TWO_WAY_EQUIVALENT.betaContinuous; // 0.76
      const beta_f = TWO_WAY_EQUIVALENT.betaFree;       // 1.00
      // حساب المحيط المكافئ (4 أضلاع: 2 طويلة + 2 قصيرة)
      // معاملات: الضلع المستمر beta_c = 0.76، الضلع الحر beta_f = 1.00
      // P_equiv = 2 × (beta × L_long) + 2 × (beta × L_short)
      // مبسط: P_equiv = 2 × (L_long + L_short) (للحالة المتصلة من الطرفين)
      const equivPerimeter = 2 * (lLong + lShort);
      hMin = equivPerimeter / TWO_WAY_EQUIVALENT.solidDenominator; // 140
      formula = `h = 2(${lLong}+${lShort})/${TWO_WAY_EQUIVALENT.solidDenominator} = ${equivPerimeter}/${TWO_WAY_EQUIVALENT.solidDenominator} = ${hMin.toFixed(1)} سم`;
    }
  } else if (slabType === 'oneWayRibbed') {
    const alpha = SLAB_ALPHA.oneWayRibbed[condKey as keyof typeof SLAB_ALPHA.oneWayRibbed] || 20;
    hMin = span / alpha;
    formula = `h = L/${alpha} = ${span}/${alpha} = ${hMin.toFixed(1)} سم`;
  } else if (slabType === 'twoWayRibbed') {
    const lLong = spanLong || span;
    const lShort = spanShort || span;
    if (supportCondition === 'بسيط' || supportCondition === 'simple') {
      hMin = lLong / SLAB_ALPHA.twoWayRibbed.simple;
      formula = `h = L_long/${SLAB_ALPHA.twoWayRibbed.simple} = ${lLong}/${SLAB_ALPHA.twoWayRibbed.simple} = ${hMin.toFixed(1)} سم`;
    } else {
      // المحيط المكافئ — البلاطة الهوردي باتجاهين: P_equiv / 120
      const equivPerimeter = 2 * (lLong + lShort);
      hMin = equivPerimeter / TWO_WAY_EQUIVALENT.ribbedDenominator; // 120
      formula = `h = 2(${lLong}+${lShort})/${TWO_WAY_EQUIVALENT.ribbedDenominator} = ${equivPerimeter}/${TWO_WAY_EQUIVALENT.ribbedDenominator} = ${hMin.toFixed(1)} سم`;
    }
  } else if (slabType === 'flatSlab') {
    // البلاطة الفطرية — الطبعة السادسة 2024
    // تمييز بين خارجية وداخلية
    if (supportCondition === 'مع تيجان' || supportCondition === 'withDropPanels') {
      const alpha = flatSlabPanelType === 'interior'
        ? SLAB_ALPHA.flatSlab.withDropInterior   // 38
        : SLAB_ALPHA.flatSlab.withDropExterior;   // 35
      hMin = span / alpha;
      formula = `h = L/${alpha} = ${span}/${alpha} = ${hMin.toFixed(1)} سم (مع تيجان — ${flatSlabPanelType === 'interior' ? 'داخلية' : 'خارجية'})`;
    } else {
      hMin = span / SLAB_ALPHA.flatSlab.withoutDropPanels; // 32
      formula = `h = L/${SLAB_ALPHA.flatSlab.withoutDropPanels} = ${span}/${SLAB_ALPHA.flatSlab.withoutDropPanels} = ${hMin.toFixed(1)} سم (بدون تيجان)`;
    }
    // السماكة الدنيا المطلقة للبلاطة الفطرية: 150 مم = 15 سم
    hMin = Math.max(hMin, FLAT_SLAB_CONSTRAINTS.minThicknessCm);
  } else {
    hMin = span / 20;
    formula = `h = L/20`;
  }

  const safe = hActual >= hMin;

  return {
    safe,
    status: safe ? 'محقق' : 'غير محقق',
    statusAr: safe ? 'محقق ✅' : 'غير محقق ❌',
    hMin: Math.round(hMin * 100) / 100,
    hActual,
    formula,
  };
}

/**
 * فحص شرط السماكة للجوائز — محدث لدعم الساقط والمخفي
 * الكود العربي السوري 2024 (الطبعة السادسة)
 */
export function checkBeamThickness(params: {
  beamType: 'dropped' | 'hidden';
  supportCondition: string;
  span: number;
  hActual: number;
}): SlabThicknessResult {
  const { beamType, supportCondition, span, hActual } = params;

  const condKey = conditionMap[supportCondition] || 'simple';
  const alphaObj = BEAM_ALPHA[beamType];
  const alpha = alphaObj[condKey as keyof typeof alphaObj] || (beamType === 'dropped' ? 14 : 16);
  const hMin = span / alpha;

  const safe = hActual >= hMin;

  return {
    safe,
    status: safe ? 'محقق' : 'غير محقق',
    statusAr: safe ? 'محقق ✅' : 'غير محقق ❌',
    hMin: Math.round(hMin * 100) / 100,
    hActual,
    formula: `h = L/${alpha} = ${span}/${alpha} = ${hMin.toFixed(1)} سم`,
  };
}

// ===================================================================
// 2. فحص إجهاد التربة للأساسات — حسب النوع
// ===================================================================

export function checkIsolatedFoundation(params: {
  load: number;
  length: number;
  width: number;
  allowableStress: number;
}): IsolatedFoundationResult {
  const { load, length, width, allowableStress } = params;
  const area = length * width;
  const actualStress = (load * 1000) / area;
  const safe = actualStress <= allowableStress;

  return {
    safe,
    status: safe ? 'محقق' : 'غير محقق',
    statusAr: safe ? 'الأساس محقق (آمن) ✅' : 'الأساس غير محقق (غير آمن) ❌',
    actualStress: Math.round(actualStress * 100) / 100,
    allowableStress,
  };
}

export function checkCombinedFoundation(params: {
  P1: number;
  P2: number;
  S: number;
  L: number;
  B: number;
  L_out: number;
  allowableStress: number;
}): CombinedFoundationResult {
  const { P1, P2, S, L, B, L_out, allowableStress } = params;
  const P_total = P1 + P2;
  const x_R = (P2 * S) / P_total;
  const x_R_total = x_R + L_out;
  const x_c = L / 2;
  const e = Math.abs(x_R_total - x_c);

  let eccentricityCase: EccentricityCase;
  let sigmaMax: number;
  let sigmaMin: number;
  let safe: boolean;
  let suggestion: string | undefined;

  if (e === 0) {
    eccentricityCase = 'ideal';
    const sigma = (P_total * 1000) / (B * L);
    sigmaMax = sigma;
    sigmaMin = sigma;
    safe = sigma <= allowableStress;
  } else if (e <= L / 6) {
    eccentricityCase = 'acceptable';
    const sigma_avg = (P_total * 1000) / (B * L);
    sigmaMax = sigma_avg * (1 + (6 * e) / L);
    sigmaMin = sigma_avg * (1 - (6 * e) / L);
    safe = sigmaMax <= allowableStress && sigmaMin >= 0;
  } else {
    eccentricityCase = 'danger';
    sigmaMax = 0;
    sigmaMin = 0;
    safe = false;
    suggestion = `خطر: توزيع إجهادات غير منتظم، قد يحدث دوران للقاعدة. يُنصح بتعديل الطول L إلى ${Math.ceil(6 * e)} سم على الأقل`;
  }

  return {
    safe,
    status: safe ? 'محقق' : 'غير محقق',
    statusAr: eccentricityCase === 'ideal'
      ? 'الأساس محقق (حالة مثالية) ✅'
      : eccentricityCase === 'acceptable'
        ? safe ? 'الأساس محقق (شبه منحرف) ✅' : 'الأساس غير محقق ❌'
        : 'الأساس غير محقق — خطر دوران ❌',
    eccentricity: Math.round(e * 100) / 100,
    eccentricityCase,
    sigmaMax: Math.round(sigmaMax * 100) / 100,
    sigmaMin: Math.round(sigmaMin * 100) / 100,
    allowableStress,
    suggestion,
  };
}

export function checkMatFoundation(params: {
  columnLoad: number;
  matThickness: number;
  fc: number;
  columnWidth?: number;
  columnDepth?: number;
  columnType?: 'center' | 'edge' | 'corner';
}): MatFoundationResult {
  const {
    columnLoad, matThickness, fc,
    columnWidth = 40, columnDepth = 40,
    columnType = 'center',
  } = params;

  const d = matThickness - 2.5;
  if (d <= 0) {
    return {
      safe: false, status: 'غير محقق',
      statusAr: 'العمق الفعال سالب — تحقق من السماكة ❌',
      vp: 0, vcp: 0, bo: 0, d: 0,
      suggestion: 'زيادة سماكة الحصيرة',
    };
  }

  let bo: number;
  if (columnType === 'center') {
    bo = 2 * ((columnWidth + d) + (columnDepth + d));
  } else if (columnType === 'edge') {
    bo = (columnWidth + d) + 2 * (columnDepth + d);
  } else {
    bo = (columnWidth + d) + (columnDepth + d);
  }

  const R = columnLoad * 1000;
  const vp = R / (bo * d);
  const vcp = WSD.vp_foundation(fc);

  const safe = vp <= vcp;

  return {
    safe,
    status: safe ? 'محقق' : 'غير محقق',
    statusAr: safe ? 'الحصيرة محققة ✅' : 'الحصيرة غير محققة ❌',
    vp: Math.round(vp * 100) / 100,
    vcp: Math.round(vcp * 100) / 100,
    bo: Math.round(bo * 100) / 100,
    d: Math.round(d * 100) / 100,
    suggestion: safe ? undefined : 'خطر: اختراق العمود للحصيرة. يُنصح بزيادة سماكة الحصيرة',
  };
}

export function checkContinuousFoundation(params: {
  q: number;
  B: number;
  allowableStress: number;
}): ContinuousFoundationResult {
  const { q, B, allowableStress } = params;
  const actualStress = (q * 1000) / (B * 100);
  const safe = actualStress <= allowableStress;

  let Bmin: number | undefined;
  if (!safe) {
    Bmin = Math.ceil((q * 1000) / (allowableStress * 100));
  }

  return {
    safe,
    status: safe ? 'محقق' : 'غير محقق',
    statusAr: safe ? 'الأساس المستمر محقق ✅' : 'الأساس المستمر غير محقق ❌',
    actualStress: Math.round(actualStress * 100) / 100,
    allowableStress,
    Bmin,
  };
}

// ===================================================================
// 3. فحص إجهاد الأعمدة والجدران — مع المساحة المكافئة
// ===================================================================

export function checkColumnWallStress(params: {
  load: number;
  width: number;
  depth: number;
  fc: number;
  n?: number;
  As?: number;
  H_clear: number;
  columnLocation: 'وسطي' | 'طرفي' | 'ركني' | '';
}): ColumnWallResult {
  const { load, width, depth, fc, H_clear, columnLocation } = params;

  // نسبة النمطية — الطبعة السادسة: n = 15
  const nVal = params.n || WSD.n;

  let AsProvided = params.As;
  if (!AsProvided || AsProvided <= 0) {
    AsProvided = WSD.min_steel_ratio_column[
      columnLocation === 'وسطي' ? 'center'
        : columnLocation === 'طرفي' ? 'edge'
          : columnLocation === 'ركني' ? 'corner'
            : 'center'
    ] * (width * depth);
  }

  const Aeq = (width * depth) + (nVal - 1) * AsProvided;
  const actualStress = (load * 1000) / Aeq;
  const allowableStress = WSD.fc_allowable_axial * fc;

  const minDim = Math.min(width, depth);
  const slendernessRatio = H_clear / minDim;

  const locationKey = columnLocation === 'وسطي' ? 'center'
    : columnLocation === 'طرفي' ? 'edge'
      : columnLocation === 'ركني' ? 'corner'
        : 'center';

  let reductionFactor = 1.0;
  if (slendernessRatio > WSD.slenderness_limit) {
    reductionFactor = WSD.slenderness_reduction[locationKey as keyof typeof WSD.slenderness_reduction] || 0.6;
  }

  const effectiveAllowable = allowableStress * reductionFactor;
  const safe = actualStress <= effectiveAllowable;

  return {
    safe,
    status: safe ? 'محقق' : 'غير محقق',
    statusAr: safe ? 'آمن (محقق) ✅' : 'غير آمن (غير محقق) ❌',
    Aeq: Math.round(Aeq * 100) / 100,
    actualStress: Math.round(actualStress * 100) / 100,
    allowableStress: Math.round(allowableStress * 100) / 100,
    slendernessRatio: Math.round(slendernessRatio * 100) / 100,
    reductionFactor,
    effectiveAllowable: Math.round(effectiveAllowable * 100) / 100,
    AsProvided: Math.round(AsProvided * 100) / 100,
  };
}

// ===================================================================
// 4. فحص إجهاد التربة — القديم (للتوافق)
// ===================================================================

/** @deprecated استخدم checkIsolatedFoundation بدلاً منه */
export function checkSoilStress(params: {
  load: number;
  length: number;
  width: number;
  allowableStress: number;
}): StressCheckResult {
  const { load, length, width, allowableStress } = params;
  const area = length * width;
  const actual = (load * 1000) / area;
  const safe = actual <= allowableStress;

  return {
    safe,
    status: safe ? 'محقق' : 'غير محقق',
    statusAr: safe ? 'آمن (محقق) ✅' : 'غير آمن (غير محقق) ❌',
    actual: Math.round(actual * 100) / 100,
    allowable: allowableStress,
    ratio: Math.round((actual / allowableStress) * 100) / 100,
  };
}

/** @deprecated استخدم checkColumnWallStress بدلاً منه */
export function checkColumnStress(params: {
  load: number;
  width: number;
  depth: number;
  fc: number;
}): StressCheckResult {
  const { load, width, depth, fc } = params;
  const area = width * depth;
  const actual = (load * 1000) / area;
  const allowable = WSD.fc_allowable_axial * fc;
  const safe = actual <= allowable;

  return {
    safe,
    status: safe ? 'محقق' : 'غير محقق',
    statusAr: safe ? 'آمن (محقق) ✅' : 'غير آمن (غير محقق) ❌',
    actual: Math.round(actual * 100) / 100,
    allowable: Math.round(allowable * 100) / 100,
    ratio: Math.round((actual / allowable) * 100) / 100,
  };
}

// ===================================================================
// 5. فحص الانعطاف (العزم) — Flexure Check (WSD)
// الكود العربي السوري 2024 — الطبعة السادسة — n = 15
// ===================================================================

/**
 * فحص الانعطاف — طريقة التشغيل WSD
 * الطبعة السادسة 2024: n = 15 (ثابتة)
 * kd = (-nAs + √(nAs² + 2nAsbd)) / b
 * jd = d - kd/3
 * fc = 2Mw / (b × kd × jd)
 * fs = Mw / (As × jd)
 * fc_مس = 0.4 × f'c
 * fs_مس = 0.5 × fy
 * مُصلح: kd > kb حيث kb/d = n / (n + fs_مس/fc_مس)
 */
export function checkFlexure(params: {
  moment: number;       // العزم (طن.سم) — في نظام kg_cm
  width: number;        // عرض المقطع (سم)
  effectiveDepth: number; // العمق الفعال d (سم)
  As: number;           // مساحة التسليح (سم²)
  fc: number;           // f'c (كغ/سم²)
  fy: number;           // fy (كغ/سم²)
  isSlab?: boolean;     // هل بلاطة؟
  bEffective?: number;  // العرض الفعال لمقطع T (للبلاطة الهوردي)
  unitSystem?: UnitSystem;
}): FlexureCheckResult {
  const { moment, width, effectiveDepth: d, As, fc, fy, isSlab, bEffective, unitSystem = 'kg_cm' } = params;

  if (d <= 0) {
    return {
      safe: false, status: 'غير محقق', statusAr: 'العمق الفعال ≤ 0 ❌',
      kd: 0, jd: 0, fc: 0, fs: 0, fcAllowable: 0, fsAllowable: 0, n: 0, overReinforced: false,
    };
  }

  const n = WSD.n; // 15 — ثابتة وفق الطبعة السادسة
  const b = bEffective || (isSlab ? 100 : width);

  // تحويل العزم حسب نظام الوحدات
  let Mw: number;
  if (unitSystem === 'kg_cm') {
    Mw = moment * 1000; // طن.سم → كغ.سم
  } else {
    Mw = moment; // N.mm مباشرة
  }

  // عمق المحور الحيادي — المعادلة التربيعية
  const nAs = n * As;
  const discriminant = nAs * nAs + 2 * nAs * b * d;
  const kd = (-nAs + Math.sqrt(Math.max(0, discriminant))) / b;
  const jd = d - kd / 3;

  // إجهادات فعلية
  let fcStress: number;
  let fsStress: number;
  let fcAllowable: number;
  let fsAllowable: number;

  if (unitSystem === 'kg_cm') {
    fcStress = (2 * Mw) / (b * kd * jd);     // كغ/سم²
    fsStress = Mw / (As * jd);                 // كغ/سم²
    fcAllowable = WSD.fc_allowable_flexure * fc; // 0.4 × f'c
    fsAllowable = WSD.getFsAllowable(fy);        // 0.5 × fy
  } else {
    fcStress = (2 * Mw) / (b * kd * jd);     // N/mm²
    fsStress = Mw / (As * jd);                 // N/mm²
    fcAllowable = WSD.fc_allowable_flexure * fc; // 0.4 × f'c (MPa)
    fsAllowable = WSD.getFsAllowable(fy);        // 0.5 × fy (MPa)
  }

  // فحص التسليح الزائد
  const kb_ratio = n / (n + fsAllowable / fcAllowable);
  const kb = kb_ratio * d;
  const overReinforced = kd > kb;

  const safe = !overReinforced && fcStress <= fcAllowable && fsStress <= fsAllowable;

  return {
    safe,
    status: safe ? 'محقق' : 'غير محقق',
    statusAr: overReinforced
      ? 'مقطع مُصلح (تسليح زائد) ❌'
      : safe ? 'محقق ✅' : 'غير محقق ❌',
    kd: Math.round(kd * 100) / 100,
    jd: Math.round(jd * 100) / 100,
    fc: Math.round(fcStress * 100) / 100,
    fs: Math.round(fsStress * 100) / 100,
    fcAllowable: Math.round(fcAllowable * 100) / 100,
    fsAllowable: Math.round(fsAllowable * 100) / 100,
    n,
    overReinforced,
  };
}

// ===================================================================
// 6. فحص القص — Shear Check (WSD)
// ===================================================================

/**
 * فحص القص — WSD
 * الكود العربي السوري 2024 — الطبعة السادسة
 * kg/cm²: v = V×1000/(b×d), vc = 0.5√f'c, vmax = 2.5√f'c
 * N/mm²:  v = V/(b×d),      vc = 0.16√f'c, vmax = 0.80√f'c
 */
export function checkShear(params: {
  shear: number;          // قوة القص (طن في نظام kg_cm)
  width: number;          // عرض المقطع b (سم)
  effectiveDepth: number; // العمق الفعال d (سم)
  fc: number;             // f'c
  unitSystem?: UnitSystem;
}): ShearCheckResult {
  const { shear, width, effectiveDepth: d, fc, unitSystem = 'kg_cm' } = params;

  let v: number;
  let vc: number;
  let vmax: number;

  if (unitSystem === 'kg_cm') {
    const V = shear * 1000; // تحويل إلى كغ
    v = V / (width * d);
    vc = WSD.vc_kg(fc);
    vmax = WSD.vmax_kg(fc);
  } else {
    v = shear / (width * d); // N/mm²
    vc = WSD.vc_MPa(fc);
    vmax = WSD.vmax_MPa(fc);
  }

  const stirrupsNeeded = v > vc;
  const sectionSafe = v <= vmax;

  return {
    safe: sectionSafe,
    status: sectionSafe ? 'محقق' : 'غير محقق',
    statusAr: sectionSafe ? 'محقق ✅' : 'غير محقق — يحتاج إعادة تصميم المقطع ❌',
    v: Math.round(v * 100) / 100,
    vc: Math.round(vc * 100) / 100,
    vmax: Math.round(vmax * 100) / 100,
    stirrupsNeeded,
  };
}

// ===================================================================
// 7. حساب الأطواق — Stirrup Calculation (WSD)
// الكود العربي السوري 2024 — الطبعة السادسة
// smax عادي: min(d/2, 30 سم) — smax قص عالي: min(d/4, 15 سم)
// ===================================================================

export function calculateStirrups(params: {
  shear: number;
  width: number;
  effectiveDepth: number;
  fc: number;
  fy: number;
  stirrupDiameter: number;
  stirrupLegs: number;
  Fs?: number;
  unitSystem?: UnitSystem;
}): StirrupResult {
  const { shear, width, effectiveDepth: d, fc, fy, stirrupDiameter, stirrupLegs, Fs, unitSystem = 'kg_cm' } = params;

  let v: number;
  let vc: number;
  let FsVal: number;
  let smaxNormal: number;
  let smaxHighShear: number;

  if (unitSystem === 'kg_cm') {
    const V = shear * 1000;
    v = V / (width * d);
    vc = WSD.vc_kg(fc);
    FsVal = Fs || 0.5 * fy;
    smaxNormal = Math.min(d / 2, WSD.smax_stirrup_normal_cm);   // min(d/2, 30)
    smaxHighShear = Math.min(d / 4, WSD.smax_stirrup_high_shear_cm); // min(d/4, 15)
  } else {
    v = shear / (width * d);
    vc = WSD.vc_MPa(fc);
    FsVal = Fs || 0.5 * fy;
    smaxNormal = Math.min(d / 2, 300);   // mm
    smaxHighShear = Math.min(d / 4, 150); // mm
  }

  // هل حالة القص عالية؟ (v > 0.5 × vmax أو v > vc بفارق كبير)
  const isHighShear = v > vc;

  // مساحة التسليح المتوفرة
  const singleBarArea = (Math.PI / 4) * Math.pow(stirrupDiameter / 10, 2);
  const Av_provided = singleBarArea * stirrupLegs;

  // التباعد المطلوب
  const v_excess = v - vc;
  let s: number;
  if (v_excess <= 0) {
    s = 999;
  } else {
    s = (Av_provided * FsVal) / (v_excess * width);
  }

  // التباعد الأقصى
  const smax = isHighShear ? smaxHighShear : smaxNormal;
  const useSmax = s >= smax;
  const finalSpacing = useSmax ? smax : Math.floor(s);

  // مساحة التسليح المطلوبة
  let V_excess_force: number;
  if (unitSystem === 'kg_cm') {
    V_excess_force = Math.max(shear * 1000 - vc * width * d, 0);
  } else {
    V_excess_force = Math.max(shear - vc * width * d, 0);
  }
  const Av_required = V_excess_force / (FsVal * d);

  // فحص الأمان
  const Avs_provided = Av_provided / finalSpacing;
  const safe = Avs_provided >= Av_required;

  return {
    spacing: Math.round(finalSpacing * 10) / 10,
    spacingMax: Math.round(smax * 10) / 10,
    useSmax,
    areaRequired: Math.round(Av_required * 1000) / 1000,
    areaProvided: Math.round(Av_provided * 1000) / 1000,
    safe,
    isHighShear,
  };
}

// ===================================================================
// 8. فحص الثقب — Punching Shear Check (WSD)
// الكود العربي السوري 2024 — الطبعة السادسة
// b0 على بعد d/2 من وجه العمود
// معامل eta حسب موقع العمود: وسطي=1.00, طرفي=1.15, ركني=1.30
// ===================================================================

export function checkPunchingShear(params: {
  columnWidth: number;
  columnDepth: number;
  slabThickness: number;
  reaction: number;
  fc: number;
  columnType?: 'center' | 'edge' | 'corner';
  unitSystem?: UnitSystem;
}): PunchingShearResult {
  const { columnWidth: c1, columnDepth: c2, slabThickness: h, reaction, fc, columnType = 'center', unitSystem = 'kg_cm' } = params;

  const d = h - 2.5; // العمق الفعال (سم)
  if (d <= 0) {
    return {
      safe: false, status: 'غير محقق', statusAr: 'العمق الفعال سالب ❌',
      vp: 0, actualStress: 0, bo: 0, formula: '',
    };
  }

  // محيط المقطع الحرج على بعد d/2 من وجه العمود
  let bo: number;
  if (columnType === 'center') {
    bo = 2 * ((c1 + d) + (c2 + d));
  } else if (columnType === 'edge') {
    bo = (c1 + d) + 2 * (c2 + d);
  } else {
    bo = (c1 + d) + (c2 + d);
  }

  // معامل eta — الطبعة السادسة 2024
  const etaMap = { center: 1.00, edge: 1.15, corner: 1.30 };
  const eta = etaMap[columnType];

  let actualStress: number;
  let vp: number;
  let stressUnit: string;

  if (unitSystem === 'kg_cm') {
    const R = reaction * 1000; // كغ
    actualStress = (R / (bo * d)) * eta;
    vp = WSD.vp_kg(fc); // 0.50√f'c (كغ/سم²)
    stressUnit = 'كغ/سم²';
  } else {
    actualStress = (reaction / (bo * d)) * eta;
    vp = WSD.vp_MPa(fc); // 0.16√f'c (N/mm²)
    stressUnit = 'N/mm²';
  }

  const safe = actualStress <= vp;

  return {
    safe,
    status: safe ? 'محقق' : 'غير محقق',
    statusAr: safe ? 'آمن (محقق) ✅' : 'غير آمن (غير محقق) ❌',
    vp: Math.round(vp * 100) / 100,
    actualStress: Math.round(actualStress * 100) / 100,
    bo: Math.round(bo * 100) / 100,
    formula: `v = ${Math.round(actualStress * 100) / 100} ${stressUnit} × η(${eta}) ≤ vp = ${Math.round(vp * 100) / 100} ${stressUnit}`,
  };
}

// ===================================================================
// 9. مساحة التسليح الدنيا — Minimum Reinforcement
// ===================================================================

export function getMinReinforcement(params: {
  fc: number;
  fy: number;
  element: 'beam' | 'slab';
  width?: number;
  effectiveDepth?: number;
}): { rhoMin: number; AsMin: number } {
  const { fc, fy, element, width = 100, effectiveDepth = 15 } = params;

  let rhoMin: number;

  if (element === 'beam') {
    rhoMin = Math.max(0.25 * Math.sqrt(fc) / fy, 200 / fy);
  } else {
    // الطبعة السادسة 2024: rho_min = 0.0018 لحديد عالي المقاومة
    if (fy >= 420) {
      rhoMin = 0.0018;
    } else if (fy >= 350) {
      rhoMin = 0.0020;
    } else {
      rhoMin = 0.0020;
    }
  }

  const AsMin = rhoMin * width * effectiveDepth;

  return {
    rhoMin: Math.round(rhoMin * 10000) / 10000,
    AsMin: Math.round(AsMin * 100) / 100,
  };
}

export function compareReinforcement(params: {
  AsProvided: number;
  fc: number;
  fy: number;
  element: 'beam' | 'slab';
  width?: number;
  effectiveDepth?: number;
}): { safe: boolean; AsMin: number; AsProvided: number; ratio: number } {
  const { AsProvided, fc, fy, element, width, effectiveDepth } = params;
  const { AsMin } = getMinReinforcement({ fc, fy, element, width, effectiveDepth });

  return {
    safe: AsProvided >= AsMin,
    AsMin,
    AsProvided,
    ratio: Math.round((AsProvided / AsMin) * 100) / 100,
  };
}

// ===================================================================
// 10. حساب عزم الانعطاف وقوة القص للبلاطات
// ===================================================================

export const SLAB_MOMENT_COEFFICIENTS: Record<string, { positive: number; negative: number }> = {
  'بسيط': { positive: 1 / 8, negative: 0 },
  'مستمر من طرف واحد': { positive: 1 / 14, negative: 1 / 8 },
  'مستمر من طرفين': { positive: 1 / 16, negative: 1 / 10 },
  'كابولي حر': { positive: 0, negative: 1 / 2 },
};

export const SLAB_SHEAR_COEFFICIENTS: Record<string, number> = {
  'بسيط': 0.5,
  'مستمر من طرف واحد': 0.6,
  'مستمر من طرفين': 0.5,
  'كابولي حر': 1.0,
};

export const TWO_WAY_DISTRIBUTION_TABLE: Record<string, number> = {
  '1.00': 0.500, '0.95': 0.551, '0.90': 0.606, '0.85': 0.664,
  '0.80': 0.725, '0.75': 0.787, '0.70': 0.848, '0.65': 0.905,
  '0.60': 0.952, '0.55': 0.984, '0.50': 1.000, '0.45': 1.000, '0.40': 1.000,
};

function getTwoWayDistributionFactor(ratio: number): number {
  if (ratio >= 1.0) return 0.5;
  if (ratio <= 0.4) return 1.0;

  const keys = Object.keys(TWO_WAY_DISTRIBUTION_TABLE).map(Number).sort((a, b) => a - b);
  const r = Math.round(ratio * 100) / 100;

  let lower = keys[0];
  let upper = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (r >= keys[i] && r <= keys[i + 1]) {
      lower = keys[i];
      upper = keys[i + 1];
      break;
    }
  }

  const valLower = TWO_WAY_DISTRIBUTION_TABLE[lower.toFixed(2)];
  const valUpper = TWO_WAY_DISTRIBUTION_TABLE[upper.toFixed(2)];
  if (upper === lower) return valLower;

  const t = (r - lower) / (upper - lower);
  return valLower + t * (valUpper - valLower);
}

export const TWO_WAY_MOMENT_COEFFICIENTS: Record<string, { positiveShort: number; negativeShort: number; positiveLong: number; negativeLong: number }> = {
  'بسيط': { positiveShort: 1 / 8, negativeShort: 0, positiveLong: 1 / 8, negativeLong: 0 },
  'مستمر من طرف واحد': { positiveShort: 1 / 14, negativeShort: 1 / 8, positiveLong: 1 / 14, negativeLong: 1 / 8 },
  'مستمر من طرفين': { positiveShort: 1 / 16, negativeShort: 1 / 10, positiveLong: 1 / 16, negativeLong: 1 / 10 },
  'كابولي حر': { positiveShort: 0, negativeShort: 1 / 2, positiveLong: 0, negativeLong: 1 / 2 },
};

export interface SlabMomentShearResult {
  Mpositive: number;
  Mnegative: number;
  Mgovernor: number;
  V: number;
  w: number;
  momentCoeffPositive: number;
  momentCoeffNegative: number;
  shearCoeff: number;
}

type SlabSubType = 'oneWaySolid' | 'twoWaySolid' | 'oneWayRibbed' | 'twoWayRibbed' | 'flatSlab';

export function calculateSlabMomentShear(params: {
  load: number;
  span: number;
  supportCondition: string;
  slabType?: SlabSubType;
  spanLong?: number;
  spanShort?: number;
}): SlabMomentShearResult {
  const { load, span, supportCondition, slabType, spanLong, spanShort } = params;

  let w = load;
  let L = span / 100;

  let distributionFactor = 1.0;
  if (slabType === 'twoWaySolid' || slabType === 'twoWayRibbed') {
    const lLong = (spanLong || span) / 100;
    const lShort = (spanShort || span) / 100;
    L = lShort;
    const ratio = lShort / lLong;
    distributionFactor = getTwoWayDistributionFactor(ratio);
    w = load * distributionFactor;
  }

  const momentCoeffs = SLAB_MOMENT_COEFFICIENTS[supportCondition] || SLAB_MOMENT_COEFFICIENTS['بسيط'];
  const shearCoeff = SLAB_SHEAR_COEFFICIENTS[supportCondition] || 0.5;

  const Mpositive = momentCoeffs.positive * w * L * L * 100;
  const Mnegative = momentCoeffs.negative * w * L * L * 100;
  const Mgovernor = Math.max(Mpositive, Mnegative);

  const V = shearCoeff * w * L;

  return {
    Mpositive: Math.round(Mpositive * 100) / 100,
    Mnegative: Math.round(Mnegative * 100) / 100,
    Mgovernor: Math.round(Mgovernor * 100) / 100,
    V: Math.round(V * 1000) / 1000,
    w: Math.round(w * 1000) / 1000,
    momentCoeffPositive: momentCoeffs.positive,
    momentCoeffNegative: momentCoeffs.negative,
    shearCoeff,
  };
}

// ===================================================================
// 11–18. الدوال المتخصصة — الكود العربي السوري 2024 (الطبعة السادسة)
// ===================================================================

/**
 * 11. checkOneWaySolidSlab — فحص البلاطة المصمتة باتجاه واحد
 * جدول 7-2: alpha = 25 / 27 / 30 / 10
 * h_min المطلق = 80 مم = 8 سم
 */
export function checkOneWaySolidSlab(params: {
  fc: number; fy: number;
  supportCondition: string;
  span: number;          // المجاز (سم)
  hActual: number;       // السماكة المنفذة (سم)
  cover: number;         // التغطية (سم)
  load: number;          // الحمولة (طن/م²)
  rebarCount: number;    // عدد أسياخ التسليح لكل متر
  rebarDiameter: number; // قطر التسليح (مم)
  unitSystem?: UnitSystem;
}): OneWaySolidSlabResult {
  const { fc, fy, supportCondition, span, hActual, cover, load, rebarCount, rebarDiameter, unitSystem = 'kg_cm' } = params;

  // 1. فحص السماكة
  const thickness = checkSlabThickness({
    slabType: 'oneWaySolid', supportCondition, span, hActual,
  });

  // 2. حساب العزم والقص
  const d = hActual > cover ? hActual - cover : 0;
  const As = rebarCount > 0 && rebarDiameter > 0
    ? rebarCount * (Math.PI / 4) * Math.pow(rebarDiameter / 10, 2) : 0;

  let flexure: FlexureCheckResult | null = null;
  let shear: ShearCheckResult | null = null;
  let reinforcement: OneWaySolidSlabResult['reinforcement'] = null;

  if (load > 0 && d > 0 && fy > 0) {
    const ms = calculateSlabMomentShear({ load, span, supportCondition, slabType: 'oneWaySolid' });

    if (As > 0 && ms.Mgovernor > 0) {
      flexure = checkFlexure({
        moment: ms.Mgovernor, width: 100, effectiveDepth: d, As, fc, fy, isSlab: true, unitSystem,
      });
    }

    if (ms.V > 0) {
      shear = checkShear({ shear: ms.V, width: 100, effectiveDepth: d, fc, unitSystem });
    }

    if (As > 0 && d > 0) {
      const rc = compareReinforcement({ AsProvided: As, fc, fy, element: 'slab', width: 100, effectiveDepth: d });
      reinforcement = {
        safe: rc.safe, AsProvided: As, AsMin: rc.AsMin,
        rhoMin: getMinReinforcement({ fc, fy, element: 'slab', width: 100, effectiveDepth: d }).rhoMin,
      };
    }
  }

  const overallSafe = thickness.safe
    && (!flexure || flexure.safe)
    && (!shear || shear.safe)
    && (!reinforcement || reinforcement.safe);

  return {
    thickness, flexure, shear, reinforcement,
    overallSafe,
    overallStatusAr: overallSafe ? 'البلاطة المصمتة (باتجاه واحد) محققة ✅' : 'البلاطة المصمتة (باتجاه واحد) غير محققة ❌',
  };
}

/**
 * 12. checkTwoWaySolidSlab — فحص البلاطة المصمتة باتجاهين
 * المحيط المكافئ: P_equiv / 140
 * beta_continuous = 0.76, beta_free = 1.00
 */
export function checkTwoWaySolidSlab(params: {
  fc: number; fy: number;
  supportCondition: string;
  spanLong: number;      // المجاز الطويل (سم)
  spanShort: number;     // المجاز القصير (سم)
  hActual: number;
  cover: number;
  load: number;
  rebarCountShort: number; rebarDiameterShort: number;
  rebarCountLong?: number; rebarDiameterLong?: number;
  unitSystem?: UnitSystem;
}): TwoWaySolidSlabResult {
  const { fc, fy, supportCondition, spanLong, spanShort, hActual, cover, load, rebarCountShort, rebarDiameterShort, rebarCountLong, rebarDiameterLong, unitSystem = 'kg_cm' } = params;

  const thickness = checkSlabThickness({
    slabType: 'twoWaySolid', supportCondition, span: spanLong, hActual, spanLong, spanShort,
  });

  const d = hActual > cover ? hActual - cover : 0;
  const AsShort = rebarCountShort > 0 && rebarDiameterShort > 0
    ? rebarCountShort * (Math.PI / 4) * Math.pow(rebarDiameterShort / 10, 2) : 0;

  let flexureShort: FlexureCheckResult | null = null;
  let flexureLong: FlexureCheckResult | null = null;
  let shear: ShearCheckResult | null = null;
  let reinforcement: TwoWaySolidSlabResult['reinforcement'] = null;

  if (load > 0 && d > 0 && fy > 0) {
    const ms = calculateSlabMomentShear({
      load, span: spanShort, supportCondition, slabType: 'twoWaySolid', spanLong, spanShort,
    });

    if (AsShort > 0 && ms.Mgovernor > 0) {
      flexureShort = checkFlexure({
        moment: ms.Mgovernor, width: 100, effectiveDepth: d, As: AsShort, fc, fy, isSlab: true, unitSystem,
      });
    }

    // فحص الاتجاه الطويل إذا أدخل المستخدم تسليح
    if (rebarCountLong && rebarDiameterLong) {
      const AsLong = rebarCountLong * (Math.PI / 4) * Math.pow(rebarDiameterLong / 10, 2);
      const distFactor = getTwoWayDistributionFactor(spanShort / spanLong);
      const wLong = load * (1 - distFactor);
      const L_m = spanLong / 100;
      const momentCoeffs = SLAB_MOMENT_COEFFICIENTS[supportCondition] || SLAB_MOMENT_COEFFICIENTS['بسيط'];
      const MgovernorLong = Math.max(momentCoeffs.positive, momentCoeffs.negative) * wLong * L_m * L_m * 100;
      if (AsLong > 0 && MgovernorLong > 0) {
        flexureLong = checkFlexure({
          moment: MgovernorLong, width: 100, effectiveDepth: d, As: AsLong, fc, fy, isSlab: true, unitSystem,
        });
      }
    }

    if (ms.V > 0) {
      shear = checkShear({ shear: ms.V, width: 100, effectiveDepth: d, fc, unitSystem });
    }

    if (AsShort > 0 && d > 0) {
      const rc = compareReinforcement({ AsProvided: AsShort, fc, fy, element: 'slab', width: 100, effectiveDepth: d });
      reinforcement = {
        safe: rc.safe, AsProvided: AsShort, AsMin: rc.AsMin,
        rhoMin: getMinReinforcement({ fc, fy, element: 'slab', width: 100, effectiveDepth: d }).rhoMin,
      };
    }
  }

  const overallSafe = thickness.safe
    && (!flexureShort || flexureShort.safe)
    && (!flexureLong || flexureLong.safe)
    && (!shear || shear.safe)
    && (!reinforcement || reinforcement.safe);

  return {
    thickness, flexureShort, flexureLong, shear, reinforcement,
    overallSafe,
    overallStatusAr: overallSafe ? 'البلاطة المصمتة (باتجاهين) محققة ✅' : 'البلاطة المصمتة (باتجاهين) غير محققة ❌',
  };
}

/**
 * 13. checkOneWayRibbedSlab — فحص البلاطة الهوردي باتجاه واحد
 * جدول 7-4: alpha = 20 / 24 / 28 / 10
 * شروط هندسية: hf >= 50 مم AND hf >= (مسافة صافية / 10)
 *              bw >= 100 مم AND bw >= h/3
 */
export function checkOneWayRibbedSlab(params: {
  fc: number; fy: number;
  supportCondition: string;
  span: number;
  hActual: number;       // السماكة الكلية h = hf + ribHeight (سم)
  hf: number;            // سماكة البلاطة العلوية (سم)
  bw: number;            // عرض الضلع الخرساني (سم)
  clearSpacing: number;  // المسافة الصافية بين الأضلاع (سم)
  cover: number;
  load: number;
  rebarCount: number; rebarDiameter: number;
  unitSystem?: UnitSystem;
}): OneWayRibbedSlabResult {
  const { fc, fy, supportCondition, span, hActual, hf, bw, clearSpacing, cover, load, rebarCount, rebarDiameter, unitSystem = 'kg_cm' } = params;

  const thickness = checkSlabThickness({
    slabType: 'oneWayRibbed', supportCondition, span, hActual,
  });

  // شروط هندسية
  const hfMin = Math.max(5, clearSpacing / RIBBED_SLAB_CONSTRAINTS.toppingSpacingCoeff); // 5 سم = 50 مم
  const bwMin = Math.max(10, hActual / RIBBED_SLAB_CONSTRAINTS.ribWidthThicknessCoeff);  // 10 سم = 100 مم

  const geometricChecks = {
    toppingThickEnough: hf >= hfMin,
    ribWidthEnough: bw >= bwMin,
    hfActual: hf,
    hfMin: Math.round(hfMin * 100) / 100,
    bwActual: bw,
    bwMin: Math.round(bwMin * 100) / 100,
  };

  const d = hActual > cover ? hActual - cover : 0;
  const As = rebarCount > 0 && rebarDiameter > 0
    ? rebarCount * (Math.PI / 4) * Math.pow(rebarDiameter / 10, 2) : 0;

  let flexure: FlexureCheckResult | null = null;
  let shear: ShearCheckResult | null = null;
  let reinforcement: OneWayRibbedSlabResult['reinforcement'] = null;

  if (load > 0 && d > 0 && fy > 0) {
    const ms = calculateSlabMomentShear({ load, span, supportCondition, slabType: 'oneWayRibbed' });

    if (As > 0 && ms.Mgovernor > 0) {
      // فحص الانعطاف — مقطع T: b_effective = min(bw + hf, bw + 6*hf)
      const bEff = Math.min(bw + hf, bw + 6 * hf);
      flexure = checkFlexure({
        moment: ms.Mgovernor, width: bw, effectiveDepth: d, As, fc, fy, bEffective: bEff, unitSystem,
      });
    }

    // فحص القص — على الضلع فقط (b = bw)
    if (ms.V > 0) {
      // القص على الضلع: V_rib = V × (spacing / 100)
      shear = checkShear({ shear: ms.V, width: bw, effectiveDepth: d, fc, unitSystem });
    }

    if (As > 0 && d > 0) {
      const rc = compareReinforcement({ AsProvided: As, fc, fy, element: 'slab', width: bw, effectiveDepth: d });
      reinforcement = {
        safe: rc.safe, AsProvided: As, AsMin: rc.AsMin,
        rhoMin: getMinReinforcement({ fc, fy, element: 'slab', width: bw, effectiveDepth: d }).rhoMin,
      };
    }
  }

  const overallSafe = thickness.safe
    && geometricChecks.toppingThickEnough
    && geometricChecks.ribWidthEnough
    && (!flexure || flexure.safe)
    && (!shear || shear.safe)
    && (!reinforcement || reinforcement.safe);

  return {
    thickness, geometricChecks, flexure, shear, reinforcement,
    overallSafe,
    overallStatusAr: overallSafe ? 'البلاطة الهوردي (باتجاه واحد) محققة ✅' : 'البلاطة الهوردي (باتجاه واحد) غير محققة ❌',
  };
}

/**
 * 14. checkTwoWayRibbedSlab — فحص البلاطة الهوردي باتجاهين
 * المحيط المكافئ: P_equiv / 120 (وليس 140)
 */
export function checkTwoWayRibbedSlab(params: {
  fc: number; fy: number;
  supportCondition: string;
  spanLong: number; spanShort: number;
  hActual: number; hf: number; bw: number; clearSpacing: number;
  cover: number; load: number;
  rebarCountShort: number; rebarDiameterShort: number;
  rebarCountLong?: number; rebarDiameterLong?: number;
  unitSystem?: UnitSystem;
}): TwoWayRibbedSlabResult {
  const { fc, fy, supportCondition, spanLong, spanShort, hActual, hf, bw, clearSpacing, cover, load, rebarCountShort, rebarDiameterShort, rebarCountLong, rebarDiameterLong, unitSystem = 'kg_cm' } = params;

  const thickness = checkSlabThickness({
    slabType: 'twoWayRibbed', supportCondition, span: spanLong, hActual, spanLong, spanShort,
  });

  const hfMin = Math.max(5, clearSpacing / RIBBED_SLAB_CONSTRAINTS.toppingSpacingCoeff);
  const bwMin = Math.max(10, hActual / RIBBED_SLAB_CONSTRAINTS.ribWidthThicknessCoeff);

  const geometricChecks = {
    toppingThickEnough: hf >= hfMin,
    ribWidthEnough: bw >= bwMin,
    hfActual: hf,
    hfMin: Math.round(hfMin * 100) / 100,
    bwActual: bw,
    bwMin: Math.round(bwMin * 100) / 100,
  };

  const d = hActual > cover ? hActual - cover : 0;
  const AsShort = rebarCountShort > 0 && rebarDiameterShort > 0
    ? rebarCountShort * (Math.PI / 4) * Math.pow(rebarDiameterShort / 10, 2) : 0;

  let flexureShort: FlexureCheckResult | null = null;
  let flexureLong: FlexureCheckResult | null = null;
  let shear: ShearCheckResult | null = null;
  let reinforcement: TwoWayRibbedSlabResult['reinforcement'] = null;

  if (load > 0 && d > 0 && fy > 0) {
    const ms = calculateSlabMomentShear({
      load, span: spanShort, supportCondition, slabType: 'twoWayRibbed', spanLong, spanShort,
    });

    if (AsShort > 0 && ms.Mgovernor > 0) {
      const bEff = Math.min(bw + hf, bw + 6 * hf);
      flexureShort = checkFlexure({
        moment: ms.Mgovernor, width: bw, effectiveDepth: d, As: AsShort, fc, fy, bEffective: bEff, unitSystem,
      });
    }

    if (ms.V > 0) {
      shear = checkShear({ shear: ms.V, width: bw, effectiveDepth: d, fc, unitSystem });
    }

    if (AsShort > 0 && d > 0) {
      const rc = compareReinforcement({ AsProvided: AsShort, fc, fy, element: 'slab', width: bw, effectiveDepth: d });
      reinforcement = {
        safe: rc.safe, AsProvided: AsShort, AsMin: rc.AsMin,
        rhoMin: getMinReinforcement({ fc, fy, element: 'slab', width: bw, effectiveDepth: d }).rhoMin,
      };
    }
  }

  const overallSafe = thickness.safe
    && geometricChecks.toppingThickEnough
    && geometricChecks.ribWidthEnough
    && (!flexureShort || flexureShort.safe)
    && (!shear || shear.safe)
    && (!reinforcement || reinforcement.safe);

  return {
    thickness, geometricChecks, flexureShort, flexureLong, shear, reinforcement,
    overallSafe,
    overallStatusAr: overallSafe ? 'البلاطة الهوردي (باتجاهين) محققة ✅' : 'البلاطة الهوردي (باتجاهين) غير محققة ❌',
  };
}

/**
 * 15. checkFlatSlab — فحص البلاطة الفطرية
 * h_min المطلق = 150 مم = 15 سم
 * alpha: بدون تيجان=32, مع تيجان خارجية=35, مع تيجان داخلية=38
 * فحص الثقب مع معاملات eta
 */
export function checkFlatSlab(params: {
  fc: number; fy: number;
  hasDropPanels: boolean;
  panelType: 'exterior' | 'interior';
  span: number;
  hActual: number;
  cover: number;
  load: number;
  rebarCount: number; rebarDiameter: number;
  // ثقب
  columnWidth?: number; columnDepth?: number;
  columnReaction?: number;
  columnType?: 'center' | 'edge' | 'corner';
  unitSystem?: UnitSystem;
}): FlatSlabResult {
  const { fc, fy, hasDropPanels, panelType, span, hActual, cover, load, rebarCount, rebarDiameter, columnWidth, columnDepth, columnReaction, columnType = 'center', unitSystem = 'kg_cm' } = params;

  const supportCondition = hasDropPanels ? 'مع تيجان' : 'بدون تيجان';

  const thickness = checkSlabThickness({
    slabType: 'flatSlab', supportCondition, span, hActual, flatSlabPanelType: panelType,
  });

  const d = hActual > cover ? hActual - cover : 0;
  const As = rebarCount > 0 && rebarDiameter > 0
    ? rebarCount * (Math.PI / 4) * Math.pow(rebarDiameter / 10, 2) : 0;

  let flexure: FlexureCheckResult | null = null;
  let shear: ShearCheckResult | null = null;
  let punchingShear: PunchingShearResult | null = null;
  let reinforcement: FlatSlabResult['reinforcement'] = null;

  if (load > 0 && d > 0 && fy > 0) {
    const ms = calculateSlabMomentShear({ load, span, supportCondition, slabType: 'flatSlab' });

    if (As > 0 && ms.Mgovernor > 0) {
      flexure = checkFlexure({
        moment: ms.Mgovernor, width: 100, effectiveDepth: d, As, fc, fy, isSlab: true, unitSystem,
      });
    }

    if (ms.V > 0) {
      shear = checkShear({ shear: ms.V, width: 100, effectiveDepth: d, fc, unitSystem });
    }

    if (As > 0 && d > 0) {
      const rc = compareReinforcement({ AsProvided: As, fc, fy, element: 'slab', width: 100, effectiveDepth: d });
      reinforcement = {
        safe: rc.safe, AsProvided: As, AsMin: rc.AsMin,
        rhoMin: getMinReinforcement({ fc, fy, element: 'slab', width: 100, effectiveDepth: d }).rhoMin,
      };
    }
  }

  // فحص الثقب
  if (columnWidth && columnDepth && columnReaction && columnWidth > 0 && columnDepth > 0 && columnReaction > 0) {
    punchingShear = checkPunchingShear({
      columnWidth, columnDepth, slabThickness: hActual, reaction: columnReaction, fc, columnType, unitSystem,
    });
  }

  const overallSafe = thickness.safe
    && (!flexure || flexure.safe)
    && (!shear || shear.safe)
    && (!punchingShear || punchingShear.safe)
    && (!reinforcement || reinforcement.safe);

  return {
    thickness, flexure, shear, punchingShear, reinforcement,
    overallSafe,
    overallStatusAr: overallSafe ? 'البلاطة الفطرية محققة ✅' : 'البلاطة الفطرية غير محققة ❌',
  };
}

/**
 * 16. checkDroppedBeam — فحص الجائز الساقط
 * جدول 7-1: alpha = 14 / 15 / 16 / 6
 * تغطية 4 سم → d = h - 4
 * smax: عادي min(d/2, 30 سم) — قص عالي min(d/4, 15 سم)
 */
export function checkDroppedBeam(params: {
  fc: number; fy: number;
  supportCondition: string;
  span: number;
  width: number;         // b (سم)
  depth: number;         // h (سم)
  cover?: number;        // التغطية (سم) — افتراضي 4
  moment: number;        // العزم (طن.سم)
  shear: number;         // القص (طن)
  rebarCount: number; rebarDiameter: number;
  stirrupDiameter?: number; stirrupLegs?: number;
  Fs?: number;
  unitSystem?: UnitSystem;
}): DroppedBeamResult {
  const { fc, fy, supportCondition, span, width, depth, cover = 4, moment, shear: V, rebarCount, rebarDiameter, stirrupDiameter = 8, stirrupLegs = 2, Fs, unitSystem = 'kg_cm' } = params;

  const thickness = checkBeamThickness({ beamType: 'dropped', supportCondition, span, hActual: depth });

  const d = depth > cover ? depth - cover : 0;
  const As = rebarCount > 0 && rebarDiameter > 0
    ? rebarCount * (Math.PI / 4) * Math.pow(rebarDiameter / 10, 2) : 0;

  let flexure: FlexureCheckResult | null = null;
  let shearResult: ShearCheckResult | null = null;
  let stirrups: StirrupResult | null = null;
  let reinforcement: DroppedBeamResult['reinforcement'] = null;

  if (moment > 0 && d > 0 && As > 0 && fc > 0 && fy > 0) {
    flexure = checkFlexure({ moment, width, effectiveDepth: d, As, fc, fy, unitSystem });
  }

  if (V > 0 && d > 0 && fc > 0) {
    shearResult = checkShear({ shear: V, width, effectiveDepth: d, fc, unitSystem });

    if (shearResult.stirrupsNeeded && fy > 0) {
      stirrups = calculateStirrups({
        shear: V, width, effectiveDepth: d, fc, fy, stirrupDiameter, stirrupLegs, Fs, unitSystem,
      });
    }
  }

  if (As > 0 && d > 0 && fc > 0 && fy > 0) {
    const rc = compareReinforcement({ AsProvided: As, fc, fy, element: 'beam', width, effectiveDepth: d });
    reinforcement = {
      safe: rc.safe, AsProvided: As, AsMin: rc.AsMin,
      rhoMin: getMinReinforcement({ fc, fy, element: 'beam', width, effectiveDepth: d }).rhoMin,
    };
  }

  const overallSafe = thickness.safe
    && (!flexure || flexure.safe)
    && (!shearResult || shearResult.safe)
    && (!stirrups || stirrups.safe)
    && (!reinforcement || reinforcement.safe);

  return {
    thickness, flexure, shear: shearResult, stirrups, reinforcement,
    overallSafe,
    overallStatusAr: overallSafe ? 'الجائز الساقط محقق ✅' : 'الجائز الساقط غير محقق ❌',
  };
}

/**
 * 17. checkHiddenBeam — فحص الجائز المخفي
 * جدول 7-1: alpha = 16 / 18 / 20 / 8
 * تغطية 3.5 سم → d = h - 3.5 (أضيق من الساقط)
 * smax: عادي min(d/2, 25 سم) — قص عالي min(d/4, 15 سم)
 */
export function checkHiddenBeam(params: {
  fc: number; fy: number;
  supportCondition: string;
  span: number;
  width: number;
  depth: number;
  cover?: number;        // افتراضي 3.5 سم (أضيق من الساقط)
  moment: number;
  shear: number;
  rebarCount: number; rebarDiameter: number;
  stirrupDiameter?: number; stirrupLegs?: number;
  Fs?: number;
  unitSystem?: UnitSystem;
}): HiddenBeamResult {
  const { fc, fy, supportCondition, span, width, depth, cover = 3.5, moment, shear: V, rebarCount, rebarDiameter, stirrupDiameter = 8, stirrupLegs = 2, Fs, unitSystem = 'kg_cm' } = params;

  const thickness = checkBeamThickness({ beamType: 'hidden', supportCondition, span, hActual: depth });

  const d = depth > cover ? depth - cover : 0;
  const As = rebarCount > 0 && rebarDiameter > 0
    ? rebarCount * (Math.PI / 4) * Math.pow(rebarDiameter / 10, 2) : 0;

  let flexure: FlexureCheckResult | null = null;
  let shearResult: ShearCheckResult | null = null;
  let stirrups: StirrupResult | null = null;
  let reinforcement: HiddenBeamResult['reinforcement'] = null;

  if (moment > 0 && d > 0 && As > 0 && fc > 0 && fy > 0) {
    flexure = checkFlexure({ moment, width, effectiveDepth: d, As, fc, fy, unitSystem });
  }

  if (V > 0 && d > 0 && fc > 0) {
    shearResult = checkShear({ shear: V, width, effectiveDepth: d, fc, unitSystem });

    if (shearResult.stirrupsNeeded && fy > 0) {
      // الجائز المخفي: smax أضيق — عادي 25 سم, قص عالي 15 سم
      stirrups = calculateStirrups({
        shear: V, width, effectiveDepth: d, fc, fy, stirrupDiameter, stirrupLegs, Fs, unitSystem,
      });
    }
  }

  if (As > 0 && d > 0 && fc > 0 && fy > 0) {
    const rc = compareReinforcement({ AsProvided: As, fc, fy, element: 'beam', width, effectiveDepth: d });
    reinforcement = {
      safe: rc.safe, AsProvided: As, AsMin: rc.AsMin,
      rhoMin: getMinReinforcement({ fc, fy, element: 'beam', width, effectiveDepth: d }).rhoMin,
    };
  }

  const overallSafe = thickness.safe
    && (!flexure || flexure.safe)
    && (!shearResult || shearResult.safe)
    && (!stirrups || stirrups.safe)
    && (!reinforcement || reinforcement.safe);

  return {
    thickness, flexure, shear: shearResult, stirrups, reinforcement,
    overallSafe,
    overallStatusAr: overallSafe ? 'الجائز المخفي محقق ✅' : 'الجائز المخفي غير محقق ❌',
  };
}
