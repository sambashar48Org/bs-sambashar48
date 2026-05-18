/**
 * B.S Evaluation — Engineering Calculation Constants
 * Syrian Arab Building Code 2024 (6th Edition) — Working Stress Design (WSD) Method
 * الطبعة السادسة — الكود العربي السوري 2024
 * طريقة التشغيل (الكلاسيكية) — الوحدات: كغ/سم² , طن , سم
 */

export const APP_VERSION = '1.1.0';
export const APP_NAME = 'B.S Evaluation';

// ======== Image Upload Limits ========
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_IMAGE_SIZE = 1 * 1024 * 1024; // 1MB per image

// ======== Image Limits Per Section ========
export const IMAGE_LIMITS = {
  sitePhotos: 2,        // صور الموقع العام
  crackPhotos: 4,       // صور التشققات الإنشائية (للمبنى بالكامل)
  architecturalPhotos: 5, // صور التقرير المعماري
  reportPhotos: 1,      // صور لكل تقرير (كهربائي/صحي/صحي)
  technicalNotesPhotos: 5, // صور الملاحظات الفنية
  plumbingLeakPhotos: 4, // صور تسريب المياه
} as const;

// ======== File Upload Limits ========
export const MAX_SOIL_REPORT_SIZE = 20 * 1024 * 1024; // 20MB for soil report

export const PROJECT_ALLOWED_FIELDS = new Set([
  'name', 'is_current', 'building_data', 'architectural_report',
  'structural_report', 'foundations', 'columns_walls', 'beam_slab',
  'electrical', 'plumbing', 'technical_notes', 'final_report'
]);

export const VALIDATION = {
  usernameMinLen: 2,
  usernameMaxLen: 50,
  fullNameMinLen: 2,
  fullNameMaxLen: 100,
  passwordMinLen: 8,
  usernamePattern: /^[a-zA-Z0-9_\u0600-\u06FF\s]{2,50}$/,
} as const;

// ===================================================================
// WORKING STRESS DESIGN (WSD) — الكود العربي السوري 2024 (الطبعة السادسة)
// طريقة التشغيل (الكلاسيكية) — الوحدات: كغ/سم² , طن , سم
// ===================================================================

/**
 * إجهاد الضغط المسموح للخرسانة — طريقة التشغيل WSD
 * Allowable stresses per Syrian Arab Code 2024 (6th Edition)
 *
 * نظام الوحدات: kg_cm أو N_mm (MPa)
 * — kg_cm: كغ/سم² , طن , سم
 * — N_mm: N/mm² (MPa) , kN , mm
 */
