/**
 * B.S Evaluation — Engineering Calculation Constants
 * Syrian Arab Building Code 2024 — Working Stress Design (WSD) Method
 * الطريقة الكلاسيكية (التشغيل) — الكود العربي السوري 2024
 */

export const APP_VERSION = '1.0.0';
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
// WORKING STRESS DESIGN (WSD) — الكود العربي السوري 2024
// الطريقة الكلاسيكية (التشغيل) — الوحدات: كغ/سم² , طن , سم
// ===================================================================

/**
 * إجهاد الضغط المسموح للخرسانة
 * Allowable compressive stress of concrete (WSD)
 */
export const WSD = {
  // إجهاد الضغط المسموح بسبب الانحناء (بلاطات وجوائز)
  fc_allowable_flexure: 0.40,  // 0.40 × f'c — الكود العربي السوري WSD

  // إجهاد الضغط المسموح بحالة الضغط المحوري (أعمدة)
  fc_allowable_axial: 0.30,    // 0.30 × f'c — للأعمدة

  // معامل المرونة النسبي n = Es/Ec
  // Es = 2,000,000 كغ/سم²
  // Ec = 15,000 × √f'c (كغ/سم²)
  getN: (fc: number) => Math.round(2000000 / (15000 * Math.sqrt(fc))),

  // إجهاد الخضوع المسموح للحديد
  // fs_allowable = 0.5 × fy — الكود العربي السوري WSD
  getFsAllowable: (fy: number) => 0.5 * fy,

  // مقاومة القص الخرسانية (كغ/سم²)
  vc: (fc: number) => 0.5 * Math.sqrt(fc), // 0.5√f'c

  // إجهاد القص الأقصى المسموح (كغ/سم²)
  vmax: (fc: number) => 2.5 * Math.sqrt(fc), // 2.5√f'c

  // مقاومة الثقب للبلاطات (كغ/سم²)
  vp: (fc: number) => 0.5 * Math.sqrt(fc), // 0.5√f'c — ثقب البلاطات

  // مقاومة الثقب للأساسات / الحصيرة (كغ/سم²)
  // الكود العربي السوري: 0.9√f'c بوحدة كغ/سم² (أو 0.3√f'c بوحدة N/mm²)
  vp_foundation: (fc: number) => 0.9 * Math.sqrt(fc),

  // معامل التخفيض حسب موقع العمود (عندما λ > 12)
  slenderness_reduction: {
    center: 0.8,  // وسطي
    edge: 0.7,    // طرفي
    corner: 0.6,  // ركني
  },

  // حد معامل النحافة — بعده يطبق معامل التخفيض
  slenderness_limit: 12,

  // نسبة التسليح الدنيا الافتراضية للأعمدة حسب الموقع
  min_steel_ratio_column: {
    center: 0.01,  // 1% وسطي
    edge: 0.01,    // 1% طرفي
    corner: 0.01,  // 1% ركني
  },

  // قيمة n الافتراضية (نسبة النمطية) — تُستخدم فقط عند عدم توفر f'c
  // وفق الكود العربي السوري: n = 2,000,000 / (15,000 × √f'c)
  // للخرسانة العادية f'c = 250 → n ≈ 8
  default_n: 15, // قيمة تقليدية احتياطية فقط

  // حد التسليح الزائد — محسوب ديناميكياً في checkFlexure
  // kb/d = n / (n + fs_allowable / fc_allowable)
  // لم يعد يُستخدم omega_max الثابت (كان مأخوذاً من USD)
  // يُترك للتوافق مع أي كود خارجي قد يحتاجه
  omega_max_deprecated: 0.6375,

  // أقصى مسافة بين الأساور (سم)
  smax_stirrup: 20, // min(d/2, 20)
} as const;

// ===================================================================
// شرط السماكة — Minimum Thickness Requirements
// الكود العربي السوري 2024 — التحكم بالانحراف
// ===================================================================

/**
 * معاملات السماكة الدنيا حسب طبيعة الاستناد
 * Minimum thickness coefficients by support condition
 * h = L / α
 */
export const SLAB_ALPHA = {
  // بلاطة مصمتة باتجاه واحد — One-way solid slab
  // الكود العربي السوري 2024: h = L/α, hMin = max(L/α, 8)
  oneWaySolid: {
    simple: 25,
    oneEndContinuous: 29,
    bothEndsContinuous: 33,
    cantilever: 10,
  },

  // بلاطة مصمتة باتجاهين — Two-way solid slab
  // الكود العربي السوري 2024: h = P_equiv/140, hMin = max(P_equiv/140, 8)
  // للمحيط المكافئ: P_equiv = Σ(β_i × L_i), β=0.8 مستمر, β=1.0 حر
  twoWaySolid: {
    simple: 25,         // α بسيط (يُستخدم كقيمة احتياطية)
    oneEndContinuous: 29,
    bothEndsContinuous: 33,
    continuous: 33,     // للتوافق مع الكود القديم
  },

  // بلاطة هوردي باتجاه واحد — One-way ribbed slab
  // الكود العربي السوري 2024: h = L/α
  oneWayRibbed: {
    simple: 16,
    oneEndContinuous: 18.5,
    bothEndsContinuous: 21,
    cantilever: 8,
  },

  // بلاطة هوردي باتجاهين — Two-way ribbed slab
  // الكود العربي السوري 2024: h = P_equiv/120, hfMin = max(5, lClear/12)
  twoWayRibbed: {
    simple: 16,         // α بسيط (يُستخدم كقيمة احتياطية)
    oneEndContinuous: 18.5,
    bothEndsContinuous: 21,
    continuous: 28,     // للتوافق مع الكود القديم
  },

  // بلاطة فطرية — Flat slab
  // الكود العربي السوري 2024: h = Lmax/α, hMin = max(Lmax/α, 15)
  flatSlab: {
    withDropPanels: 36,    // h = Lmax/36
    withoutDropPanels: 32, // h = Lmax/32
  },
} as const;

export const BEAM_ALPHA = {
  // جائز ساقط ومخفي — Dropped & Hidden beam
  // الكود العربي السوري 2024: h = L/α
  simple: 16,
  oneEndContinuous: 18.5,
  bothEndsContinuous: 21,
  cantilever: 8,
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
