/**
 * B.S Evaluation — Professional PDF Report Generator
 * @react-pdf/renderer — Syrian Arab Code 2024
 *
 * Uses Cairo Arabic font, A4 layout, repeating header/footer,
 * wrap={false} for No-Split elements, and fixed margins.
 *
 * Features:
 *  - Cover page with project info
 *  - Table of contents
 *  - Specialized section renderers for all report types
 *  - Safety check results with badges
 *  - Professional styling
 */

import React from 'react';
import {
  Document, Page, View, Text, StyleSheet, Font, pdf,
  Link,
} from '@react-pdf/renderer';
import {
  checkIsolatedFoundation, checkCombinedFoundation, checkMatFoundation, checkContinuousFoundation,
  checkColumnWallStress,
  checkSlabThickness, checkBeamThickness, checkFlexure, checkShear,
  calculateStirrups, compareReinforcement, checkPunchingShear, calculateSlabMomentShear,
} from './calculations';

// ===================================================================
// TYPES
// ===================================================================

export interface PDFSection {
  id: string;
  label: string;
  dataKey: string;
  number: number;
}

export interface PDFReportConfig {
  companyName: string;
  reportHeader: string;
  reportFooter: string;
  sections: PDFSection[];
  projectData: Record<string, unknown>;
}

// ===================================================================
// FONT REGISTRATION
// ===================================================================

let _fontLoaded = false;

export async function loadArabicFont(): Promise<boolean> {
  if (_fontLoaded) return true;
  try {
    const res = await fetch('/fonts/Cairo.ttf');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const fontSrc = `data:font/ttf;base64,${base64}`;
    Font.register({
      family: 'Cairo',
      fonts: [
        { src: fontSrc, fontWeight: 400, fontStyle: 'normal' },
        { src: fontSrc, fontWeight: 700, fontStyle: 'normal' },
      ],
    });
    _fontLoaded = true;
    return true;
  } catch (e) {
    console.error('[PDF] Failed to load Cairo font:', e);
    return false;
  }
}

export function isFontLoaded(): boolean {
  return _fontLoaded;
}

// ===================================================================
// LABEL MAPPERS
// ===================================================================

const BUILDING_LABELS: Record<string, string> = {
  ownerName: 'اسم مالك المنشأة',
  buildingUsage: 'استخدام المنشأة',
  buildingAge: 'عمر المنشأة (سنة)',
  numberOfFloors: 'عدد الطوابق',
  propertyNumber: 'رقم العقار',
  propertyArea: 'المنطقة العقارية',
  licenseNumber: 'رقم الترخيص',
  previousLicenseDate: 'تاريخ الترخيص السابق',
  existingComponents: 'مكونات المنشأة القائمة',
  evaluationDate: 'تاريخ التقييم',
  evaluationPurpose: 'غاية التقييم',
  siteDescription: 'وصف الموقع العام',
  generalNotes: 'ملاحظات عامة',
};

const ARCHITECTURAL_LABELS: Record<string, string> = {
  description: 'الوصف المعماري العام',
  generalNotes: 'ملاحظات معمارية عامة',
  floorNumber: 'رقم الطابق',
  floorUsage: 'استخدام الطابق',
  floorArea: 'المساحة (م²)',
  floorHeight: 'ارتفاع الطابق (م)',
  floorCondition: 'حالة الطابق',
  floorNotes: 'ملاحظات',
};

const STRUCTURAL_LABELS: Record<string, string> = {
  structuralDescription: 'وصف الجملة الإنشائية',
  structuralSystem: 'النظام الانشائي',
  generalNotes: 'ملاحظات إنشائية عامة',
};

const HAMMER_LABELS: Record<string, string> = {
  fc: "المقاومة الاسطوانية f'c (كغ/سم²)",
};

const SOIL_LABELS: Record<string, string> = {
  soilType: 'نوع التربة',
  foundationDepth: 'عمق التأسيس (م)',
  allowableBearing: 'تحمل التربة المسموح (كغ/سم²)',
  frictionAngle: 'زاوية احتكاك التربة (°)',
  waterTableLevel: 'منسوب المياه الجوفية (م)',
};

const FOUNDATION_ENTRY_LABELS: Record<string, string> = {
  name: 'اسم / رقم الأساس',
  type: 'نوع الأساس',
  foundationDepth: 'عمق التأسيس (م)',
  length: 'الطول (سم)',
  width: 'العرض (سم)',
  height: 'الارتفاع (سم)',
  totalLoad: 'الحمولة الاستثمارية الكلية (طن)',
  P1: 'حمل العمود الخارجي P1 (طن)',
  P2: 'حمل العمود الداخلي P2 (طن)',
  S: 'المسافة بين العمودين (سم)',
  L_out: 'بروز خارجي (سم)',
  fc: "المقاومة الاسطوانية f'c (كغ/سم²)",
  columnLoad: 'حمل العمود (طن)',
  columnWidth: 'عرض العمود (سم)',
  columnDepth: 'عمق العمود (سم)',
  columnType: 'موقع العمود',
  q: 'الحمولة الخطية (طن/م)',
  notes: 'ملاحظات',
};

const FOUNDATION_TYPE_LABELS: Record<string, string> = {
  'منفردة': 'أساس منفرد',
  'مشتركة': 'أساس مشترك',
  'حصيرة': 'حصيرة (raft)',
  'مستمرة': 'أساس مستمر',
};

const COLUMN_ENTRY_LABELS: Record<string, string> = {
  elementType: 'نوع العنصر',
  columnType: 'موقع العمود',
  floor: 'الطابق',
  name: 'اسم العنصر',
  sectionWidth: 'عرض المقطع (سم)',
  sectionDepth: 'طول المقطع (سم)',
  totalLoad: 'الحمولة الاستثمارية (طن)',
  n: 'نسبة النمطية',
  As: 'مساحة التسليح (سم²)',
  H_clear: 'الارتفاع الصافي (سم)',
  notes: 'ملاحظات',
};

const SLAB_ENTRY_LABELS: Record<string, string> = {
  slabSubType: 'نوع البلاطة',
  floor: 'الطابق',
  supportCondition: 'طبيعة الاستناد',
  span: 'المجاز (سم)',
  spanLong: 'المجاز الطويل (سم)',
  spanShort: 'المجاز القصير (سم)',
  hActual: 'السماكة المنفذة (سم)',
  coverThickness: 'سمك الغطاء (سم)',
  ribHeight: 'ارتفاع العصب (سم)',
  hasDropPanels: 'تيجان',
  load: 'الحمولة (طن/م²)',
  rebarCount: 'عدد التسليح',
  rebarDiameter: 'قطر التسليح (مم)',
  cover: 'الغطاء (سم)',
  punchingColumnWidth: 'عرض العمود (سم)',
  punchingColumnDepth: 'عمق العمود (سم)',
  punchingReaction: 'رد الفعل (طن)',
  punchingColumnType: 'موقع العمود',
  notes: 'ملاحظات',
};

const BEAM_ENTRY_LABELS: Record<string, string> = {
  beamSubType: 'نوع الجائز',
  name: 'اسم الجائز',
  floor: 'الطابق',
  supportCondition: 'طبيعة الاستناد',
  span: 'المجاز (سم)',
  width: 'العرض (سم)',
  depth: 'العمق (سم)',
  cover: 'الغطاء (سم)',
  rebarCount: 'عدد التسليح',
  rebarDiameter: 'قطر التسليح (مم)',
  moment: 'العزم (طن.سم)',
  shear: 'القص (طن)',
  stirrupDiameter: 'قطر الأطواق (مم)',
  stirrupLegs: 'عدد فروع الأطواق',
  Fs: 'إجهاد الحديد المسموح للأطواق (كغ/سم²)',
  notes: 'ملاحظات',
};

const SLAB_TYPE_LABELS: Record<string, string> = {
  oneWaySolid: 'بلاطة مصمتة باتجاه واحد',
  twoWaySolid: 'بلاطة مصمتة باتجاهين',
  oneWayRibbed: 'بلاطة هوردي باتجاه واحد',
  twoWayRibbed: 'بلاطة هوردي باتجاهين',
  flatSlab: 'بلاطة فطرية',
};

const BEAM_TYPE_LABELS: Record<string, string> = {
  dropped: 'جائز ساقط',
  hidden: 'جائز مخفي',
};

// Electrical Report Labels
const ELECTRICAL_LABELS: Record<string, string> = {
  mainSupply: 'نوع التغذية الرئيسية',
  mainPanelCondition: 'حالة اللوحة الرئيسية',
  lightingCondition: 'حالة الإنارة',
  hasLowCurrentSystem: 'يوجد منظومة تيار ضعيف',
  lowCurrentSystems: 'أنظمة التيار الضعيف',
  installationsDescription: 'وصف التمديدات الكهربائية',
  observations: 'الملاحظات والمشاهدات',
};

const LOW_CURRENT_LABELS: Record<string, string> = {
  'منظومة التحكم': 'منظومة التحكم',
  'منظومة إنذار الحريق': 'منظومة إنذار الحريق',
  'منظومة المراقبة والكاميرات': 'منظومة المراقبة والكاميرات',
  'شبكات البيانات والاتصالات': 'شبكات البيانات والاتصالات',
  'المراقبة الحرارية والذكية': 'المراقبة الحرارية والذكية',
  'أخرى': 'أخرى',
};

// Plumbing Report Labels
const PLUMBING_LABELS: Record<string, string> = {
  mainSupply: 'مصدر التغذية الرئيسي',
  saltWaterNetwork: 'شبكة المياه المالحة',
  freshWaterNetwork: 'شبكة المياه العذبة',
  hasLeakage: 'يوجد تسرب مياه',
  leakageDescription: 'وصف التسرب',
  notes: 'ملاحظات عامة',
};

// Technical Notes Labels
const TECH_ARCHITECTURAL_LABELS: Record<string, string> = {
  humidityMarks: 'علامات رطوبة',
  visibleWaterLeakage: 'تسرب مياه مرئي',
  poorVentilation: 'تهوية سيئة',
  insulationCondition: 'حالة العزل',
  exteriorCladding: 'الكساء الخارجي',
};