export const WSD = {
  // ── معامل المرونة — Elastic Moduli ──
  // الكود العربي السوري 2024 (الطبعة السادسة):
  // Ec = 18000 × √f'ci  (كغ/سم²)
  // Ec = 5700 × √f'ci   (N/mm² = MPa)
  // Es = 2,000,000 كغ/سم² = 200,000 N/mm²

  /** معامل المرونة للخرسانة (كغ/سم²) — الطبعة السادسة */
  Ec_kg: (fc: number) => 18000 * Math.sqrt(fc),
  /** معامل المرونة للخرسانة (N/mm²) — الطبعة السادسة */
  Ec_MPa: (fc: number) => 5700 * Math.sqrt(fc),

  /** معامل المرونة للحديد */
  Es_kg: 2_000_000,   // كغ/سم²
  Es_MPa: 200_000,    // N/mm²

  /**
   * نسبة النمطية n — الطبعة السادسة 2024
   * ثابتة عند n = 15 للحالات العادية
   * (كانت تُحسب سابقاً كـ Es/Ec المقرب)
   */
  n: 15,

  /**
   * حساب n القديم (للتوافق فقط) — لا يُستخدم في الحسابات الجديدة
   * @deprecated استخدم WSD.n = 15 مباشرة
   */
  getN_deprecated: (fc: number) => Math.round(2000000 / (18000 * Math.sqrt(fc))),

  // ── إجهادات الضغط المسموحة ──

  /** إجهاد الضغط المسموح بسبب الانحناء — fc_allowable = 0.40 × f'c */
  fc_allowable_flexure: 0.40,

  /** إجهاد الضغط المسموح بحالة الضغط المحوري (أعمدة) — fc_allowable = 0.30 × f'c */
  fc_allowable_axial: 0.30,

  /** إجهاد الخضوع المسموح للحديد — fs_allowable = 0.5 × fy */
  getFsAllowable: (fy: number) => 0.5 * fy,

  // ── مقاومة القص الخرسانية — kg/cm² ──
  /** vc = 0.50√f'c (كغ/سم²) */
  vc_kg: (fc: number) => 0.50 * Math.sqrt(fc),
  /** vmax = 2.5√f'c (كغ/سم²) */
  vmax_kg: (fc: number) => 2.5 * Math.sqrt(fc),

  // ── مقاومة القص الخرسانية — N/mm² (MPa) ──
  /** vc = 0.16√f'c (N/mm²) */
  vc_MPa: (fc: number) => 0.16 * Math.sqrt(fc),
  /** vmax = 0.80√f'c (N/mm²) */
  vmax_MPa: (fc: number) => 0.80 * Math.sqrt(fc),

  // ── مقاومة الثقب — Punching Shear ──
  /** ثقب البلاطات: vp = 0.50√f'c (كغ/سم²) */
  vp_kg: (fc: number) => 0.50 * Math.sqrt(fc),
  /** ثقب البلاطات: vp = 0.16√f'c (N/mm²) */
  vp_MPa: (fc: number) => 0.16 * Math.sqrt(fc),

  /** ثقب الأساسات / الحصيرة: vp = 0.9√f'c (كغ/سم²) أو 0.3√f'c (N/mm²) */
  vp_foundation_kg: (fc: number) => 0.9 * Math.sqrt(fc),
  vp_foundation_MPa: (fc: number) => 0.3 * Math.sqrt(fc),

  // ── توافق مع الواجهات القديمة (kg/cm² فقط) ──
  /** @deprecated استخدم vc_kg أو vc_MPa حسب نظام الوحدات */
  vc: (fc: number) => 0.50 * Math.sqrt(fc),
  /** @deprecated استخدم vmax_kg أو vmax_MPa */
  vmax: (fc: number) => 2.5 * Math.sqrt(fc),
  /** @deprecated استخدم vp_kg أو vp_MPa */
  vp: (fc: number) => 0.50 * Math.sqrt(fc),
  /** @deprecated استخدم vp_foundation_kg أو vp_foundation_MPa */
  vp_foundation: (fc: number) => 0.9 * Math.sqrt(fc),
  /** @deprecated استخدم WSD.n = 15 */
  getN: (fc: number) => 15,

  // ── معاملات النحافة ──
  slenderness_reduction: {
    center: 0.8,
    edge: 0.7,
    corner: 0.6,
  },
  slenderness_limit: 12,

  min_steel_ratio_column: {
    center: 0.01,
    edge: 0.01,
    corner: 0.01,
  },

  default_n: 15,

  omega_max_deprecated: 0.6375,

  // ── أقصى مسافة بين الأساور ──
  // الكود العربي السوري 2024 (الطبعة السادسة):
  // الحالة العادية: smax = min(d/2, 300mm) = min(d/2, 30سم)
  // حالة القص العالي: smax = min(d/4, 150mm) = min(d/4, 15سم)
  smax_stirrup_normal_cm: 30,    // 300 مم = 30 سم
  smax_stirrup_high_shear_cm: 15, // 150 مم = 15 سم

  /** @deprecated استخدم smax_stirrup_normal_cm */
  smax_stirrup: 30,

  // ── نسبة التسليح الدنيا للبلاطات ──
  /** rho_min = 0.0018 لحديد عالي المقاومة (fy >= 420 MPa = 4200 كغ/سم²) */
  rho_min_slab_high_strength: 0.0018,
  /** rho_min = 0.0020 لحديد عادي المقاومة */
  rho_min_slab_normal: 0.0020,

} as const;

// ===================================================================
// شرط السماكة — Minimum Thickness Requirements
// الكود العربي السوري 2024 (الطبعة السادسة) — التحكم بالانحراف
// h = L / α
// ===================================================================

/**
 * معاملات السماكة الدنيا للبلاطات — الطبعة السادسة 2024
 * جدول 7-2: بلاطة مصمتة باتجاه واحد
 * جدول 7-3: بلاطة مصمتة باتجاهين
 * جدول 7-4: بلاطة هوردي
 * جدول 7-5: بلاطة فطرية
 */
