/**
 * B.S Evaluation — Engineering Calculation Engine
 * Working Stress Design (WSD) — Syrian Arab Code 2024
 * طريقة التشغيل (الكلاسيكية) — الوحدات: كغ/سم² , طن , سم
 */

import { WSD, SLAB_ALPHA, BEAM_ALPHA } from './constants';

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
}

// ===================================================================
// أنواع نتائج الأساسات الجديدة
// ===================================================================

/** نتيجة فحص الأساس المنفرد */
export interface IsolatedFoundationResult extends CalcResult {
  actualStress: number;
  allowableStress: number;
}

/** حالة اللامركزية للأساس المشترك */
export type EccentricityCase = 'ideal' | 'acceptable' | 'danger';

/** نتيجة فحص الأساس المشترك */
export interface CombinedFoundationResult extends CalcResult {
  eccentricity: number;
  eccentricityCase: EccentricityCase;
  sigmaMax: number;
  sigmaMin: number;
  allowableStress: number;
  suggestion?: string;
}

/** نتيجة فحص الحصيرة (الثقب) */
export interface MatFoundationResult extends CalcResult {
  vp: number;
  vcp: number;
  bo: number;
  d: number;
  suggestion?: string;
}

/** نتيجة فحص الأساس المستمر */
export interface ContinuousFoundationResult extends CalcResult {
  actualStress: number;
  allowableStress: number;
  Bmin?: number;
}

/** نتيجة فحص الأعمدة والجدران المحدثة */
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
// 1. شرط السماكة — Slab & Beam Minimum Thickness
// ===================================================================

/**
 * فحص شرط السماكة للبلاطات
 */