const TECH_STRUCTURAL_LABELS: Record<string, string> = {
  visibleRebarCorrosion: 'صدأ حديد مرئي',
  slabBeamSettlement: 'هوط في البلاطات/الجوائز',
  columnWallTilt: 'ميلان في الأعمدة/الجدران',
  concreteCoverSpalling: 'تشرخ غطاء خرساني',
};

const TECH_ELECTRICAL_LABELS: Record<string, string> = {
  electricalInstallations: 'حالة التمديدات الكهربائية',
  fireSuppression: 'منظومة إطفاء الحريق',
  surveillanceSystem: 'منظومة المراقبة',
};

const TECH_PLUMBING_LABELS: Record<string, string> = {
  plumbingInstallations: 'حالة التمديدات الصحية',
};

// Final Report Labels
const FINAL_REPORT_LABELS: Record<string, string> = {
  requirements: 'المتطلبات والاشتراطات',
  overallEvaluation: 'التقييم العام',
  reportPurpose: 'غاية التقرير',
  reportPurposeDescription: 'وصف غاية التقرير',
};

const ENGINEER_LABELS: Record<string, string> = {
  sequence: 'التسلسل',
  discipline: 'الاختصاص',
  name: 'اسم المهندس',
  licenseNumber: 'رقم الإجازة',
};

const APPROVAL_LABELS: Record<string, string> = {
  sequence: 'التسلسل',
  role: 'الدور',
  name: 'الاسم',
  discipline: 'الاختصاص',
  date: 'التاريخ',
};

const GENERIC_LABELS: Record<string, string> = {
  description: 'الوصف',
  notes: 'ملاحظات',
  generalNotes: 'ملاحظات عامة',
  report: 'التقرير',
  title: 'العنوان',
  summary: 'ملخص',
  conclusion: 'الخلاصة',
  recommendations: 'التوصيات',
  evaluation: 'التقييم',
  status: 'الحالة',
  date: 'التاريخ',
  type: 'النوع',
  location: 'الموقع',
  floors: 'الطوابق',
  supplyType: 'نوع التغذية',
  mainPanel: 'اللوحة الرئيسية',
  subPanels: 'اللوحات الفرعية',
  wiringType: 'نوع التمديدات',
  loadCalculation: 'حساب الأحمال',
  grounding: 'التأريض',
  lightningProtection: 'حماية من الصواعق',
  supplySource: 'مصدر التغذية',
  waterSupply: 'شبكة المياه',
  drainage: 'شبكة الصرف',
  pipes: 'أنابيب',
  fixtures: 'معدات',
  waterTank: 'خزان المياه',
  sewageSystem: 'نظام الصرف الصحي',
  notesAndObservations: 'ملاحظات ومشاهدات',
  overallEvaluation: 'التقييم العام',
  engineerName: 'اسم المهندس',
  engineerLicense: 'رقم إجازة المهندس',
  approvalType: 'نوع الموافقة',
  discipline: 'الاختصاص',
  dateOfIssue: 'تاريخ الإصدار',
  stampNumber: 'رقم الختم',
  location_description: 'وصف الموقع',
  recommendations_text: 'التوصيات',
};

function guessLabel(key: string): string {
  return GENERIC_LABELS[key] || ARCHITECTURAL_LABELS[key] || key;
}

// ===================================================================
// SKIP KEYS (photos, binary data, internal IDs)
// ===================================================================

const SKIP_KEYS = new Set([
  'sitePhotos', 'photos', 'image', 'base64', 'fileBase64',
  'hammerReportPhoto', 'soilReportFileBase64', 'soilReportFileName',
  'soilReportFileSize', 'additionalPhotos', 'structuralCrackPhotos',
  'crackPhotos', 'leakagePhotos', 'id',
]);

function shouldSkip(key: string): boolean {
  if (SKIP_KEYS.has(key)) return true;
  const lk = key.toLowerCase();
  return lk.includes('photo') || lk.includes('image');
}

// ===================================================================
// HELPERS
// ===================================================================

function rebarArea(count: number, diameterMm: number): number {
  return count * (Math.PI / 4) * Math.pow(diameterMm / 10, 2);
}

function getEffectiveH(slab: Record<string, unknown>): number {
  const subType = String(slab.slabSubType || '');
  if (subType === 'oneWayRibbed' || subType === 'twoWayRibbed') {
    return (parseFloat(String(slab.coverThickness || 0)) || 0) + (parseFloat(String(slab.ribHeight || 0)) || 0);
  }
  return parseFloat(String(slab.hActual || 0)) || 0;
}

function getSlabSupportCondition(slab: Record<string, unknown>): string {
  if (String(slab.slabSubType || '') === 'flatSlab') {
    return String(slab.hasDropPanels || 'بدون تيجان');
  }
  return String(slab.supportCondition || '');
}

const COLUMN_TYPE_MAP: Record<string, 'center' | 'edge' | 'corner'> = {
  'وسطي': 'center',
  'طرفي': 'edge',
  'ركني': 'corner',
};

// ===================================================================
// COLORS
// ===================================================================

const C = {
  primary: '#047857',
  primaryDark: '#065f46',
  primaryLight: '#d1fae5',
  primaryBg: '#ecfdf5',
  tableBorder: '#d1d5db',
  headerBg: '#065f46',
  white: '#ffffff',
  text: '#111827',
  textMuted: '#6b7280',
  textLight: '#9ca3af',
  safe: '#059669',
  safeBg: '#d1fae5',
  safeBorder: '#6ee7b7',
  unsafe: '#dc2626',
  unsafeBg: '#fee2e2',
  unsafeBorder: '#fca5a5',
  amber: '#b45309',
  amberBg: '#fef3c7',
  amberBorder: '#fcd34d',
  grayBg: '#f9fafb',
  grayBorder: '#e5e7eb',
  blue: '#1d4ed8',
  blueBg: '#dbeafe',
  blueBorder: '#93c5fd',
  purple: '#7c3aed',
  purpleBg: '#ede9fe',
  purpleBorder: '#c4b5fd',
};

// ===================================================================
// STYLES — A4 (595.28 x 841.89 pt)
// ===================================================================