export const SLAB_ALPHA = {
  // بلاطة مصمتة باتجاه واحد — One-way solid slab (جدول 7-2)
  oneWaySolid: {
    simple: 25,
    oneEndContinuous: 27,   // محدث من 29
    bothEndsContinuous: 30, // محدث من 33
    cantilever: 10,
  },

  // بلاطة مصمتة باتجاهين — Two-way solid slab (جدول 7-3)
  twoWaySolid: {
    simple: 30,
    continuous: 33,         // يُستخدم فقط مع المحيط المكافئ
  },

  // بلاطة هوردي باتجاه واحد — One-way ribbed slab (جدول 7-4)
  oneWayRibbed: {
    simple: 20,
    oneEndContinuous: 24,
    bothEndsContinuous: 28,
    cantilever: 10,
  },

  // بلاطة هوردي باتجاهين — Two-way ribbed slab
  twoWayRibbed: {
    simple: 25,
    continuous: 28,
  },

  // بلاطة فطرية — Flat slab (جدول 7-5)
  // الطبعة السادسة: تمييز بين خارجية وداخلية
  flatSlab: {
    withoutDropPanels: 32,    // بدون سقوط — محدث من 33
    withDropExterior: 35,     // مع سقوط — باكية خارجية
    withDropInterior: 38,     // مع سقوط — باكية داخلية
    withDropPanels: 35,       // للتوافق — يُستخدم كقيمة افتراضية
  },
} as const;

/**
 * معاملات السماكة الدنيا للجوائز — الطبعة السادسة 2024
 * جدول 7-1: h = L / α
 */
export const BEAM_ALPHA = {
  // جائز ساقط — Dropped beam
  dropped: {
    simple: 14,
    oneEndContinuous: 15,
    bothEndsContinuous: 16,
    cantilever: 6,
  },

  // جائز مخفي — Hidden beam
  hidden: {
    simple: 16,
    oneEndContinuous: 18,    // محدث من 18.5
    bothEndsContinuous: 20,  // محدث من 21
    cantilever: 8,
  },
} as const;

/**
 * @deprecated استخدم BEAM_ALPHA.dropped أو BEAM_ALPHA.hidden
 * للتوافق مع الكود القديم — يُرجع قيم الجائز الساقط
 */
export const BEAM_ALPHA_LEGACY = {
  simple: 14,
  oneEndContinuous: 15,
  bothEndsContinuous: 16,
  cantilever: 6,
} as const;

// ===================================================================
// معاملات المحيط المكافئ — Two-Way Slabs
// الكود العربي السوري 2024 (الطبعة السادسة)
// ===================================================================

/**
 * معاملات الضلع للمحيط المكافئ
 * beta_continuous = 0.76 (محدث من 0.80)
 * beta_free = 1.00
 * مقام المحيط المكافئ:
 *   بلاطة مصمتة باتجاهين: 140
 *   بلاطة هوردي باتجاهين: 120
 */
export const TWO_WAY_EQUIVALENT = {
  betaContinuous: 0.76,
  betaFree: 1.00,
  solidDenominator: 140,
  ribbedDenominator: 120,
} as const;

// ===================================================================
// شروط البلاطة الهوردي — Ribbed Slab Geometric Constraints
// الكود العربي السوري 2024 (الطبعة السادسة)
// ===================================================================

export const RIBBED_SLAB_CONSTRAINTS = {
  /** سماكة البلاطة العلوية (الغطاء): hf >= 50 مم AND hf >= (المسافة الصافية بين الأضلاع / 10) */
  minToppingMm: 50,
  toppingSpacingCoeff: 10, // 1/10 (محدث من 1/12)

  /** عرض الضلع الخرساني: bw >= 100 مم AND bw >= (h / 3) */
  minRibWidthMm: 100,
  ribWidthThicknessCoeff: 3, // h/3
} as const;

// ===================================================================
// شروط البلاطة الفطرية — Flat Slab Constraints
// الكود العربي السوري 2024 (الطبعة السادسة)
// ===================================================================

export const FLAT_SLAB_CONSTRAINTS = {
  /** السماكة الدنيا المطلقة: h >= 150 مم = 15 سم */
  minThicknessMm: 150,
  minThicknessCm: 15,
} as const;