export function checkSlabThickness(params: {
  slabType: 'oneWaySolid' | 'twoWaySolid' | 'oneWayRibbed' | 'twoWayRibbed' | 'flatSlab';
  supportCondition: string;
  span: number;        // المجاز (سم)
  hActual: number;     // السماكة المنفذة (سم)
  spanLong?: number;   // المجاز الطويل للبلاطة باتجاهين
  spanShort?: number;  // المجاز القصير للبلاطة باتجاهين
}): SlabThicknessResult {
  const { slabType, supportCondition, span, hActual, spanLong, spanShort } = params;
  let hMin: number;
  let formula: string;

  const conditionMap: Record<string, string> = {
    'بسيط': 'simple',
    'مستمر من طرف واحد': 'oneEndContinuous',
    'مستمر من طرفين': 'bothEndsContinuous',
    'كابولي حر': 'cantilever',
  };

  const condKey = conditionMap[supportCondition] || 'simple';

  if (slabType === 'oneWaySolid') {
    const alpha = SLAB_ALPHA.oneWaySolid[condKey as keyof typeof SLAB_ALPHA.oneWaySolid] || 20;
    hMin = span / alpha;
    formula = `h = L/${alpha} = ${span}/${alpha} = ${hMin.toFixed(1)} سم`;
  } else if (slabType === 'twoWaySolid') {
    if (supportCondition === 'بسيط' || supportCondition === 'simple') {
      hMin = (spanLong || span) / SLAB_ALPHA.twoWaySolid.simple;
      formula = `h = L/${SLAB_ALPHA.twoWaySolid.simple}`;
    } else {
      const lLong = spanLong || span;
      const lShort = spanShort || span;
      const alphaSimple = 20;
      const alphaCont = 28;
      const alpha = supportCondition === 'مستمرة من طرفين' ? alphaCont : alphaSimple;
      const perimeter = (alpha * lLong + alpha * lShort);
      hMin = perimeter / 140;
      formula = `h = المحيط المكافئ / 140`;
    }
  } else if (slabType === 'oneWayRibbed') {
    const alpha = SLAB_ALPHA.oneWayRibbed[condKey as keyof typeof SLAB_ALPHA.oneWayRibbed] || 20;
    hMin = span / alpha;
    formula = `h = L/${alpha} = ${span}/${alpha} = ${hMin.toFixed(1)} سم`;
  } else if (slabType === 'twoWayRibbed') {
    if (supportCondition === 'بسيط' || supportCondition === 'simple') {
      hMin = span / SLAB_ALPHA.twoWayRibbed.simple;
    } else {
      hMin = span / SLAB_ALPHA.twoWayRibbed.continuous;
    }
    formula = `h = L/α`;
  } else if (slabType === 'flatSlab') {
    if (supportCondition === 'مع تيجان' || supportCondition === 'withDropPanels') {
      hMin = span / SLAB_ALPHA.flatSlab.withDropPanels;
      formula = `h = Lmax/${SLAB_ALPHA.flatSlab.withDropPanels}`;
    } else {
      hMin = span / SLAB_ALPHA.flatSlab.withoutDropPanels;
      formula = `h = Lmax/${SLAB_ALPHA.flatSlab.withoutDropPanels}`;
    }
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
 * فحص شرط السماكة للجوائز الساقطة
 */
export function checkBeamThickness(params: {
  supportCondition: string;
  span: number;
  hActual: number;
}): SlabThicknessResult {
  const { supportCondition, span, hActual } = params;

  const conditionMap: Record<string, string> = {
    'بسيط': 'simple',
    'مستمر من طرف واحد': 'oneEndContinuous',
    'مستمر من طرفين': 'bothEndsContinuous',
    'كابولي حر': 'cantilever',
  };

  const condKey = conditionMap[supportCondition] || 'simple';
  const alpha = BEAM_ALPHA[condKey as keyof typeof BEAM_ALPHA] || 16;
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

/**
 * فحص إجهاد التربة للأساس المنفرد
 * σ_فعلي = P × 1000 / (L × W)
 * ✅ إذا σ_فعلي ≤ σ_مسموح
 */
export function checkIsolatedFoundation(params: {
  load: number;              // الحمولة الكلية (طن)
  length: number;            // الطول (سم)
  width: number;             // العرض (سم)
  allowableStress: number;   // إجهاد التربة المسموح (كغ/سم²)
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

/**
 * فحص الأساس المشترك — حساب اللامركزية
 * 1. e = 0 → توزيع منتظم (مثالي)
 * 2. e ≤ L/6 → شبه منحرف (مقبول)
 * 3. e > L/6 → غير محقق (خطر — دوران)
 */
export function checkCombinedFoundation(params: {
  P1: number;                // حمل العمود الخارجي (طن)
  P2: number;                // حمل العمود الداخلي (طن)
  S: number;                 // المسافة بين العمودين (سم)
  L: number;                 // طول الأساس الكلي (سم)
  B: number;                 // عرض الأساس (سم)
  L_out: number;             // بروز خارجي قبل العمود الأول (سم)
  allowableStress: number;   // إجهاد التربة المسموح (كغ/سم²)
}): CombinedFoundationResult {
  const { P1, P2, S, L, B, L_out, allowableStress } = params;
  const P_total = P1 + P2;

  // موقع المحصلة من حافة القاعدة
  const x_R = (P2 * S) / P_total;
  const x_R_total = x_R + L_out;

  // مركز ثقل القاعدة
  const x_c = L / 2;

  // اللامركزية
  const e = Math.abs(x_R_total - x_c);

  let eccentricityCase: EccentricityCase;
  let sigmaMax: number;
  let sigmaMin: number;
  let safe: boolean;
  let suggestion: string | undefined;

  if (e === 0) {
    // الحالة المثالية — توزيع منتظم
    eccentricityCase = 'ideal';
    const sigma = (P_total * 1000) / (B * L);
    sigmaMax = sigma;
    sigmaMin = sigma;
    safe = sigma <= allowableStress;
  } else if (e <= L / 6) {
    // الحالة المقبولة — شبه منحرف
    eccentricityCase = 'acceptable';
    const sigma_avg = (P_total * 1000) / (B * L);
    sigmaMax = sigma_avg * (1 + (6 * e) / L);
    sigmaMin = sigma_avg * (1 - (6 * e) / L);
    safe = sigmaMax <= allowableStress && sigmaMin >= 0;
  } else {
    // حالة الخطر — دوران
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
        ? safe ? 'الأساس محقق (شبه منحرف) ✅' : 'الأساس غير محقق (إجهاد exceeds المسموح) ❌'
        : 'الأساس غير محقق — خطر دوران ❌',
    eccentricity: Math.round(e * 100) / 100,
    eccentricityCase,
    sigmaMax: Math.round(sigmaMax * 100) / 100,
    sigmaMin: Math.round(sigmaMin * 100) / 100,
    allowableStress,
    suggestion,
  };
}

/**
 * فحص الحصيرة — الثقب هو الحاكم
 * vp = R × 1000 / (b0 × d)  مقابل  vcp = 0.9√f'c
 */
export function checkMatFoundation(params: {
  columnLoad: number;        // حمل أكبر عمود (طن)
  matThickness: number;      // سماكة الحصيرة (سم)
  fc: number;                // المقاومة الاسطوانية المميزة f'c (كغ/سم²)
  columnWidth?: number;      // عرض العمود (سم) — ل حساب b0
  columnDepth?: number;      // عمق العمود (سم) — ل حساب b0
  columnType?: 'center' | 'edge' | 'corner'; // نوع العمود
}): MatFoundationResult {
  const {
    columnLoad, matThickness, fc,
    columnWidth = 40, columnDepth = 40,
    columnType = 'center',
  } = params;

  const d = matThickness - 2.5; // العمق الفعال (سم)
  if (d <= 0) {
    return {
      safe: false,
      status: 'غير محقق',
      statusAr: 'العمق الفعال سالب — تحقق من السماكة ❌',
      vp: 0,
      vcp: 0,
      bo: 0,
      d: 0,
      suggestion: 'زيادة سماكة الحصيرة',
    };
  }

  // محيط المقطع الحرج
  let bo: number;
  if (columnType === 'center') {
    bo = 2 * ((columnWidth + d) + (columnDepth + d));
  } else if (columnType === 'edge') {
    bo = (columnWidth + d) + 2 * (columnDepth + d);
  } else {
    bo = (columnWidth + d) + (columnDepth + d);
  }

  const R = columnLoad * 1000; // كغ
  const vp = R / (bo * d);    // إجهاد الثقب الفعلي (كغ/سم²)
  const vcp = WSD.vp_foundation(fc); // 0.9√f'c (كغ/سم²)

  const safe = vp <= vcp;

  let suggestion: string | undefined;
  if (!safe) {
    suggestion = 'خطر: اختراق العمود للحصيرة. يُنصح بزيادة سماكة الحصيرة';
  }

  return {
    safe,
    status: safe ? 'محقق' : 'غير محقق',
    statusAr: safe ? 'الحصيرة محققة ✅' : 'الحصيرة غير محققة ❌',
    vp: Math.round(vp * 100) / 100,
    vcp: Math.round(vcp * 100) / 100,
    bo: Math.round(bo * 100) / 100,
    d: Math.round(d * 100) / 100,
    suggestion,
  };
}

/**
 * فحص الأساس المستمر — لكل 1 متر طولي
 * σ = q × 1000 / (B × 100)
 * ✅ إذا σ ≤ σ_مسموح
 * ❌ يقترح B_min = q × 1000 / σ_مسموح
 */
export function checkContinuousFoundation(params: {
  q: number;                 // الحمولة الخطية (طن/م)
  B: number;                 // عرض الأساس (سم)
  allowableStress: number;   // إجهاد التربة المسموح (كغ/سم²)
}): ContinuousFoundationResult {
  const { q, B, allowableStress } = params;

  // q طن/م → كغ/م بالضرب ×1000 ثم قسمة على 100 سم/م → كغ/سم²
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
// 3. فحص إجهاد الأعمدة والجدران — المحدث مع المساحة المكافئة
// ===================================================================

/**
 * فحص إجهاد الضغط للعمود/الجدار — WSD مع المساحة المكافئة ومعامل النحافة
 *
 * الخطوات:
 * 1. A_s = مدخل المستخدم أو 1% من (b×h) حسب الموقع
 * 2. A_eq = (b×h) + (n-1)×A_s
 * 3. σ_فعلي = حمولة × 1000 / A_eq
 * 4. σ_مسموح = 0.3 × f'c
 * 5. λ = H_clear / min(b,h) — إذا > 12: تطبيق معامل تخفيض φ
 * 6. آمن إذا: σ_فعلي ≤ σ_مسموح × φ
 */
export function checkColumnWallStress(params: {
  load: number;              // الحمولة الاستثمارية (طن)
  width: number;             // عرض المقطع b (سم)
  depth: number;             // طول المقطع h (سم)
  fc: number;                // المقاومة الاسطوانية f'c (كغ/سم²)
  n?: number;                // نسبة النمطية (افتراضي 15)
  As?: number;               // مساحة حديد التسليح (سم²) — إذا لم تدخل تفرض الدنيا
  H_clear: number;           // الارتفاع الصافي (سم)
  columnLocation: 'وسطي' | 'طرفي' | 'ركني' | ''; // موقع العمود
}): ColumnWallResult {
  const { load, width, depth, fc, n, H_clear, columnLocation } = params;

  // 1. نسبة النمطية
  const nVal = n || WSD.default_n;

  // 1. مساحة حديد التسليح — إذا لم يدخلها المستخدم تفرض 1%
  let AsProvided = params.As;
  if (!AsProvided || AsProvided <= 0) {
    AsProvided = WSD.min_steel_ratio_column[
      columnLocation === 'وسطي' ? 'center'
        : columnLocation === 'طرفي' ? 'edge'
          : columnLocation === 'ركني' ? 'corner'
            : 'center'
    ] * (width * depth);
  }

  // 2. المساحة المكافئة
  const Aeq = (width * depth) + (nVal - 1) * AsProvided;

  // 3. الإجهاد الفعلي
  const actualStress = (load * 1000) / Aeq;

  // 4. الإجهاد المسموح
  const allowableStress = WSD.fc_allowable_axial * fc; // 0.3 × f'c

  // 5. معامل النحافة
  const minDim = Math.min(width, depth);
  const slendernessRatio = H_clear / minDim;

  // 6. معامل التخفيض
  const locationKey = columnLocation === 'وسطي' ? 'center'
    : columnLocation === 'طرفي' ? 'edge'
      : columnLocation === 'ركني' ? 'corner'
        : 'center';

  let reductionFactor = 1.0;
  if (slendernessRatio > WSD.slenderness_limit) {
    reductionFactor = WSD.slenderness_reduction[locationKey as keyof typeof WSD.slenderness_reduction] || 0.6;
  }

  // الإجهاد المسموح الفعّال
  const effectiveAllowable = allowableStress * reductionFactor;

  // الفحص النهائي
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
// 4. فحص إجهاد التربة — القديم (للتوافق مع الأساس المنفرد)
// ===================================================================

/**
 * فحص إجهاد التربة للأساسات المنفردة
 * Actual Stress = Load × 1000 / (L × W)
 * @deprecated استخدم checkIsolatedFoundation بدلاً منه
 */
export function checkSoilStress(params: {
  load: number;     // الحمولة (طن)
  length: number;   // الطول (سم)
  width: number;    // العرض (سم)
  allowableStress: number; // إجهاد التربة المسموح (كغ/سم²)
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

/**
 * فحص إجهاد الضغط للأعمدة — القديم (للتوافق)
 * @deprecated استخدم checkColumnWallStress بدلاً منه
 */
export function checkColumnStress(params: {
  load: number;     // الحمولة الاستثمارية (طن)
  width: number;    // عرض المقطع (سم)
  depth: number;    // طول المقطع (سم)
  fc: number;       // المقاومة الاسطوانية (كغ/سم²)
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
// الكود العربي السوري — الطريقة الكلاسيكية
// ===================================================================

/**
 * فحص الانعطاف للبلاطات والجوائز — طريقة التشغيل WSD
 * n = 2,000,000 / (15,000 × √f'c)
 * kd = (-nAs + √(nAs² + 2nAsbd)) / b
 * jd = d - kd/3
 * fc = 2Mw / (b × kd × jd)
 * fs = Mw / (As × jd)
 * fc_مس = 0.4 × f'c
 * fs_مس = 0.5 × fy
 * مُصلح: ω > 0.6375
 */
export function checkFlexure(params: {
  moment: number;    // العزم المطبق (طن.سم)
  width: number;     // عرض المقطع (سم)
  effectiveDepth: number; // العمق الفعال d (سم)
  As: number;        // مساحة التسليح (سم²)
  fc: number;        // f'c (كغ/سم²)
  fy: number;        // fy (كغ/سم²)
  isSlab?: boolean;  // هل بلاطة (عرض = 100 سم)؟
}): FlexureCheckResult {
  const { moment, width, effectiveDepth: d, As, fc, fy, isSlab } = params;

  if (d <= 0) {
    return {
      safe: false,
      status: 'غير محقق',
      statusAr: 'العمق الفعال ≤ 0 ❌',
      kd: 0, jd: 0, fc: 0, fs: 0,
      fcAllowable: 0, fsAllowable: 0,
      n: 0, overReinforced: false,
    };
  }

  const n = WSD.getN(fc);
  const b = isSlab ? 100 : width;
  const Mw = moment * 1000; // تحويل طن.سم إلى كغ.سم

  // عمق المحور الحيادي
  // kd = (-nAs + √(nAs² + 2nAsbd)) / b
  const nAs = n * As;
  const discriminant = nAs * nAs + 2 * nAs * b * d;
  const kd = (-nAs + Math.sqrt(discriminant)) / b;
  const jd = d - kd / 3;

  // إجهادات فعلية
  const fcStress = (2 * Mw) / (b * kd * jd);        // إجهاد الخرسانة (كغ/سم²)
  const fsStress = Mw / (As * jd);                    // إجهاد الحديد (كغ/سم²)

  // إجهادات مسموحة — الكود العربي السوري WSD
  const fcAllowable = WSD.fc_allowable_flexure * fc;  // 0.4 × f'c
  const fsAllowable = WSD.getFsAllowable(fy);         // 0.5 × fy

  // فحص التسليح الزائد — ω = ρ × fy / f'c
  const rho = As / (b * d);
  const omega = rho * fy / fc;
  const overReinforced = omega > WSD.omega_max; // ω > 0.6375

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
 * v = V×1000 / (b × d)
 * vc = 0.5√f'c
 * vmax = 2.5√f'c
 */
export function checkShear(params: {
  shear: number;       // قوة القص (طن)
  width: number;       // عرض المقطع b (سم)
  effectiveDepth: number; // العمق الفعال d (سم)
  fc: number;          // f'c (كغ/سم²)
}): ShearCheckResult {
  const { shear, width, effectiveDepth: d, fc } = params;

  const V = shear * 1000; // تحويل إلى كغ
  const v = V / (width * d); // إجهاد القص الفعلي (كغ/سم²)
  const vc = WSD.vc(fc); // مقاومة الخرسانة للقص
  const vmax = WSD.vmax(fc); // الإجهاد الأقصى

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
// ===================================================================

/**
 * حساب مساحة وتباعد الأطواق
 * s = (Asv × Fs) / ((v - vc) × b)
 * smax = min(d/2, 20)
 */
export function calculateStirrups(params: {
  shear: number;           // قوة القص (طن)
  width: number;           // عرض المقطع b (سم)
  effectiveDepth: number;  // العمق الفعال d (سم)
  fc: number;              // f'c (كغ/سم²)
  fy: number;              // fy (كغ/سم²)
  stirrupDiameter: number; // قطر الأسوار (مم)
  stirrupLegs: number;     // عدد فروع الأساور
  Fs?: number;             // إجهاد الحديد المسموح للأساور — يدخله المستخدم (افتراضي 0.5×fy)
}): StirrupResult {
  const { shear, width, effectiveDepth: d, fc, fy, stirrupDiameter, stirrupLegs, Fs } = params;

  const V = shear * 1000;
  const v = V / (width * d);
  const vc = WSD.vc(fc);
  const FsVal = Fs || 0.5 * fy; // افتراضي 0.5 × fy

  // مساحة التسليح المتوفرة
  const singleBarArea = (Math.PI / 4) * Math.pow(stirrupDiameter / 10, 2); // ملم² إلى سم²
  const Av_provided = singleBarArea * stirrupLegs;

  // التباعد المطلوب: s = (Asv × Fs) / ((v - vc) × b)
  const v_excess = v - vc;
  let s: number;
  if (v_excess <= 0) {
    s = 999; // لا حاجة لأطواق إضافية
  } else {
    s = (Av_provided * FsVal) / (v_excess * width);
  }

  // التباعد الأقصى المسموح: min(d/2, 20)
  const smax = Math.min(d / 2, WSD.smax_stirrup);

  // استخدام التباعد الأقصى
  const useSmax = s >= smax;
  const finalSpacing = useSmax ? smax : Math.floor(s);

  // مساحة التسليح المطلوبة
  const Vs = Math.max(V - vc * width * d, 0);
  const Av_required = Vs / (FsVal * d);

  return {
    spacing: Math.round(finalSpacing * 10) / 10,
    spacingMax: Math.round(smax * 10) / 10,
    useSmax,
    areaRequired: Math.round(Av_required * 1000) / 1000,
    areaProvided: Math.round(Av_provided * 1000) / 1000,
    safe: Av_provided >= Av_required * 0.9,
  };
}

// ===================================================================
// 8. فحص الثقب — Punching Shear Check (WSD)
// ===================================================================

/**
 * فحص الثقب للبلاطات الفطرية
 * b0 = 2[(colW+d)+(colD+d)]
 * vp = R×1000 / (b0×d)
 * vcp = 0.5√f'c (للبلاطات)
 */
export function checkPunchingShear(params: {
  columnWidth: number;    // عرض العمود c1 (سم)
  columnDepth: number;    // عمق العمود c2 (سم)
  slabThickness: number;  // سماكة البلاطة h (سم)
  reaction: number;       // رد فعل العمود (طن)
  fc: number;             // f'c (كغ/سم²)
  columnType?: 'center' | 'edge' | 'corner'; // نوع العمود
}): PunchingShearResult {
  const { columnWidth: c1, columnDepth: c2, slabThickness: h, reaction, fc, columnType = 'center' } = params;

  const d = h - 2.5; // العمق الفعال (سم) — تغطية 2.5 سم
  if (d <= 0) {
    return {
      safe: false,
      status: 'غير محقق',
      statusAr: 'العمق الفعال سالب ❌',
      vp: 0,
      actualStress: 0,
      bo: 0,
      formula: '',
    };
  }

  // محيط المقطع الحرج (على بعد d/2 من وجه العمود)
  let bo: number;
  if (columnType === 'center') {
    bo = 2 * ((c1 + d) + (c2 + d)); // محيط كامل
  } else if (columnType === 'edge') {
    bo = (c1 + d) + 2 * (c2 + d); // ثلاثة أوجه
  } else {
    bo = (c1 + d) + (c2 + d); // وجهان
  }

  const R = reaction * 1000; // تحويل إلى كغ
  const actualStress = R / (bo * d);
  const vp = WSD.vp(fc); // 0.5√f'c للبلاطات

  const safe = actualStress <= vp;

  return {
    safe,
    status: safe ? 'محقق' : 'غير محقق',
    statusAr: safe ? 'آمن (محقق) ✅' : 'غير آمن (غير محقق) — يحتاج زيادة سماكة البلاطة أو إضافة تيجان ❌',
    vp: Math.round(vp * 100) / 100,
    actualStress: Math.round(actualStress * 100) / 100,
    bo: Math.round(bo * 100) / 100,
    formula: `v = ${Math.round(actualStress * 100) / 100} كغ/سم² ≤ vp = ${Math.round(vp * 100) / 100} كغ/سم²`,
  };
}

// ===================================================================
// 9. مساحة التسليح الدنيا — Minimum Reinforcement
// ===================================================================

/**
 * حساب نسبة ومساحة التسليح الدنيا
 */
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

/**
 * مقارنة مساحة التسليح المقدمة مع الدنيا
 */
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
// 10. حساب عزم الانعطاف وقوة القص للبلاطات — Slab Moment & Shear
// الكود العربي السوري 2024 — WSD
// ===================================================================

/**
 * معاملات العزم والقص حسب طبيعة الاستناد — WSD
 * بلاطة باتجاه واحد (شريحة عرض 1م = 100 سم)
 */
export const SLAB_MOMENT_COEFFICIENTS: Record<string, { positive: number; negative: number }> = {
  'بسيط': { positive: 1 / 8, negative: 0 },
  'مستمر من طرف واحد': { positive: 1 / 10, negative: 1 / 10 },
  'مستمر من طرفين': { positive: 1 / 12, negative: 1 / 12 },
  'كابولي حر': { positive: 0, negative: 1 / 2 },
};

/**
 * معاملات القص حسب طبيعة الاستناد
 */
export const SLAB_SHEAR_COEFFICIENTS: Record<string, number> = {
  'بسيط': 0.5,
  'مستمر من طرف واحد': 0.6,
  'مستمر من طرفين': 0.5,
  'كابولي حر': 1.0,
};

/** نتيجة حساب عزم وقص البلاطة */
export interface SlabMomentShearResult {
  /** العظم الموجب عند منتصف المجاز (طن.سم/م) */
  Mpositive: number;
  /** العظم السالب عند المسند (طن.سم/م) */
  Mnegative: number;
  /** العظم الحاكم (الأكبر) (طن.سم/م) */
  Mgovernor: number;
  /** قوة القص (طن/م) */
  V: number;
  /** الحمل الخطي w (طن/م) — w = load × 1m */
  w: number;
  /** معامل العزم المستخدم */
  momentCoeffPositive: number;
  momentCoeffNegative: number;
  /** معامل القص المستخدم */
  shearCoeff: number;
}

/**
 * حساب عزم الانعطاف وقوة القص للبلاطة باتجاه واحد
 *
 * وحدة الحمولة: طن/م² → شريحة 1م → w = load × 1 (طن/م)
 * العزم: M = coefficient × w × L² (طن.م) → × 100 → طن.سم/م
 * القص: V = coefficient × w × L (طن/م)
 *
 * بلاطة باتجاهين: نستخدم المجاز القصير مع معاملات التوزيع
 */
export function calculateSlabMomentShear(params: {
  load: number;              // الحمولة (طن/م²)
  span: number;              // المجاز (سم) — المجاز القصير للبلاطة باتجاهين
  supportCondition: string;  // طبيعة الاستناد
  slabType?: SlabSubType;   // نوع البلاطة
  spanLong?: number;        // المجاز الطويل (سم) — للبلاطة باتجاهين
  spanShort?: number;       // المجاز القصير (سم) — للبلاطة باتجاهين
}): SlabMomentShearResult {
  const { load, span, supportCondition, slabType, spanLong, spanShort } = params;

  // الحمل الخطي لشريحة 1م
  let w = load; // طن/م (load × 1m strip)

  // للمجاز: نستخدم المجاز المناسب
  let L = span / 100; // سم → متر

  // للبلاطة باتجاهين: معاملات التوزيع حسب نسبة المجازين
  let distributionFactor = 1.0; // للبلاطة باتجاه واحد
  if (slabType === 'twoWaySolid' || slabType === 'twoWayRibbed') {
    const lLong = (spanLong || span) / 100;
    const lShort = (spanShort || span) / 100;
    L = lShort; // نستخدم المجاز القصير
    const ratio = lShort / lLong;
    // معامل توزيع الحمل على الاتجاه القصير — تقريباً
    // α = 1 / (1 + (L_short/L_long)^4) للاتجاه القصير
    distributionFactor = 1 / (1 + Math.pow(ratio, 4));
    // نأخذ الحمل على الاتجاه القصير فقط
    w = load * distributionFactor;
  }

  // معاملات العزم
  const momentCoeffs = SLAB_MOMENT_COEFFICIENTS[supportCondition] || SLAB_MOMENT_COEFFICIENTS['بسيط'];
  const shearCoeff = SLAB_SHEAR_COEFFICIENTS[supportCondition] || 0.5;

  // حساب العزم
  // M = coeff × w × L² (طن.م) → × 100 → طن.سم/م
  const Mpositive = momentCoeffs.positive * w * L * L * 100;
  const Mnegative = momentCoeffs.negative * w * L * L * 100;
  const Mgovernor = Math.max(Mpositive, Mnegative);

  // حساب القص
  // V = coeff × w × L (طن/م)
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

type SlabSubType = 'oneWaySolid' | 'twoWaySolid' | 'oneWayRibbed' | 'twoWayRibbed' | 'flatSlab';