const S = StyleSheet.create({
  page: { fontFamily: 'Cairo', fontSize: 9.5, color: C.text, size: 'A4' },
  coverPage: { fontFamily: 'Cairo', fontSize: 9.5, color: C.white, size: 'A4', backgroundColor: C.primaryDark },
  coverContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 60, paddingVertical: 80 },
  coverLogo: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.white, marginBottom: 30, justifyContent: 'center', alignItems: 'center' },
  coverLogoText: { fontSize: 28, fontWeight: 700, color: C.primaryDark, textAlign: 'center' },
  coverTitle: { fontSize: 22, fontWeight: 700, color: C.white, textAlign: 'center', marginBottom: 8 },
  coverSubtitle: { fontSize: 14, color: C.primaryLight, textAlign: 'center', marginBottom: 6 },
  coverCode: { fontSize: 11, color: '#a7f3d0', textAlign: 'center', marginBottom: 30 },
  coverDivider: { width: 120, height: 3, backgroundColor: C.safe, marginBottom: 30 },
  coverCompany: { fontSize: 16, fontWeight: 700, color: C.white, textAlign: 'center', marginBottom: 15 },
  coverDate: { fontSize: 11, color: '#a7f3d0', textAlign: 'center', marginTop: 30 },
  coverCopyright: { fontSize: 8, color: '#6ee7b7', textAlign: 'center', marginTop: 15 },
  tocPage: { fontFamily: 'Cairo', fontSize: 9.5, color: C.text, size: 'A4' },
  tocContent: { paddingTop: 100, paddingBottom: 65, paddingHorizontal: 50 },
  tocTitle: { fontSize: 16, fontWeight: 700, color: C.primary, textAlign: 'center', marginBottom: 25 },
  tocItem: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 10, borderBottomWidth: 0.5, borderBottomColor: C.grayBorder },
  tocItemAlt: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 10, borderBottomWidth: 0.5, borderBottomColor: C.grayBorder, backgroundColor: C.grayBg },
  tocNum: { width: 24, fontSize: 9, fontWeight: 700, color: C.primary, textAlign: 'center' },
  tocLabel: { flex: 1, fontSize: 10, color: C.text, textAlign: 'right', marginRight: 8 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 20, paddingBottom: 10, paddingHorizontal: 50, borderBottomWidth: 3, borderBottomColor: C.primaryDark, backgroundColor: C.white },
  headerCompany: { fontSize: 12, fontWeight: 700, color: C.primary, textAlign: 'center', marginBottom: 2 },
  headerTitle: { fontSize: 11, fontWeight: 700, color: C.text, textAlign: 'center', marginBottom: 1 },
  headerSubtitle: { fontSize: 7.5, color: C.textMuted, textAlign: 'center' },
  headerDate: { fontSize: 7, color: C.textLight, textAlign: 'center', marginTop: 2 },
  headerCustomText: { fontSize: 8, color: C.textMuted, textAlign: 'center', marginTop: 2 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 8, paddingBottom: 18, paddingHorizontal: 50, borderTopWidth: 2, borderTopColor: C.primary, backgroundColor: C.white },
  footerText: { fontSize: 7, color: C.textMuted, textAlign: 'center' },
  footerEndMark: { fontSize: 6.5, color: C.textLight, textAlign: 'center', marginTop: 3 },
  footerPage: { position: 'absolute', bottom: 18, left: 50, fontSize: 7.5, color: C.textLight },
  content: { paddingTop: 80, paddingBottom: 60, paddingHorizontal: 50 },
  section: { marginBottom: 18 },
  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 5, borderBottomWidth: 2, borderBottomColor: C.primary },
  sectionNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.primary, color: C.white, textAlign: 'center', fontSize: 9, fontWeight: 700, lineHeight: 22 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: '#1f2937' },
  subHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 6 },
  subNum: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.primaryLight, color: C.primary, textAlign: 'center', fontSize: 7.5, fontWeight: 700, lineHeight: 18 },
  subTitle: { fontSize: 9.5, fontWeight: 700, color: '#374151' },
  table: { borderWidth: 1, borderColor: C.tableBorder, borderRadius: 2, marginBottom: 8 },
  tableHead: { backgroundColor: C.headerBg, flexDirection: 'row-reverse' },
  th: { paddingVertical: 5, paddingHorizontal: 6, fontSize: 8.5, fontWeight: 700, color: C.white, borderLeftWidth: 1, borderLeftColor: C.primaryDark, textAlign: 'right' },
  tr: { flexDirection: 'row-reverse', borderBottomWidth: 0.5, borderBottomColor: C.grayBorder },
  trAlt: { flexDirection: 'row-reverse', borderBottomWidth: 0.5, borderBottomColor: C.grayBorder, backgroundColor: C.grayBg },
  td: { paddingVertical: 4, paddingHorizontal: 6, fontSize: 8.5, borderLeftWidth: 0.5, borderLeftColor: C.grayBorder, textAlign: 'right' },
  tdLabel: { flex: 4, color: '#374151', fontWeight: 500 },
  tdValue: { flex: 5, color: C.text },
  card: { borderWidth: 1, borderColor: C.grayBorder, borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
  cardHead: { backgroundColor: '#f3f4f6', paddingVertical: 5, paddingHorizontal: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: C.grayBorder },
  cardTitle: { fontSize: 8.5, fontWeight: 700, color: '#374151', textAlign: 'right' },
  safeBadge: { paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 2, backgroundColor: C.safeBg, borderWidth: 0.5, borderColor: C.safeBorder },
  safeBadgeText: { fontSize: 6.5, fontWeight: 700, color: C.safe },
  unsafeBadge: { paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 2, backgroundColor: C.unsafeBg, borderWidth: 0.5, borderColor: C.unsafeBorder },
  unsafeBadgeText: { fontSize: 6.5, fontWeight: 700, color: C.unsafe },
  infoBox: { padding: 8, borderRadius: 3, backgroundColor: C.primaryBg, borderWidth: 0.5, borderColor: '#a7f3d0', marginBottom: 10 },
  infoBoxLabel: { fontSize: 9, color: C.primary, fontWeight: 700, textAlign: 'right' },
  infoBoxValue: { fontSize: 9, color: C.primary, fontWeight: 700, textAlign: 'left' },
  resultsHead: { flexDirection: 'row-reverse', paddingVertical: 4, paddingHorizontal: 6, fontSize: 8.5, fontWeight: 700, textAlign: 'right' },
  resultsHeadSafe: { backgroundColor: C.safeBg, color: C.safe },
  resultsHeadUnsafe: { backgroundColor: C.unsafeBg, color: C.unsafe },
  sep: { borderBottomWidth: 0.5, borderBottomColor: '#d1d5db', borderStyle: 'dashed', marginVertical: 12 },
  noData: { fontSize: 9, color: C.textMuted, textAlign: 'center', paddingVertical: 15 },
  row: { flexDirection: 'row-reverse', alignItems: 'center' },
  rowCenter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  textBlock: { fontSize: 9, color: C.text, textAlign: 'right', lineHeight: 1.5, paddingVertical: 4, paddingHorizontal: 8, marginBottom: 6 },
  blueInfoBox: { padding: 8, borderRadius: 3, backgroundColor: C.blueBg, borderWidth: 0.5, borderColor: C.blueBorder, marginBottom: 8 },
  blueInfoLabel: { fontSize: 9, color: C.blue, fontWeight: 700, textAlign: 'right' },
  blueInfoValue: { fontSize: 9, color: C.blue, textAlign: 'right', marginTop: 2 },
  purpleInfoBox: { padding: 8, borderRadius: 3, backgroundColor: C.purpleBg, borderWidth: 0.5, borderColor: C.purpleBorder, marginBottom: 8 },
  purpleInfoLabel: { fontSize: 9, color: C.purple, fontWeight: 700, textAlign: 'right' },
  purpleInfoValue: { fontSize: 9, color: C.purple, textAlign: 'right', marginTop: 2 },
  evalBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3, marginBottom: 8 },
  evalBadgeText: { fontSize: 9, fontWeight: 700, textAlign: 'center' },
  sigRow: { flexDirection: 'row-reverse', borderBottomWidth: 0.5, borderBottomColor: C.grayBorder, paddingVertical: 4 },
  sigRowAlt: { flexDirection: 'row-reverse', borderBottomWidth: 0.5, borderBottomColor: C.grayBorder, paddingVertical: 4, backgroundColor: C.grayBg },
  sigCell: { flex: 1, fontSize: 8, paddingVertical: 3, paddingHorizontal: 4, textAlign: 'right', borderLeftWidth: 0.5, borderLeftColor: C.grayBorder },
  sigHeader: { flex: 1, fontSize: 8, fontWeight: 700, paddingVertical: 4, paddingHorizontal: 4, textAlign: 'center', color: C.white, borderLeftWidth: 0.5, borderLeftColor: C.primaryDark },
  sigTable: { borderWidth: 1, borderColor: C.tableBorder, borderRadius: 2, marginBottom: 8, overflow: 'hidden' },
  sigTableHead: { backgroundColor: C.headerBg, flexDirection: 'row-reverse' },
});

// ===================================================================
// PDF HELPER COMPONENTS
// ===================================================================

function SafeBadge({ safe }: { safe: boolean }) {
  return (
    <View style={safe ? S.safeBadge : S.unsafeBadge} wrap={false}>
      <Text style={safe ? S.safeBadgeText : S.unsafeBadgeText}>
        {safe ? 'آمن (محقق)' : 'غير آمن (غير محقق)'}
      </Text>
    </View>
  );
}

function ThRow() {
  return (
    <View style={S.tableHead}>
      <Text style={[S.th, { flex: 4 }]}>البند</Text>
      <Text style={[S.th, { flex: 5 }]}>البيان</Text>
    </View>
  );
}

function KVRow({ label, value, alt }: {
  label: string;
  value: string | number | boolean | null | undefined;
  alt?: boolean;
}) {
  if (value === null || value === undefined || value === '') return null;
  const display = typeof value === 'boolean' ? (value ? 'نعم' : 'لا') : String(value);
  return (
    <View style={alt ? S.trAlt : S.tr} wrap={false}>
      <Text style={[S.td, S.tdLabel]}>{label}</Text>
      <Text style={[S.td, S.tdValue]}>{display}</Text>
    </View>
  );
}

function KVTable({ data, labels, showHeader = true }: { data: Record<string, unknown>; labels?: Record<string, string>; showHeader?: boolean }) {
  const getLabel = (k: string) => labels?.[k] || guessLabel(k);
  const entries = Object.entries(data).filter(([k]) => !shouldSkip(k));
  if (entries.length === 0) return <Text style={S.noData}>لا توجد بيانات متاحة</Text>;
  return (
    <View style={S.table}>
      {showHeader && <ThRow />}
      {entries.map(([k, v], i) => (
        <KVRow key={k} label={getLabel(k)} value={v as string | number} alt={i % 2 === 1} />
      ))}
    </View>
  );
}

function SectionHeader({ number, title }: { number: number; title: string }) {
  return (
    <View style={S.sectionHeader} wrap={false}>
      <View style={S.sectionNum}><Text style={S.sectionNum}>{number}</Text></View>
      <Text style={S.sectionTitle}>{title}</Text>
    </View>
  );
}

function SubHeader({ number, title }: { number: string; title: string }) {
  return (
    <View style={S.subHeader} wrap={false}>
      <View style={S.subNum}><Text style={S.subNum}>{number}</Text></View>
      <Text style={S.subTitle}>{title}</Text>
    </View>
  );
}

function EntryCard({ title, safe, children }: { title: string; safe?: boolean; children: React.ReactNode }) {
  return (
    <View style={S.card} wrap={false}>
      <View style={S.cardHead}>
        <Text style={S.cardTitle}>{title}</Text>
        {safe !== undefined && <SafeBadge safe={safe} />}
      </View>
      <View style={S.table}>
        <ThRow />
        {children}
      </View>
    </View>
  );
}