// ===================================================================
// أنواع الأساسات — Foundation Types
// ===================================================================
export const FOUNDATION_TYPES = [
  'منفردة',
  'مستمرة',
  'مشتركة',
  'حصيرة',
] as const;

// ===================================================================
// أنواع الأعمدة — Column Types
// ===================================================================
export const COLUMN_TYPES = {
  center: 'وسطي',
  edge: 'طرفي',
  corner: 'ركني',
} as const;

// ===================================================================
// أنواع البلاطات — Slab Types
// ===================================================================
export const SLAB_TYPES = {
  solidOneWay: 'بلاطة مصمتة باتجاه واحد',
  solidTwoWay: 'بلاطة مصمتة باتجاهين',
  ribbedOneWay: 'بلاطة هوردي باتجاه واحد',
  ribbedTwoWay: 'بلاطة هوردي باتجاهين',
  flatSlab: 'بلاطة فطرية',
} as const;

// ===================================================================
// أنواع الجوائز — Beam Types
// ===================================================================
export const BEAM_TYPES = {
  dropped: 'جائز ساقط',
  hidden: 'جائز مخفي',
} as const;

// ===================================================================
// طبيعة الاستناد — Support Conditions
// ===================================================================
export const SUPPORT_CONDITIONS = {
  simple: 'بسيط',
  oneEndContinuous: 'مستمر من طرف واحد',
  bothEndsContinuous: 'مستمر من طرفين',
  cantilever: 'كابولي حر',
} as const;

// ===================================================================
// أنواع أنظمة البناء — Structural Systems
// ===================================================================
export const STRUCTURAL_SYSTEMS = [
  'هيكلي',
  'اطاري',
  'جدران حاملة',
  'جدران قص',
  'مختلط',
  'أخرى',
] as const;

// ===================================================================
// حالات التقييم — Evaluation Ratings
// ===================================================================
export const CONDITION_RATINGS = {
  excellent: 'ممتازة',
  good: 'جيدة',
  fair: 'متوسطة',
  poor: 'سيئة',
  critical: 'حرجة',
  needsRepair: 'سيئة بحاجة اصلاح',
  needsReplace: 'سيئة بحاجة استبدال',
} as const;

// ===================================================================
// أنواع الأكساء — Cladding/Flooring Types
// ===================================================================
export const FLOORING_TYPES = [
  'بلاط موزاييك',
  'سيراميك أرضيات',
  'رخام',
  'غرانيت',
  'باركيه',
  'أخرى',
] as const;

export const WALL_CLADDING_TYPES = [
  'لا يوجد اكساء',
  'طينة بدون دهان',
  'طينة مع دهان عادي',
  'طينة مع دهان ومعجونة',
  'سيراميك جدران',
  'اكساء ألواح جيبسم بورد',
  'غرانيت',
  'بلاستيك',
  'خشب',
  'أخرى',
] as const;

export const WINDOW_DOOR_TYPES = [
  'حديد',
  'خشب',
  'المنيوم عادي',
  'المنيوم مقطع عريض',
  'المنيوم تيكنال',
  'PVC',
  'بلاستيك عادي',
  'أخرى',
] as const;

// ===================================================================
// خيارات التقييم العام — Overall Evaluation
// ===================================================================
export const EVALUATION_CATEGORIES = [
  'آمن',
  'يحتاج مراقبة',
  'يحتاج ترميم',
  'غير آمن',
  'خطر',
] as const;

// ===================================================================
// خيارات التغذية — Supply Types
// ===================================================================
export const ELECTRICAL_SUPPLY = [
  'شبكة عامة',
  'شبكة خاصة',
  'مولدة',
  'طاقة بديلة',
  'مختلط',
] as const;

export const PLUMBING_SUPPLY = [
  'شبكة عامة',
  'شبكة خاصة بئر',
  'خزانات',
  'مختلط',
] as const;

// ===================================================================
// نوع الترخيص — License Types
// ===================================================================
export const ENGINEERING_DISCIPLINES = [
  'إنشائي',
  'معماري',
  'كهربائي',
  'بيئة',
  'ميكانيك',
  'جيوتكنيك',
  'مدني',
] as const;

export const APPROVAL_TYPES = [
  'مدقق',
  'اعتماد',
  'تصديق',
] as const;