function ResultsTable({ title, safe, rows }: { title: string; safe: boolean; rows: { label: string; value: string }[] }) {
  return (
    <View style={[S.table, { marginTop: 0 }]} wrap={false}>
      <View style={[S.resultsHead, safe ? S.resultsHeadSafe : S.resultsHeadUnsafe]}>
        <Text style={{ flex: 1 }}>{title}</Text>
      </View>
      {rows.map((r, i) => (
        <View style={i % 2 === 1 ? S.trAlt : S.tr} key={i}>
          <Text style={[S.td, S.tdLabel]}>{r.label}</Text>
          <Text style={[S.td, S.tdValue]}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

function Sep() { return <View style={S.sep} />; }

function TextBlock({ children }: { children: string }) {
  if (!children) return null;
  return <Text style={S.textBlock}>{children}</Text>;
}

// ===================================================================
// SECTION RENDERERS
// ===================================================================

/** 1. Building Data */
function RenderBuildingData({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([k]) => !shouldSkip(k) && BUILDING_LABELS[k]);
  if (entries.length === 0) return <Text style={S.noData}>لا توجد بيانات متاحة</Text>;
  return (
    <View style={S.table}>
      <ThRow />
      {entries.map(([k, v], i) => (
        <KVRow key={k} label={BUILDING_LABELS[k] || guessLabel(k)} value={v as string | number} alt={i % 2 === 1} />
      ))}
    </View>
  );
}

/** 2. Architectural Report */
function RenderArchitecturalReport({ data }: { data: Record<string, unknown> }) {
  const topEntries = Object.entries(data).filter(([k]) => !shouldSkip(k) && k !== 'floors');
  const floors = Array.isArray(data.floors) ? data.floors as Record<string, unknown>[] : [];
  return (
    <View>
      {topEntries.length > 0 && (
        <View style={S.table}>
          <ThRow />
          {topEntries.map(([k, v], i) => (
            <KVRow key={k} label={guessLabel(k)} value={v as string | number} alt={i % 2 === 1} />
          ))}
        </View>
      )}
      {floors.length > 0 && (
        <View>
          <SubHeader number="2.1" title={`تفاصيل الطوابق (${floors.length} طابق)`} />
          {floors.map((floor, idx) => (
            <EntryCard key={idx} title={`الطابق ${String(floor.floorNumber || idx + 1)}`}>
              {Object.entries(floor).filter(([k]) => !shouldSkip(k)).map(([k, v], i) => (
                <KVRow key={k} label={ARCHITECTURAL_LABELS[k] || guessLabel(k)} value={v as string | number} alt={i % 2 === 1} />
              ))}
            </EntryCard>
          ))}
        </View>
      )}
    </View>
  );
}

/** 3. Structural Report */
function RenderStructuralReport({ data, projectData }: { data: Record<string, unknown>; projectData: Record<string, unknown> }) {
  const mainEntries = Object.entries(data).filter(([k]) => STRUCTURAL_LABELS[k] && !shouldSkip(k));
  const hammer = data.hammerTest as Record<string, unknown> | undefined;
  const soil = data.soilReport as Record<string, unknown> | undefined;
  const cracks = Array.isArray(data.crackJustifications) ? data.crackJustifications as Record<string, unknown>[] : [];
  return (
    <View>
      {mainEntries.length > 0 && (
        <View style={S.table}>
          <ThRow />
          {mainEntries.map(([k, v], i) => (
            <KVRow key={k} label={STRUCTURAL_LABELS[k] || guessLabel(k)} value={v as string | number} alt={i % 2 === 1} />
          ))}
        </View>
      )}
      {hammer && typeof hammer === 'object' && Object.keys(hammer).length > 0 && (
        <View>
          <SubHeader number="3.1" title="نتائج تجربة المطرقة" />
          <View style={[S.table, { borderWidth: 1, borderColor: C.amberBorder }]}>
            <View style={[S.tableHead, { backgroundColor: C.amber }]}>
              <Text style={[S.th, { flex: 4 }]}>البند</Text>
              <Text style={[S.th, { flex: 5 }]}>البيان</Text>
            </View>
            {Object.entries(hammer).filter(([k]) => !shouldSkip(k)).map(([k, v], i) => (
              <KVRow key={k} label={HAMMER_LABELS[k] || guessLabel(k)} value={v as string | number} alt={i % 2 === 1} />
            ))}
          </View>
        </View>
      )}
      {soil && typeof soil === 'object' && Object.keys(soil).length > 0 && (
        <View>
          <SubHeader number="3.2" title="تقرير ميكانيك التربة" />
          <View style={[S.table, { borderWidth: 1, borderColor: C.amberBorder }]}>
            <View style={[S.tableHead, { backgroundColor: C.amber }]}>
              <Text style={[S.th, { flex: 4 }]}>البند</Text>
              <Text style={[S.th, { flex: 5 }]}>البيان</Text>
            </View>
            {Object.entries(soil).filter(([k]) => !shouldSkip(k) && SOIL_LABELS[k]).map(([k, v], i) => (
              <KVRow key={k} label={SOIL_LABELS[k] || guessLabel(k)} value={v as string | number} alt={i % 2 === 1} />
            ))}
          </View>
        </View>
      )}
      {cracks.length > 0 && (
        <View>
          <SubHeader number="3.3" title={`تشرخات إنشائية (${cracks.length} شق)`} />
          {cracks.map((crack, idx) => {
            const crackType = String(crack.type || crack.crackType || '');
            const crackDesc = String(crack.description || crack.crackDescription || '');
            const crackWidth = crack.width ? String(crack.width) : '';
            const crackLocation = String(crack.location || '');
            return (
              <EntryCard key={idx} title={`شق #${idx + 1} ${crackType ? '— ' + crackType : ''}`}>
                {crackType && <KVRow label="نوع التشرخ" value={crackType} />}
                {crackLocation && <KVRow label="الموقع" value={crackLocation} alt />}
                {crackWidth && <KVRow label="العرض (مم)" value={crackWidth} />}
                {crackDesc && <KVRow label="الوصف" value={crackDesc} alt={!!crackWidth} />}
              </EntryCard>
            );
          })}
        </View>
      )}
    </View>
  );
}

/** 4. Foundations — supports all 4 types */
function RenderFoundations({ data }: { data: Record<string, unknown> }) {
  const foundations = Array.isArray(data.foundations) ? data.foundations as Record<string, unknown>[] : [];
  const allowable = parseFloat(String(data.allowableSoilStress || 0)) || 0;
  const hasBasement = data.hasBasement !== undefined;
  const basementDesc = typeof data.basementDescription === 'string' && data.basementDescription.length > 0;
  const infoRows: { label: string; value: string | number | boolean }[] = [];
  if (hasBasement) infoRows.push({ label: 'يوجد قبو / ملجأ', value: data.hasBasement as boolean });
  if (basementDesc) infoRows.push({ label: 'وصف القبو / الملجأ', value: data.basementDescription as string });
  if (allowable > 0) infoRows.push({ label: 'إجهاد التربة المسموح (كغ/سم²)', value: allowable });

  return (
    <View>
      {infoRows.length > 0 && (
        <View style={S.table}>
          <ThRow />
          {infoRows.map((r, i) => <KVRow key={r.label} label={r.label} value={r.value} alt={i % 2 === 1} />)}
        </View>
      )}
      {foundations.length > 0 && (
        <View>
          <SubHeader number="4.1" title={`تفاصيل الأساسات (${foundations.length} أساس)`} />
          {foundations.map((entry, idx) => {
            const entryName = String(entry.name || `أساس #${idx + 1}`);
            const entryType = String(entry.type || '');
            const typeLabel = FOUNDATION_TYPE_LABELS[entryType] || entryType;
            const len = parseFloat(String(entry.length || 0)) || 0;
            const wid = parseFloat(String(entry.width || 0)) || 0;
            const load = parseFloat(String(entry.totalLoad || 0)) || 0;
            const height = parseFloat(String(entry.height || 0)) || 0;

            // Compute results per type
            let resultRows: { label: string; value: string }[] = [];
            let isSafe = true;

            if (entryType === 'منفردة' && len > 0 && wid > 0 && load > 0 && allowable > 0) {
              const r = checkIsolatedFoundation({ load, length: len, width: wid, allowableStress: allowable });
              isSafe = r.safe;
              resultRows = [
                { label: 'الإجهاد الفعلي (كغ/سم²)', value: r.actualStress.toFixed(2) },
                { label: 'الإجهاد المسموح (كغ/سم²)', value: r.allowableStress.toFixed(2) },
                { label: 'نسبة الإجهاد المستخدم', value: `${((r.actualStress / r.allowableStress) * 100).toFixed(1)}%` },
              ];
            } else if (entryType === 'مشتركة') {
              const P1 = parseFloat(String(entry.P1 || 0)) || 0;
              const P2 = parseFloat(String(entry.P2 || 0)) || 0;
              const S = parseFloat(String(entry.S || 0)) || 0;
              const L_out = parseFloat(String(entry.L_out || 0)) || 0;
              if (len > 0 && wid > 0 && P1 > 0 && P2 > 0 && S > 0 && allowable > 0) {
                const r = checkCombinedFoundation({ P1, P2, S, L: len, B: wid, L_out, allowableStress: allowable });
                isSafe = r.safe;
                const caseLabel = r.eccentricityCase === 'ideal' ? 'حالة مثالية (توزيع منتظم)' : r.eccentricityCase === 'acceptable' ? 'حالة مقبولة (شبه منحرف)' : 'خطر دوران';
                resultRows = [
                  { label: 'اللامركزية e (سم)', value: r.eccentricity.toFixed(2) },
                  { label: 'حالة التوزيع', value: caseLabel },
                  { label: 'σ Max (كغ/سم²)', value: r.sigmaMax.toFixed(2) },
                  { label: 'σ Min (كغ/سم²)', value: r.sigmaMin.toFixed(2) },
                  { label: 'الإجهاد المسموح (كغ/سم²)', value: r.allowableStress.toFixed(2) },
                ];
                if (r.suggestion) resultRows.push({ label: 'اقتراح', value: r.suggestion });
              }
            } else if (entryType === 'حصيرة') {
              const fc = parseFloat(String(entry.fc || 0)) || 0;
              const columnLoad = parseFloat(String(entry.columnLoad || 0)) || 0;
              const colW = parseFloat(String(entry.columnWidth || 40)) || 40;
              const colD = parseFloat(String(entry.columnDepth || 40)) || 40;
              const colTypeKey = COLUMN_TYPE_MAP[String(entry.columnType || '')] || 'center';
              if (height > 0 && fc > 0 && columnLoad > 0) {
                const r = checkMatFoundation({ columnLoad, matThickness: height, fc, columnWidth: colW, columnDepth: colD, columnType: colTypeKey });
                isSafe = r.safe;
                resultRows = [
                  { label: 'إجهاد الثقب الفعلي vp (كغ/سم²)', value: r.vp.toFixed(2) },
                  { label: 'مقاومة الثقب vcp = 0.9√f\'c (كغ/سم²)', value: r.vcp.toFixed(2) },
                  { label: 'المحيط الحرج b0 (سم)', value: r.bo.toFixed(2) },
                  { label: 'العمق الفعال d (سم)', value: r.d.toFixed(2) },
                ];
                if (r.suggestion) resultRows.push({ label: 'اقتراح', value: r.suggestion });
              }
            } else if (entryType === 'مستمرة') {
              const q = parseFloat(String(entry.q || 0)) || 0;
              if (wid > 0 && q > 0 && allowable > 0) {
                const r = checkContinuousFoundation({ q, B: wid, allowableStress: allowable });
                isSafe = r.safe;
                resultRows = [
                  { label: 'الإجهاد الفعلي (كغ/سم²)', value: r.actualStress.toFixed(2) },
                  { label: 'الإجهاد المسموح (كغ/سم²)', value: r.allowableStress.toFixed(2) },
                ];
                if (r.Bmin) resultRows.push({ label: 'العرض الأدنى المقترح Bmin (سم)', value: String(r.Bmin) });
              }
            }

            // Filter entry display fields — skip fields only used for calculations
            const skipEntryKeys = new Set(['id', 'P1', 'P2', 'S', 'L_out', 'fc', 'columnLoad', 'columnWidth', 'columnDepth', 'columnType', 'q', 'fcSource', 'fcManual']);

            return (
              <View key={String(entry.id || idx)} wrap={false}>
                <EntryCard title={`${entryName} — ${typeLabel}`} safe={resultRows.length > 0 ? isSafe : undefined}>
                  {Object.entries(entry)
                    .filter(([k]) => !shouldSkip(k) && !skipEntryKeys.has(k))
                    .map(([k, v], i) => (
                      <KVRow key={k} label={FOUNDATION_ENTRY_LABELS[k] || guessLabel(k)} value={v as string | number} alt={i % 2 === 1} />
                    ))}
                </EntryCard>
                {resultRows.length > 0 && (
                  <ResultsTable title={`نتائج فحص ${typeLabel}`} safe={isSafe} rows={resultRows} />
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/** 5. Columns & Walls — uses checkColumnWallStress */
function RenderColumnsWalls({ data, projectData }: { data: Record<string, unknown>; projectData: Record<string, unknown> }) {
  const entries = Array.isArray(data.entries)
    ? data.entries as Record<string, unknown>[]
    : Array.isArray(data.columns) ? data.columns as Record<string, unknown>[] : [];
  const sr = projectData.structural_report as Record<string, unknown> | undefined;
  const hammer = sr?.hammerTest as Record<string, unknown> | undefined;
  const fc = Number(hammer?.fc) || 0;

  return (
    <View>
      {fc > 0 && (
        <View style={S.infoBox} wrap={false}>
          <View style={S.row}>
            <Text style={S.infoBoxLabel}>المقاومة الاسطوانية: </Text>
            <Text style={S.infoBoxValue}>{fc} كغ/سم²</Text>
            <Text style={[S.infoBoxLabel, { flex: 1, textAlign: 'right' }]}> (من تقرير تجربة المطرقة)</Text>
          </View>
        </View>
      )}
      {entries.length > 0 && (
        <View>
          <SubHeader number="5.1" title={`تفاصيل الأعمدة والجدران (${entries.length} عنصر)`} />
          {entries.map((entry, idx) => {
            const w = parseFloat(String(entry.sectionWidth || 0)) || 0;
            const d = parseFloat(String(entry.sectionDepth || 0)) || 0;
            const load = parseFloat(String(entry.totalLoad || 0)) || 0;
            const H_clear = parseFloat(String(entry.H_clear || 0)) || 0;
            const nVal = parseFloat(String(entry.n || 0)) || 0;
            const AsVal = parseFloat(String(entry.As || 0)) || 0;
            const columnLocation = (String(entry.elementType || '') === 'جدار' ? 'وسطي' : String(entry.columnType || '')) as '' | 'وسطي' | 'طرفي' | 'ركني';
            const entryName = String(entry.name || `${entry.elementType || 'عمود'} #${idx + 1}`);
            const elemType = String(entry.elementType || 'عمود');

            let resultRows: { label: string; value: string }[] = [];
            let isSafe = true;
            if (w > 0 && d > 0 && load > 0 && fc > 0 && H_clear > 0) {
              const ch = checkColumnWallStress({ load, width: w, depth: d, fc, n: nVal || undefined, As: AsVal || undefined, H_clear, columnLocation });
              isSafe = ch.safe;
              resultRows = [
                { label: 'المساحة المكافئة Aeq (سم²)', value: ch.Aeq.toFixed(2) },
                { label: 'الإجهاد الفعلي (كغ/سم²)', value: ch.actualStress.toFixed(2) },
                { label: "الإجهاد المسموح 0.3×f'c (كغ/سم²)", value: ch.allowableStress.toFixed(2) },
                { label: 'نسبة النحافة λ', value: ch.slendernessRatio.toFixed(2) },
              ];
              if (ch.reductionFactor < 1) {
                resultRows.push(
                  { label: 'معامل التخفيض φ', value: ch.reductionFactor.toFixed(3) },
                  { label: 'الإجهاد المسموح الفعّال (كغ/سم²)', value: ch.effectiveAllowable.toFixed(2) },
                );
              }
              resultRows.push({ label: 'مساحة التسليح As (سم²)', value: ch.AsProvided.toFixed(2) });
            }

            // Skip calc-only fields from entry card
            const skipColKeys = new Set(['id', 'n', 'As', 'H_clear', 'fcSource', 'fcManual']);

            return (
              <View key={String(entry.id || idx)} wrap={false}>
                <EntryCard title={`${elemType === 'جدار' ? 'جدار' : 'عمود'} #${idx + 1} — ${entryName}`} safe={resultRows.length > 0 ? isSafe : undefined}>
                  {Object.entries(entry)
                    .filter(([k]) => !shouldSkip(k) && !skipColKeys.has(k))
                    .map(([k, v], i) => (
                      <KVRow key={k} label={COLUMN_ENTRY_LABELS[k] || guessLabel(k)} value={v as string | number} alt={i % 2 === 1} />
                    ))}
                </EntryCard>
                {resultRows.length > 0 && (
                  <ResultsTable title="نتائج فحص إجهاد الضغط" safe={isSafe} rows={resultRows} />
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/** 6. Beams & Slabs — comprehensive checks */
function RenderBeamSlab({ data }: { data: Record<string, unknown> }) {
  const fcVal = parseFloat(String(data.fc || 0)) || 0;
  const fyVal = parseFloat(String(data.fy || 0)) || 0;
  const slabs = Array.isArray(data.slabs) ? data.slabs as Record<string, unknown>[] : [];
  const beams = Array.isArray(data.beams) ? data.beams as Record<string, unknown>[] : [];

  return (
    <View>
      {(fcVal > 0 || fyVal > 0) && (
        <View style={S.table}>
          <ThRow />
          {fcVal > 0 && <KVRow label="المقاومة الاسطوانية f'c (كغ/سم²)" value={fcVal} />}
          {fyVal > 0 && <KVRow label="إجهاد خضوع الحديد fy (كغ/سم²)" value={fyVal} alt />}
        </View>
      )}

      {/* Slabs */}
      {slabs.length > 0 && (
        <View>
          <SubHeader number="6.1" title={`تفاصيل البلاطات (${slabs.length} بلاطة)`} />
          {slabs.map((slab, idx) => {
            const h = getEffectiveH(slab);
            const subType = String(slab.slabSubType || 'oneWaySolid');
            const supportCond = getSlabSupportCondition(slab);
            const span = parseFloat(String(slab.span || 0)) || 0;
            const spanLong = parseFloat(String(slab.spanLong || 0)) || 0;
            const spanShort = parseFloat(String(slab.spanShort || 0)) || 0;
            let spanVal: number;
            if (subType === 'twoWaySolid' || subType === 'twoWayRibbed') {
              spanVal = spanLong || spanShort || span;
            } else {
              spanVal = span;
            }

            const label = SLAB_TYPE_LABELS[subType] || subType;
            const load = parseFloat(String(slab.load || 0)) || 0;
            const slabCover = parseFloat(String(slab.cover || 2.5)) || 2.5;
            const nRebar = parseFloat(String(slab.rebarCount || 0)) || 0;
            const dRebar = parseFloat(String(slab.rebarDiameter || 0)) || 0;
            const d = h > slabCover ? h - slabCover : 0;
            const As = nRebar > 0 && dRebar > 0 ? rebarArea(nRebar, dRebar) : 0;

            // Thickness check
            let thickRes: { safe: boolean; hMin: number } | null = null;
            if (h > 0 && spanVal > 0) {
              const ch = checkSlabThickness({
                slabType: subType as 'oneWaySolid' | 'twoWaySolid' | 'oneWayRibbed' | 'twoWayRibbed' | 'flatSlab',
                supportCondition: supportCond,
                span: spanVal,
                hActual: h,
                spanLong: spanLong || undefined,
                spanShort: spanShort || undefined,
              });
              thickRes = { safe: ch.safe, hMin: ch.hMin };
            }

            // Punching shear for flat slabs
            let punchRows: { label: string; value: string }[] = [];
            let punchSafe = true;
            if (subType === 'flatSlab' && h > 0 && fcVal > 0) {
              const colW = parseFloat(String(slab.punchingColumnWidth || 0)) || 0;
              const colD = parseFloat(String(slab.punchingColumnDepth || 0)) || 0;
              const reaction = parseFloat(String(slab.punchingReaction || 0)) || 0;
              const pColType = (String(slab.punchingColumnType || '') || 'center') as 'center' | 'edge' | 'corner';
              if (colW > 0 && colD > 0 && reaction > 0) {
                const pc = checkPunchingShear({ columnWidth: colW, columnDepth: colD, slabThickness: h, reaction, fc: fcVal, columnType: pColType });
                punchSafe = pc.safe;
                punchRows = [
                  { label: 'إجهاد الثقب الفعلي (كغ/سم²)', value: pc.actualStress.toFixed(2) },
                  { label: 'مقاومة الثقب vp = 0.5√f\'c (كغ/سم²)', value: pc.vp.toFixed(2) },
                  { label: 'المحيط الحرج b0 (سم)', value: pc.bo.toFixed(2) },
                ];
              }
            }

            // Moment & shear from load
            let momentShearRows: { label: string; value: string }[] = [];
            let flexRows: { label: string; value: string }[] = [];
            let shearRows: { label: string; value: string }[] = [];
            let rebarRows: { label: string; value: string }[] = [];
            let flexSafe = true;
            let shearSafe = true;
            let rebarSafe = true;
            let sectionSafe = true;

            if (load > 0 && d > 0 && supportCond && fyVal > 0 && spanVal > 0) {
              const shortSpan = (subType === 'twoWaySolid' || subType === 'twoWayRibbed') ? (spanShort || spanVal) : spanVal;
              const ms = calculateSlabMomentShear({ load, span: shortSpan, supportCondition: supportCond, slabType: subType as 'oneWaySolid' | 'twoWaySolid' | 'oneWayRibbed' | 'twoWayRibbed' | 'flatSlab', spanLong: spanLong || undefined, spanShort: spanShort || undefined });
              momentShearRows = [
                { label: 'العزم الموجب (طن.سم/م)', value: ms.Mpositive.toFixed(2) },
                { label: 'العزم السالب (طن.سم/م)', value: ms.Mnegative.toFixed(2) },
                { label: 'العزم الحاكم (طن.سم/م)', value: ms.Mgovernor.toFixed(2) },
                { label: 'القص V (طن/م)', value: ms.V.toFixed(3) },
              ];

              // Flexure check
              if (As > 0 && ms.Mgovernor > 0 && fcVal > 0) {
                const fl = checkFlexure({ moment: ms.Mgovernor, width: 100, effectiveDepth: d, As, fc: fcVal, fy: fyVal, isSlab: true });
                flexSafe = !fl.overReinforced && fl.safe;
                flexRows = [
                  { label: 'إجهاد الخرسانة الفعلي fc (كغ/سم²)', value: fl.fc.toFixed(2) },
                  { label: "إجهاد الخرسانة المسموح 0.4f'c (كغ/سم²)", value: fl.fcAllowable.toFixed(2) },
                  { label: 'إجهاد الحديد الفعلي fs (كغ/سم²)', value: fl.fs.toFixed(2) },
                  { label: 'إجهاد الحديد المسموح 0.5fy (كغ/سم²)', value: fl.fsAllowable.toFixed(2) },
                ];
                if (fl.overReinforced) flexRows.push({ label: 'ملاحظة', value: 'مقطع مُصلح — تسليح زائد' });
              }

              // Shear check
              if (ms.V > 0 && d > 0 && fcVal > 0) {
                const sc = checkShear({ shear: ms.V, width: 100, effectiveDepth: d, fc: fcVal });
                shearSafe = !sc.stirrupsNeeded;
                sectionSafe = sc.safe;
                shearRows = [
                  { label: 'إجهاد القص الفعلي v (كغ/سم²)', value: sc.v.toFixed(2) },
                  { label: 'مقاومة الخرسانة للقص vc (كغ/سم²)', value: sc.vc.toFixed(2) },
                  { label: 'الإجهاد الأقصى vmax (كغ/سم²)', value: sc.vmax.toFixed(2) },
                  { label: 'هل تحتاج أطواق؟', value: sc.stirrupsNeeded ? 'نعم' : 'لا' },
                ];
              }

              // Rebar comparison
              if (As > 0 && d > 0 && fcVal > 0) {
                const rc = compareReinforcement({ AsProvided: As, fc: fcVal, fy: fyVal, element: 'slab', width: 100, effectiveDepth: d });
                rebarSafe = rc.safe;
                rebarRows = [
                  { label: 'As الدنيا (سم²/م)', value: rc.AsMin.toFixed(2) },
                  { label: 'As المقدمة (سم²/م)', value: rc.AsProvided.toFixed(2) },
                  { label: 'النسبة As/As_min', value: rc.ratio.toFixed(2) },
                ];
              }
            }

            const allSafe = (thickRes ? thickRes.safe : true) && punchSafe && flexSafe && sectionSafe && rebarSafe;

            // Skip calc-only fields from entry card
            const skipSlabKeys = new Set(['id', 'punchingColumnWidth', 'punchingColumnDepth', 'punchingReaction', 'punchingColumnType', 'hasDropPanels', 'rebarCount', 'rebarDiameter', 'cover']);

            return (
              <View key={String(slab.id || idx)} wrap={false}>
                <EntryCard title={`بلاطة #${idx + 1} — ${label}`} safe={allSafe}>
                  {Object.entries(slab)
                    .filter(([k]) => !shouldSkip(k) && !skipSlabKeys.has(k))
                    .map(([k, v], i) => (
                      <KVRow
                        key={k}
                        label={SLAB_ENTRY_LABELS[k] || guessLabel(k)}
                        value={k === 'slabSubType' ? SLAB_TYPE_LABELS[String(v)] || String(v) : (v as string | number)}
                        alt={i % 2 === 1}
                      />
                    ))}
                </EntryCard>
                {thickRes && (
                  <ResultsTable title="نتائج فحص شرط السماكة" safe={thickRes.safe}
                    rows={[
                      { label: 'السماكة المنفذة (سم)', value: String(h) },
                      { label: 'السماكة الدنيا المطلوبة (سم)', value: thickRes.hMin.toFixed(1) },
                    ]}
                  />
                )}
                {punchRows.length > 0 && (
                  <ResultsTable title="نتائج فحص الثقب" safe={punchSafe} rows={punchRows} />
                )}
                {momentShearRows.length > 0 && (
                  <ResultsTable title="حساب العزم والقص" safe={true} rows={momentShearRows} />
                )}
                {flexRows.length > 0 && (
                  <ResultsTable title="نتائج فحص الانعطاف" safe={flexSafe} rows={flexRows} />
                )}
                {shearRows.length > 0 && (
                  <ResultsTable title="نتائج فحص القص" safe={sectionSafe} rows={shearRows} />
                )}
                {rebarRows.length > 0 && (
                  <ResultsTable title="مقارنة التسليح مع الدنيا" safe={rebarSafe} rows={rebarRows} />
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Beams */}
      {beams.length > 0 && (
        <View>
          <SubHeader number="6.2" title={`تفاصيل الجوائز (${beams.length} جائز)`} />
          {beams.map((beam, idx) => {
            const span = parseFloat(String(beam.span || 0)) || 0;
            const b = parseFloat(String(beam.width || 0)) || 0;
            const h = parseFloat(String(beam.depth || 0)) || 0;
            const cover = parseFloat(String(beam.cover || 4)) || 4;
            const M = parseFloat(String(beam.moment || 0)) || 0;
            const V = parseFloat(String(beam.shear || 0)) || 0;
            const nRebar = parseFloat(String(beam.rebarCount || 0)) || 0;
            const dRebar = parseFloat(String(beam.rebarDiameter || 0)) || 0;
            const dStirrup = parseFloat(String(beam.stirrupDiameter || 0)) || 0;
            const nLegs = parseFloat(String(beam.stirrupLegs || 0)) || 0;
            const beamName = String(beam.name || `جائز #${idx + 1}`);
            const beamLabel = BEAM_TYPE_LABELS[String(beam.beamSubType)] || String(beam.beamSubType);
            const d = h > cover ? h - cover : 0;
            const As = nRebar > 0 && dRebar > 0 ? rebarArea(nRebar, dRebar) : 0;

            // Thickness check
            let thickRes: { safe: boolean; hMin: number } | null = null;
            if (h > 0 && span > 0 && beam.supportCondition) {
              const tc = checkBeamThickness({ beamType: (String(beam.beamSubType) === 'hidden' ? 'hidden' : 'dropped'), supportCondition: String(beam.supportCondition), span, hActual: h });
              thickRes = { safe: tc.safe, hMin: tc.hMin };
            }

            // Flexure check
            let flexRes: { safe: boolean; fc: number; fs: number; fcAllow: number; fsAllow: number; overReinforced: boolean } | null = null;
            if (M > 0 && b > 0 && d > 0 && As > 0 && fcVal > 0 && fyVal > 0) {
              const fl = checkFlexure({ moment: M, width: b, effectiveDepth: d, As, fc: fcVal, fy: fyVal });
              flexRes = { safe: !fl.overReinforced && fl.safe, fc: fl.fc, fs: fl.fs, fcAllow: fl.fcAllowable, fsAllow: fl.fsAllowable, overReinforced: fl.overReinforced };
            }

            // Shear check
            let shearRes: { safe: boolean; v: number; vc: number; vmax: number; needsStirrups: boolean } | null = null;
            if (V > 0 && b > 0 && d > 0 && fcVal > 0) {
              const sc = checkShear({ shear: V, width: b, effectiveDepth: d, fc: fcVal });
              shearRes = { safe: sc.safe, v: sc.v, vc: sc.vc, vmax: sc.vmax, needsStirrups: sc.stirrupsNeeded };
            }

            // Rebar comparison
            let rebarRows: { label: string; value: string }[] = [];
            let rebarSafe = true;
            if (As > 0 && b > 0 && d > 0 && fcVal > 0 && fyVal > 0) {
              const rc = compareReinforcement({ AsProvided: As, fc: fcVal, fy: fyVal, element: 'beam', width: b, effectiveDepth: d });
              rebarSafe = rc.safe;
              rebarRows = [
                { label: 'As الدنيا (سم²)', value: rc.AsMin.toFixed(2) },
                { label: 'As المقدمة (سم²)', value: rc.AsProvided.toFixed(2) },
              ];
            }

            // Stirrup calculation
            let stirrupRows: { label: string; value: string }[] = [];
            let stirrupSafe = true;
            if (shearRes?.needsStirrups && V > 0 && b > 0 && d > 0 && fcVal > 0 && fyVal > 0 && dStirrup > 0 && nLegs > 0) {
              const FsVal = parseFloat(String(beam.Fs || 0)) || undefined;
              const st = calculateStirrups({ shear: V, width: b, effectiveDepth: d, fc: fcVal, fy: fyVal, stirrupDiameter: dStirrup, stirrupLegs: nLegs, Fs: FsVal });
              stirrupSafe = st.safe;
              stirrupRows = [
                { label: 'التباعد المطلوب (سم)', value: st.spacing.toFixed(1) },
                { label: 'التباعد الأقصى smax (سم)', value: st.spacingMax.toFixed(1) },
                { label: 'حالة الأطواق', value: st.safe ? 'آمن' : 'غير آمن' },
              ];
            }

            const allSafe = (thickRes ? thickRes.safe : true) && (flexRes ? flexRes.safe : true) && (shearRes ? shearRes.safe : true) && rebarSafe && stirrupSafe;

            const resultRows: { label: string; value: string }[] = [];
            if (thickRes) {
              resultRows.push({ label: `شرط السماكة: h المنفذ = ${h} سم، h Min = ${thickRes.hMin.toFixed(1)} سم`, value: thickRes.safe ? 'محقق' : 'غير محقق' });
            }
            if (flexRes) {
              resultRows.push(
                { label: 'إجهاد الخرسانة الفعلي fc (كغ/سم²)', value: flexRes.fc.toFixed(2) },
                { label: "إجهاد الخرسانة المسموح 0.4f'c (كغ/سم²)", value: flexRes.fcAllow.toFixed(2) },
                { label: 'إجهاد الحديد الفعلي fs (كغ/سم²)', value: flexRes.fs.toFixed(2) },
                { label: 'إجهاد الحديد المسموح 0.5fy (كغ/سم²)', value: flexRes.fsAllow.toFixed(2) },
              );
              if (flexRes.overReinforced) resultRows.push({ label: 'ملاحظة', value: 'تسليح زائد — يحتاج إعادة تصميم' });
            }
            if (shearRes) {
              resultRows.push(
                { label: 'إجهاد القص الفعلي v (كغ/سم²)', value: shearRes.v.toFixed(2) },
                { label: 'مقاومة الخرسانة للقص vc (كغ/سم²)', value: shearRes.vc.toFixed(2) },
                { label: 'الإجهاد الأقصى vmax (كغ/سم²)', value: shearRes.vmax.toFixed(2) },
                { label: 'هل تحتاج أطواق؟', value: shearRes.needsStirrups ? 'نعم' : 'لا' },
              );
            }

            // Skip calc-only fields
            const skipBeamKeys = new Set(['id', 'stirrupDiameter', 'stirrupLegs', 'Fs']);

            return (
              <View key={String(beam.id || idx)} wrap={false}>
                <EntryCard title={`${beamName} — ${beamLabel}`} safe={allSafe}>
                  {Object.entries(beam)
                    .filter(([k]) => !shouldSkip(k) && !skipBeamKeys.has(k))
                    .map(([k, v], i) => (
                      <KVRow
                        key={k}
                        label={BEAM_ENTRY_LABELS[k] || guessLabel(k)}
                        value={k === 'beamSubType' ? BEAM_TYPE_LABELS[String(v)] || String(v) : (v as string | number)}
                        alt={i % 2 === 1}
                      />
                    ))}
                </EntryCard>
                {resultRows.length > 0 && (
                  <ResultsTable title="نتائج الفحوصات الإنشائية" safe={allSafe} rows={resultRows} />
                )}
                {rebarRows.length > 0 && (
                  <ResultsTable title="مقارنة التسليح مع الدنيا" safe={rebarSafe} rows={rebarRows} />
                )}
                {stirrupRows.length > 0 && (
                  <ResultsTable title="نتائج حساب الأطواق" safe={stirrupSafe} rows={stirrupRows} />
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/** 7. Electrical Report */
function RenderElectricalReport({ data }: { data: Record<string, unknown> }) {
  const mainSupply = String(data.mainSupply || '');
  const mainPanel = String(data.mainPanelCondition || '');
  const lighting = String(data.lightingCondition || '');
  const hasLowCurrent = data.hasLowCurrentSystem === true;
  const lowCurrentSystems = Array.isArray(data.lowCurrentSystems) ? data.lowCurrentSystems as string[] : [];
  const installationsDesc = String(data.installationsDescription || '');
  const observations = String(data.observations || '');
  const hasAnyData = mainSupply || mainPanel || lighting || hasLowCurrent || installationsDesc || observations;
  if (!hasAnyData) return <Text style={S.noData}>لا توجد بيانات متاحة</Text>;
  return (
    <View>
      <View style={S.table}>
        <ThRow />
        {mainSupply && <KVRow label={ELECTRICAL_LABELS.mainSupply} value={mainSupply} />}
        {mainPanel && <KVRow label={ELECTRICAL_LABELS.mainPanelCondition} value={mainPanel} alt />}
        {lighting && <KVRow label={ELECTRICAL_LABELS.lightingCondition} value={lighting} />}
        <KVRow label={ELECTRICAL_LABELS.hasLowCurrentSystem} value={hasLowCurrent} alt={!!lighting} />
      </View>
      {hasLowCurrent && lowCurrentSystems.length > 0 && (
        <View>
          <SubHeader number="7.1" title={`أنظمة التيار الضعيف (${lowCurrentSystems.length} نظام)`} />
          <View style={S.table}>
            <ThRow />
            {lowCurrentSystems.map((sys, i) => (
              <KVRow key={i} label={`نظام #${i + 1}`} value={LOW_CURRENT_LABELS[sys] || sys} alt={i % 2 === 1} />
            ))}
          </View>
        </View>
      )}
      {installationsDesc && (
        <View>
          <SubHeader number={hasLowCurrent ? "7.2" : "7.1"} title="وصف التمديدات الكهربائية" />
          <TextBlock>{installationsDesc}</TextBlock>
        </View>
      )}
      {observations && (
        <View style={S.blueInfoBox}>
          <Text style={S.blueInfoLabel}>الملاحظات والمشاهدات</Text>
          <Text style={S.blueInfoValue}>{observations}</Text>
        </View>
      )}
    </View>
  );
}

/** 8. Plumbing Report */
function RenderPlumbingReport({ data }: { data: Record<string, unknown> }) {
  const mainSupply = String(data.mainSupply || '');
  const saltWater = String(data.saltWaterNetwork || '');
  const freshWater = String(data.freshWaterNetwork || '');
  const hasLeakage = data.hasLeakage === true;
  const leakageDesc = String(data.leakageDescription || '');
  const notes = String(data.notes || '');
  const hasAnyData = mainSupply || saltWater || freshWater || hasLeakage || notes;
  if (!hasAnyData) return <Text style={S.noData}>لا توجد بيانات متاحة</Text>;
  return (
    <View>
      <View style={S.table}>
        <ThRow />
        {mainSupply && <KVRow label={PLUMBING_LABELS.mainSupply} value={mainSupply} />}
        {saltWater && <KVRow label={PLUMBING_LABELS.saltWaterNetwork} value={saltWater} alt />}
        {freshWater && <KVRow label={PLUMBING_LABELS.freshWaterNetwork} value={freshWater} />}
        <KVRow label={PLUMBING_LABELS.hasLeakage} value={hasLeakage} alt={!!freshWater} />
      </View>
      {hasLeakage && leakageDesc && (
        <View>
          <SubHeader number="8.1" title="تفاصيل التسرب" />
          <View style={[S.infoBox, { backgroundColor: C.unsafeBg, borderColor: C.unsafeBorder }]}>
            <Text style={[S.infoBoxLabel, { color: C.unsafe }]}>{PLUMBING_LABELS.leakageDescription}</Text>
            <Text style={[S.infoBoxValue, { color: C.unsafe, textAlign: 'right', marginTop: 3 }]}>{leakageDesc}</Text>
          </View>
        </View>
      )}
      {notes && (
        <View style={S.purpleInfoBox}>
          <Text style={S.purpleInfoLabel}>{PLUMBING_LABELS.notes}</Text>
          <Text style={S.purpleInfoValue}>{notes}</Text>
        </View>
      )}
    </View>
  );
}

/** 9. Technical Notes */
function RenderTechnicalNotes({ data }: { data: Record<string, unknown> }) {
  const archNotes = data.architecturalNotes as Record<string, unknown> | undefined;
  const structNotes = data.structuralNotes as Record<string, unknown> | undefined;
  const elecNotes = data.electricalNotes as Record<string, unknown> | undefined;
  const plumbNotes = data.plumbingNotes as Record<string, unknown> | undefined;
  const location = String(data.location || '');
  const recommendations = String(data.recommendations || '');
  const hasAnyData = (archNotes && Object.keys(archNotes).length > 0) || (structNotes && Object.keys(structNotes).length > 0) || (elecNotes && Object.keys(elecNotes).length > 0) || (plumbNotes && Object.keys(plumbNotes).length > 0) || location || recommendations;
  if (!hasAnyData) return <Text style={S.noData}>لا توجد بيانات متاحة</Text>;
  let subIdx = 0;
  return (
    <View>
      {location && (
        <View style={S.infoBox}>
          <Text style={S.infoBoxLabel}>الموقع</Text>
          <Text style={[S.infoBoxValue, { textAlign: 'right' }]}>{location}</Text>
        </View>
      )}
      {archNotes && typeof archNotes === 'object' && (
        <View>
          <SubHeader number={`9.${++subIdx}`} title="ملاحظات معمارية" />
          <View style={S.table}>
            <ThRow />
            {Object.entries(archNotes).filter(([, v]) => v && String(v).length > 0).map(([k, v], i) => (
              <KVRow key={k} label={TECH_ARCHITECTURAL_LABELS[k] || guessLabel(k)} value={String(v)} alt={i % 2 === 1} />
            ))}
          </View>
        </View>
      )}
      {structNotes && typeof structNotes === 'object' && (
        <View>
          <SubHeader number={`9.${++subIdx}`} title="ملاحظات إنشائية" />
          <View style={S.table}>
            <ThRow />
            {Object.entries(structNotes).filter(([, v]) => v && String(v).length > 0).map(([k, v], i) => (
              <KVRow key={k} label={TECH_STRUCTURAL_LABELS[k] || guessLabel(k)} value={String(v)} alt={i % 2 === 1} />
            ))}
          </View>
        </View>
      )}
      {elecNotes && typeof elecNotes === 'object' && (
        <View>
          <SubHeader number={`9.${++subIdx}`} title="ملاحظات كهربائية" />
          <View style={S.table}>
            <ThRow />
            {Object.entries(elecNotes).filter(([, v]) => v && String(v).length > 0).map(([k, v], i) => (
              <KVRow key={k} label={TECH_ELECTRICAL_LABELS[k] || guessLabel(k)} value={String(v)} alt={i % 2 === 1} />
            ))}
          </View>
        </View>
      )}
      {plumbNotes && typeof plumbNotes === 'object' && (
        <View>
          <SubHeader number={`9.${++subIdx}`} title="ملاحظات صحية" />
          <View style={S.table}>
            <ThRow />
            {Object.entries(plumbNotes).filter(([, v]) => v && String(v).length > 0).map(([k, v], i) => (
              <KVRow key={k} label={TECH_PLUMBING_LABELS[k] || guessLabel(k)} value={String(v)} alt={i % 2 === 1} />
            ))}
          </View>
        </View>
      )}
      {recommendations && (
        <View style={[S.infoBox, { backgroundColor: C.amberBg, borderColor: C.amberBorder }]}>
          <Text style={[S.infoBoxLabel, { color: C.amber }]}>التوصيات</Text>
          <Text style={[S.infoBoxValue, { color: C.amber, textAlign: 'right', marginTop: 3 }]}>{recommendations}</Text>
        </View>
      )}
    </View>
  );
}

/** 10. Final Report */
function RenderFinalReport({ data }: { data: Record<string, unknown> }) {
  const requirements = String(data.requirements || '');
  const overallEvaluation = String(data.overallEvaluation || '');
  const reportPurpose = String(data.reportPurpose || '');
  const reportPurposeDesc = String(data.reportPurposeDescription || '');
  const engineers = Array.isArray(data.engineers) ? data.engineers as Record<string, unknown>[] : [];
  const approvals = Array.isArray(data.approvals) ? data.approvals as Record<string, unknown>[] : [];
  const hasAnyData = requirements || overallEvaluation || reportPurpose || engineers.length > 0 || approvals.length > 0;
  if (!hasAnyData) return <Text style={S.noData}>لا توجد بيانات متاحة</Text>;
  const getEvalColor = (evalText: string): { bg: string; border: string; text: string } => {
    if (evalText.includes('آمن')) return { bg: C.safeBg, border: C.safeBorder, text: C.safe };
    if (evalText.includes('خطر') || evalText.includes('غير آمن')) return { bg: C.unsafeBg, border: C.unsafeBorder, text: C.unsafe };
    if (evalText.includes('ترميم') || evalText.includes('مراقبة')) return { bg: C.amberBg, border: C.amberBorder, text: C.amber };
    return { bg: C.blueBg, border: C.blueBorder, text: C.blue };
  };
  return (
    <View>
      {(reportPurpose || reportPurposeDesc) && (
        <View>
          <SubHeader number="10.1" title="غاية التقرير" />
          {reportPurpose && (
            <View style={S.table}>
              <ThRow />
              <KVRow label={FINAL_REPORT_LABELS.reportPurpose} value={reportPurpose} />
              {reportPurposeDesc && <KVRow label={FINAL_REPORT_LABELS.reportPurposeDescription} value={reportPurposeDesc} alt />}
            </View>
          )}
        </View>
      )}
      {requirements && (
        <View>
          <SubHeader number="10.2" title="المتطلبات والاشتراطات" />
          <TextBlock>{requirements}</TextBlock>
        </View>
      )}
      {overallEvaluation && (
        <View>
          <SubHeader number="10.3" title="التقييم العام" />
          {(() => {
            const ec = getEvalColor(overallEvaluation);
            return (
              <View style={[S.evalBadge, { backgroundColor: ec.bg, borderWidth: 1, borderColor: ec.border }]}>
                <Text style={[S.evalBadgeText, { color: ec.text }]}>{overallEvaluation}</Text>
              </View>
            );
          })()}
        </View>
      )}
      {engineers.length > 0 && (
        <View>
          <SubHeader number="10.4" title={`المهندسون (${engineers.length} مهندس)`} />
          <View style={S.sigTable}>
            <View style={S.sigTableHead}>
              <Text style={S.sigHeader}>التسلسل</Text>
              <Text style={S.sigHeader}>الاختصاص</Text>
              <Text style={S.sigHeader}>اسم المهندس</Text>
              <Text style={S.sigHeader}>رقم الإجازة</Text>
            </View>
            {engineers.map((eng, i) => (
              <View key={String(eng.id || i)} style={i % 2 === 1 ? S.sigRowAlt : S.sigRow}>
                <Text style={S.sigCell}>{String(eng.sequence || i + 1)}</Text>
                <Text style={S.sigCell}>{String(eng.discipline || '')}</Text>
                <Text style={S.sigCell}>{String(eng.name || '')}</Text>
                <Text style={S.sigCell}>{String(eng.licenseNumber || '')}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      {approvals.length > 0 && (
        <View>
          <SubHeader number="10.5" title={`المعتمدون (${approvals.length} معتمد)`} />
          <View style={S.sigTable}>
            <View style={S.sigTableHead}>
              <Text style={S.sigHeader}>التسلسل</Text>
              <Text style={S.sigHeader}>الدور</Text>
              <Text style={S.sigHeader}>الاسم</Text>
              <Text style={S.sigHeader}>الاختصاص</Text>
              <Text style={S.sigHeader}>التاريخ</Text>
            </View>
            {approvals.map((app, i) => (
              <View key={String(app.id || i)} style={i % 2 === 1 ? S.sigRowAlt : S.sigRow}>
                <Text style={S.sigCell}>{String(app.sequence || i + 1)}</Text>
                <Text style={S.sigCell}>{String(app.role || '')}</Text>
                <Text style={S.sigCell}>{String(app.name || '')}</Text>
                <Text style={S.sigCell}>{String(app.discipline || '')}</Text>
                <Text style={S.sigCell}>{String(app.date || '')}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

/** Generic Section fallback */
function RenderGenericSection({ data }: { data: Record<string, unknown> }) {
  if (!data || Object.keys(data).length === 0) return <Text style={S.noData}>لا توجد بيانات متاحة</Text>;
  return <KVTable data={data} />;
}

// ===================================================================
// SECTION DISPATCHER
// ===================================================================

function RenderSection({ section, projectData }: { section: PDFSection; projectData: Record<string, unknown> }) {
  const data = projectData[section.dataKey] as Record<string, unknown> | undefined;
  const content = (() => {
    if (!data || Object.keys(data).length === 0) return <Text style={S.noData}>لا توجد بيانات متاحة</Text>;
    switch (section.id) {
      case 'buildingData': return <RenderBuildingData data={data} />;
      case 'architecturalReport': return <RenderArchitecturalReport data={data} />;
      case 'structuralReport': return <RenderStructuralReport data={data} projectData={projectData} />;
      case 'foundations': return <RenderFoundations data={data} />;
      case 'columnsWalls': return <RenderColumnsWalls data={data} projectData={projectData} />;
      case 'beamSlab': return <RenderBeamSlab data={data} />;
      case 'electricalReport': return <RenderElectricalReport data={data} />;
      case 'plumbingReport': return <RenderPlumbingReport data={data} />;
      case 'technicalNotes': return <RenderTechnicalNotes data={data} />;
      case 'finalReport': return <RenderFinalReport data={data} />;
      default: return <RenderGenericSection data={data} />;
    }
  })();
  return (
    <View style={S.section} wrap={false}>
      <SectionHeader number={section.number} title={section.label} />
      {content}
    </View>
  );
}

// ===================================================================
// MAIN PDF DOCUMENT
// ===================================================================

function getReportDate(): string {
  return new Date().toLocaleDateString('ar-SY', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function BSReportDocument({ config }: { config: PDFReportConfig }) {
  const { companyName, reportHeader, reportFooter, sections, projectData } = config;
  const dateStr = getReportDate();

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={S.coverPage}>
        <View style={S.coverContent}>
          <View style={S.coverLogo}><Text style={S.coverLogoText}>BS</Text></View>
          <Text style={S.coverTitle}>تقرير تقييم المباني الخرسانية المسلحة</Text>
          <Text style={S.coverSubtitle}>B.S Evaluation Report</Text>
          <Text style={S.coverCode}>وفقاً للكود العربي السوري 2024 — الطريقة الكلاسيكية التشغيلية</Text>
          <View style={S.coverDivider} />
          {companyName && <Text style={S.coverCompany}>{companyName}</Text>}
          {(() => {
            const bd = projectData.building_data as Record<string, unknown> | undefined;
            const owner = bd?.ownerName ? String(bd.ownerName) : '';
            const usage = bd?.buildingUsage ? String(bd.buildingUsage) : '';
            if (!owner && !usage) return null;
            return (
              <View style={{ marginTop: 10, alignItems: 'center' }}>
                {owner && <Text style={{ fontSize: 12, color: C.white, textAlign: 'center' }}>مالك المنشأة: {owner}</Text>}
                {usage && <Text style={{ fontSize: 10, color: C.primaryLight, textAlign: 'center', marginTop: 4 }}>استخدام المنشأة: {usage}</Text>}
              </View>
            );
          })()}
          <Text style={S.coverDate}>تاريخ التقرير: {dateStr}</Text>
          <Text style={S.coverCopyright}>المهندس الاستشاري: بشار السليمان — جميع الحقوق محفوظة © {new Date().getFullYear()}</Text>
        </View>
      </Page>

      {/* Table of Contents */}
      <Page size="A4" style={S.tocPage}>
        <View style={S.header} fixed>
          {companyName && <Text style={S.headerCompany}>{companyName}</Text>}
          <Text style={S.headerTitle}>تقرير تقييم المباني الخرسانية المسلحة</Text>
          <Text style={S.headerSubtitle}>وفقاً للكود العربي السوري 2024</Text>
        </View>
        <View style={S.tocContent}>
          <Text style={S.tocTitle}>فهرس المحتويات</Text>
          {sections.map((section, i) => (
            <View key={section.id} style={i % 2 === 1 ? S.tocItemAlt : S.tocItem}>
              <Text style={S.tocNum}>{section.number}</Text>
              <Text style={S.tocLabel}>{section.label}</Text>
            </View>
          ))}
        </View>
        <View style={S.footer} fixed>
          <Text style={S.footerText}>تم إعداد هذا التقرير وفقاً للكود العربي السوري 2024</Text>
        </View>
        <Text style={S.footerPage} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>

      {/* Content Pages */}
      {sections.map((section, secIdx) => {
        const isLastPage = secIdx === sections.length - 1;
        return (
          <Page key={section.id} size="A4" style={S.page}>
            <View style={S.header} fixed>
              {companyName && <Text style={S.headerCompany}>{companyName}</Text>}
              <Text style={S.headerTitle}>تقرير تقييم المباني الخرسانية المسلحة</Text>
              <Text style={S.headerSubtitle}>وفقاً للكود العربي السوري 2024 — الطريقة الكلاسيكية التشغيلية</Text>
              <Text style={S.headerDate}>تاريخ التقرير: {dateStr}</Text>
              {reportHeader && <Text style={S.headerCustomText}>{reportHeader}</Text>}
            </View>
            <View style={S.content}>
              <RenderSection section={section} projectData={projectData} />
              {!isLastPage && <Sep />}
            </View>
            <View style={S.footer} fixed>
              {reportFooter ? (
                <Text style={S.footerText}>{reportFooter}</Text>
              ) : (
                <Text style={S.footerText}>تم إعداد هذا التقرير وفقاً للكود العربي السوري 2024 — الطريقة الكلاسيكية التشغيلية</Text>
              )}
              {isLastPage && <Text style={S.footerEndMark}>— نهاية التقرير —</Text>}
            </View>
            <Text style={S.footerPage} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
          </Page>
        );
      })}
    </Document>
  );
}

// ===================================================================
// GENERATE PDF BLOB
// ===================================================================

export async function generatePDFBlob(config: PDFReportConfig): Promise<Blob> {
  if (!_fontLoaded) {
    const loaded = await loadArabicFont();
    if (!loaded) throw new Error('Failed to load Arabic font for PDF');
  }
  const blob = await pdf(<BSReportDocument config={config} />).toBlob();
  return blob;
}

export async function downloadPDF(config: PDFReportConfig): Promise<void> {
  const blob = await generatePDFBlob(config);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `تقرير_تقييم_${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
