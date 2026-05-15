/**
 * B.S Evaluation — Professional PDF Report Generator
 * @react-pdf/renderer — Syrian Arab Code 2024
 *
 * Uses Cairo Arabic font, A4 layout, repeating header/footer,
 * wrap={false} for No-Split elements, and fixed margins.
 */

import React from 'react';
import {
  Document, Page, View, Text, StyleSheet, Font, pdf,
} from '@react-pdf/renderer';
import {
  checkSoilStress, checkColumnStress, checkSlabThickness,
  checkBeamThickness, checkFlexure, checkShear,
  compareReinforcement, checkPunchingShear,
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
    // Convert ArrayBuffer to base64 data URI for @react-pdf/renderer
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
// LABEL MAPPERS (same as GenerateReports.tsx)
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
  notes: 'ملاحظات',
};

const COLUMN_ENTRY_LABELS: Record<string, string> = {
  elementType: 'نوع العنصر',
  columnType: 'نوع العمود',
  floor: 'الطابق',
  name: 'اسم العنصر',
  sectionWidth: 'عرض المقطع (سم)',
  sectionDepth: 'طول المقطع (سم)',
  totalLoad: 'الحمولة الاستثمارية الكلية (طن)',
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
  load: 'الحمولة (طن/م²)',
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
};

function guessLabel(key: string): string {
  return GENERIC_LABELS[key] || key;
}

// ===================================================================
// SKIP KEYS (photos, binary data)
// ===================================================================

const SKIP_KEYS = new Set([
  'sitePhotos', 'photos', 'image', 'base64', 'fileBase64',
  'hammerReportPhoto', 'soilReportFileBase64', 'soilReportFileName',
  'soilReportFileSize', 'additionalPhotos', 'structuralCrackPhotos',
  'crackPhotos',
]);

function shouldSkip(key: string): boolean {
  if (SKIP_KEYS.has(key)) return true;
  const lk = key.toLowerCase();
  return lk.includes('photo') || lk.includes('image');
}

// ===================================================================
// HELPER: rebarArea
// ===================================================================

function rebarArea(count: number, diameterMm: number): number {
  return count * (Math.PI / 4) * Math.pow(diameterMm / 10, 2);
}

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
};

// ===================================================================
// STYLES — A4 (595.28 x 841.89 pt)
// ===================================================================

const S = StyleSheet.create({
  // ---- Page ----
  page: {
    fontFamily: 'Cairo',
    fontSize: 9.5,
    color: C.text,
    size: 'A4',
    // No padding — header/footer use fixed positioning
    // Content area uses explicit padding
  },

  // ---- Header (repeats every page) ----
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 25,
    paddingBottom: 12,
    paddingHorizontal: 50,
    borderBottomWidth: 3,
    borderBottomColor: C.primaryDark,
    backgroundColor: C.white,
  },
  headerCompany: {
    fontSize: 13,
    fontWeight: 700,
    color: C.primary,
    textAlign: 'center',
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: C.text,
    textAlign: 'center',
    marginBottom: 1,
  },
  headerSubtitle: {
    fontSize: 8.5,
    color: C.textMuted,
    textAlign: 'center',
  },
  headerDate: {
    fontSize: 7.5,
    color: C.textLight,
    textAlign: 'center',
    marginTop: 3,
  },
  headerCustomText: {
    fontSize: 8.5,
    color: C.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },

  // ---- Footer (repeats every page) ----
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 50,
    borderTopWidth: 2,
    borderTopColor: C.primary,
    backgroundColor: C.white,
  },
  footerText: {
    fontSize: 7.5,
    color: C.textMuted,
    textAlign: 'center',
  },
  footerEndMark: {
    fontSize: 6.5,
    color: C.textLight,
    textAlign: 'center',
    marginTop: 3,
  },
  footerPage: {
    position: 'absolute',
    bottom: 20,
    left: 50,
    fontSize: 7.5,
    color: C.textLight,
  },

  // ---- Content Area ----
  content: {
    paddingTop: 85,
    paddingBottom: 65,
    paddingHorizontal: 50,
  },

  // ---- Section ----
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingBottom: 5,
    borderBottomWidth: 2,
    borderBottomColor: C.primary,
  },
  sectionNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.primary,
    color: C.white,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: 700,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#1f2937',
  },

  // ---- Sub-section ----
  subHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 6,
  },
  subNum: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.primaryLight,
    color: C.primary,
    textAlign: 'center',
    fontSize: 7.5,
    fontWeight: 700,
    lineHeight: 18,
  },
  subTitle: {
    fontSize: 9.5,
    fontWeight: 700,
    color: '#374151',
  },

  // ---- Table ----
  table: {
    borderWidth: 1,
    borderColor: C.tableBorder,
    borderRadius: 2,
    marginBottom: 8,
  },
  tableHead: {
    backgroundColor: C.headerBg,
    flexDirection: 'row-reverse',
  },
  th: {
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontSize: 8.5,
    fontWeight: 700,
    color: C.white,
    borderLeftWidth: 1,
    borderLeftColor: C.primaryDark,
    textAlign: 'right',
  },
  tr: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 0.5,
    borderBottomColor: C.grayBorder,
  },
  trAlt: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 0.5,
    borderBottomColor: C.grayBorder,
    backgroundColor: C.grayBg,
  },
  td: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 8.5,
    borderLeftWidth: 0.5,
    borderLeftColor: C.grayBorder,
    textAlign: 'right',
  },
  tdLabel: { flex: 4, color: '#374151', fontWeight: 500 },
  tdValue: { flex: 5, color: C.text },

  // ---- Entry Card ----
  card: {
    borderWidth: 1,
    borderColor: C.grayBorder,
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  cardHead: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 5,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: C.grayBorder,
  },
  cardTitle: {
    fontSize: 8.5,
    fontWeight: 700,
    color: '#374151',
    textAlign: 'right',
  },

  // ---- Safety Badge ----
  safeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 2,
    backgroundColor: C.safeBg,
    borderWidth: 0.5,
    borderColor: C.safeBorder,
  },
  safeBadgeText: {
    fontSize: 6.5,
    fontWeight: 700,
    color: C.safe,
  },
  unsafeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 2,
    backgroundColor: C.unsafeBg,
    borderWidth: 0.5,
    borderColor: C.unsafeBorder,
  },
  unsafeBadgeText: {
    fontSize: 6.5,
    fontWeight: 700,
    color: C.unsafe,
  },

  // ---- Info Box ----
  infoBox: {
    padding: 8,
    borderRadius: 3,
    backgroundColor: C.primaryBg,
    borderWidth: 0.5,
    borderColor: '#a7f3d0',
    marginBottom: 10,
  },
  infoBoxLabel: { fontSize: 9, color: C.primary, fontWeight: 700, textAlign: 'right' },
  infoBoxValue: { fontSize: 9, color: C.primary, fontWeight: 700, textAlign: 'left' },

  // ---- Results Table ----
  resultsHead: {
    flexDirection: 'row-reverse',
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 8.5,
    fontWeight: 700,
    textAlign: 'right',
  },
  resultsHeadSafe: { backgroundColor: C.safeBg, color: C.safe },
  resultsHeadUnsafe: { backgroundColor: C.unsafeBg, color: C.unsafe },

  // ---- Separator ----
  sep: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#d1d5db',
    borderStyle: 'dashed',
    marginVertical: 12,
  },

  // ---- No Data ----
  noData: {
    fontSize: 9,
    color: C.textMuted,
    textAlign: 'center',
    paddingVertical: 15,
  },

  // ---- Flex row helper ----
  row: { flexDirection: 'row-reverse', alignItems: 'center' },
  rowCenter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});

// ===================================================================
// PDF HELPER COMPONENTS
// ===================================================================

/** Safety badge */
function SafeBadge({ safe }: { safe: boolean }) {
  return (
    <View style={safe ? S.safeBadge : S.unsafeBadge} wrap={false}>
      <Text style={safe ? S.safeBadgeText : S.unsafeBadgeText}>
        {safe ? 'آمن (محقق)' : 'غير آمن (غير محقق)'}
      </Text>
    </View>
  );
}

/** Table header row */
function ThRow() {
  return (
    <View style={S.tableHead}>
      <Text style={[S.th, { flex: 4 }]}>البند</Text>
      <Text style={[S.th, { flex: 5 }]}>البيان</Text>
    </View>
  );
}

/** Key-Value row */
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

/** Simple KV Table from a record */
function KVTable({
  data,
  labels,
  showHeader = true,
}: {
  data: Record<string, unknown>;
  labels?: Record<string, string>;
  showHeader?: boolean;
}) {
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

/** Section header with number */
function SectionHeader({ number, title }: { number: number; title: string }) {
  return (
    <View style={S.sectionHeader} wrap={false}>
      <View style={S.sectionNum}>
        <Text style={S.sectionNum}>{number}</Text>
      </View>
      <Text style={S.sectionTitle}>{title}</Text>
    </View>
  );
}

/** Sub-section header */
function SubHeader({ number, title }: { number: string; title: string }) {
  return (
    <View style={S.subHeader} wrap={false}>
      <View style={S.subNum}>
        <Text style={S.subNum}>{number}</Text>
      </View>
      <Text style={S.subTitle}>{title}</Text>
    </View>
  );
}

/** Entry card wrapper */
function EntryCard({
  title,
  safe,
  children,
}: {
  title: string;
  safe?: boolean;
  children: React.ReactNode;
}) {
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

/** Results table within an entry */
function ResultsTable({
  title,
  safe,
  rows,
}: {
  title: string;
  safe: boolean;
  rows: { label: string; value: string }[];
}) {
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

/** Separator */
function Sep() {
  return <View style={S.sep} />;
}

// ===================================================================
// SECTION RENDERERS
// ===================================================================

/** 1. Building Data */
function RenderBuildingData({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(
    ([k]) => !shouldSkip(k) && BUILDING_LABELS[k],
  );
  if (entries.length === 0) return <Text style={S.noData}>لا توجد بيانات متاحة</Text>;
  return (
    <View style={S.table}>
      <ThRow />
      {entries.map(([k, v], i) => (
        <KVRow
          key={k}
          label={BUILDING_LABELS[k] || guessLabel(k)}
          value={v as string | number}
          alt={i % 2 === 1}
        />
      ))}
    </View>
  );
}

/** 2. Architectural Report */
function RenderArchitecturalReport({ data }: { data: Record<string, unknown> }) {
  const topEntries = Object.entries(data).filter(
    ([k]) => !shouldSkip(k) && k !== 'floors',
  );
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
              {Object.entries(floor)
                .filter(([k]) => !shouldSkip(k))
                .map(([k, v], i) => (
                  <KVRow key={k} label={guessLabel(k)} value={v as string | number} alt={i % 2 === 1} />
                ))}
            </EntryCard>
          ))}
        </View>
      )}
    </View>
  );
}

/** 3. Structural Report */
function RenderStructuralReport({
  data,
  projectData,
}: {
  data: Record<string, unknown>;
  projectData: Record<string, unknown>;
}) {
  const mainEntries = Object.entries(data).filter(
    ([k]) => STRUCTURAL_LABELS[k] && !shouldSkip(k),
  );
  const hammer = data.hammerTest as Record<string, unknown> | undefined;
  const soil = data.soilReport as Record<string, unknown> | undefined;

  return (
    <View>
      {mainEntries.length > 0 && (
        <View style={S.table}>
          <ThRow />
          {mainEntries.map(([k, v], i) => (
            <KVRow
              key={k}
              label={STRUCTURAL_LABELS[k] || guessLabel(k)}
              value={v as string | number}
              alt={i % 2 === 1}
            />
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
            {Object.entries(hammer)
              .filter(([k]) => !shouldSkip(k))
              .map(([k, v], i) => (
                <KVRow
                  key={k}
                  label={HAMMER_LABELS[k] || guessLabel(k)}
                  value={v as string | number}
                  alt={i % 2 === 1}
                />
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
            {Object.entries(soil)
              .filter(([k]) => !shouldSkip(k) && SOIL_LABELS[k])
              .map(([k, v], i) => (
                <KVRow
                  key={k}
                  label={SOIL_LABELS[k] || guessLabel(k)}
                  value={v as string | number}
                  alt={i % 2 === 1}
                />
              ))}
          </View>
        </View>
      )}
    </View>
  );
}

/** 4. Foundations */
function RenderFoundations({ data }: { data: Record<string, unknown> }) {
  const foundations = Array.isArray(data.foundations)
    ? data.foundations as Record<string, unknown>[]
    : [];
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
          {infoRows.map((r, i) => (
            <KVRow key={r.label} label={r.label} value={r.value} alt={i % 2 === 1} />
          ))}
        </View>
      )}

      {foundations.length > 0 && (
        <View>
          <SubHeader number="4.1" title={`تفاصيل الأساسات (${foundations.length} أساس)`} />
          {foundations.map((entry, idx) => {
            const len = parseFloat(String(entry.length || 0)) || 0;
            const wid = parseFloat(String(entry.width || 0)) || 0;
            const load = parseFloat(String(entry.totalLoad || 0)) || 0;
            const entryName = String(entry.name || `أساس #${idx + 1}`);
            const entryType = String(entry.type || '');

            let soilResult: { actual: number; safe: boolean } | null = null;
            if (len > 0 && wid > 0 && load > 0 && allowable > 0) {
              const ch = checkSoilStress({ load, length: len, width: wid, allowableStress: allowable });
              soilResult = { actual: ch.actual, safe: ch.safe };
            }

            return (
              <View key={String(entry.id || idx)} wrap={false}>
                <EntryCard
                  title={`${entryName} — ${entryType}`}
                  safe={soilResult?.safe}
                >
                  {Object.entries(entry)
                    .filter(([k]) => !shouldSkip(k) && k !== 'id')
                    .map(([k, v], i) => (
                      <KVRow
                        key={k}
                        label={FOUNDATION_ENTRY_LABELS[k] || guessLabel(k)}
                        value={v as string | number}
                        alt={i % 2 === 1}
                      />
                    ))}
                </EntryCard>
                {soilResult && (
                  <ResultsTable
                    title="نتائج فحص إجهاد التربة"
                    safe={soilResult.safe}
                    rows={[
                      { label: 'الإجهاد الفعلي (كغ/سم²)', value: soilResult.actual.toFixed(2) },
                      { label: 'الإجهاد المسموح (كغ/سم²)', value: allowable.toFixed(2) },
                      { label: 'نسبة الإجهاد المستخدم', value: `${((soilResult.actual / allowable) * 100).toFixed(1)}%` },
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/** 5. Columns & Walls */
function RenderColumnsWalls({ data, projectData }: { data: Record<string, unknown>; projectData: Record<string, unknown> }) {
  const entries = Array.isArray(data.entries)
    ? data.entries as Record<string, unknown>[]
    : Array.isArray(data.columns)
      ? data.columns as Record<string, unknown>[]
      : [];

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
            const entryName = String(entry.name || `${entry.elementType || 'عمود'} #${idx + 1}`);
            const elemType = String(entry.elementType || 'عمود');

            let stressResult: { actual: number; allowable: number; safe: boolean } | null = null;
            if (w > 0 && d > 0 && load > 0 && fc > 0) {
              const ch = checkColumnStress({ load, width: w, depth: d, fc });
              stressResult = { actual: ch.actual, allowable: ch.allowable, safe: ch.safe };
            }

            return (
              <View key={String(entry.id || idx)} wrap={false}>
                <EntryCard
                  title={`${elemType === 'جدار' ? 'جدار' : 'عمود'} #${idx + 1} — ${entryName}`}
                  safe={stressResult?.safe}
                >
                  {Object.entries(entry)
                    .filter(([k]) => !shouldSkip(k) && k !== 'id')
                    .map(([k, v], i) => (
                      <KVRow
                        key={k}
                        label={COLUMN_ENTRY_LABELS[k] || guessLabel(k)}
                        value={v as string | number}
                        alt={i % 2 === 1}
                      />
                    ))}
                </EntryCard>
                {stressResult && (
                  <ResultsTable
                    title="نتائج فحص إجهاد الضغط"
                    safe={stressResult.safe}
                    rows={[
                      { label: 'الإجهاد الفعلي (كغ/سم²)', value: stressResult.actual.toFixed(2) },
                      { label: "الإجهاد المسموح 0.3 × f'c (كغ/سم²)", value: stressResult.allowable.toFixed(2) },
                      { label: 'نسبة الإجهاد المستخدم', value: `${((stressResult.actual / stressResult.allowable) * 100).toFixed(1)}%` },
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/** 6. Beams & Slabs */
function RenderBeamSlab({ data }: { data: Record<string, unknown> }) {
  const fcVal = parseFloat(String(data.fc || 0)) || 0;
  const fyVal = parseFloat(String(data.fy || 0)) || 0;
  const slabs = Array.isArray(data.slabs) ? data.slabs as Record<string, unknown>[] : [];
  const beams = Array.isArray(data.beams) ? data.beams as Record<string, unknown>[] : [];

  const getEffectiveH = (slab: Record<string, unknown>): number => {
    const sub = String(slab.slabSubType || '');
    if (sub.includes('Ribbed')) {
      return (parseFloat(String(slab.coverThickness || 0)) || 0) + (parseFloat(String(slab.ribHeight || 0)) || 0);
    }
    return parseFloat(String(slab.hActual || 0)) || 0;
  };

  return (
    <View>
      {/* General Parameters */}
      {(fcVal > 0 || fyVal > 0) && (
        <View style={S.table}>
          <ThRow />
          {fcVal > 0 && (
            <KVRow label="المقاومة الاسطوانية f'c (كغ/سم²)" value={fcVal} />
          )}
          {fyVal > 0 && (
            <KVRow label="إجهاد خضوع الحديد fy (كغ/سم²)" value={fyVal} alt />
          )}
        </View>
      )}

      {/* Slabs */}
      {slabs.length > 0 && (
        <View>
          <SubHeader number="6.1" title={`تفاصيل البلاطات (${slabs.length} بلاطة)`} />
          {slabs.map((slab, idx) => {
            const h = getEffectiveH(slab);
            const subType = String(slab.slabSubType || 'oneWaySolid');
            const supportCond = subType === 'flatSlab' ? String(slab.hasDropPanels || '') : String(slab.supportCondition || '');
            const span = parseFloat(String(slab.span || 0)) || 0;
            const spanLong = parseFloat(String(slab.spanLong || 0)) || 0;
            const spanShort = parseFloat(String(slab.spanShort || 0)) || 0;
            const spanVal = spanLong || span;

            let thickRes: { safe: boolean; hMin: number } | null = null;
            if (h > 0 && fcVal > 0 && spanVal > 0) {
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

            const label = SLAB_TYPE_LABELS[subType] || subType;

            return (
              <View key={String(slab.id || idx)} wrap={false}>
                <EntryCard title={`بلاطة #${idx + 1} — ${label}`} safe={thickRes?.safe}>
                  {Object.entries(slab)
                    .filter(([k]) => !shouldSkip(k) && k !== 'id')
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
                  <ResultsTable
                    title="نتائج فحص شرط السماكة"
                    safe={thickRes.safe}
                    rows={[
                      { label: 'السماكة المنفذة (سم)', value: String(h) },
                      { label: 'السماكة الدنيا المطلوبة (سم)', value: thickRes.hMin.toFixed(1) },
                    ]}
                  />
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
            const beamName = String(beam.name || `جائز #${idx + 1}`);
            const beamLabel = BEAM_TYPE_LABELS[String(beam.beamSubType)] || String(beam.beamSubType);

            const d = h > cover ? h - cover : 0;
            const As = nRebar > 0 && dRebar > 0 ? rebarArea(nRebar, dRebar) : 0;

            // Thickness check
            let thickRes: { safe: boolean; hMin: number } | null = null;
            if (h > 0 && span > 0 && beam.supportCondition) {
              const tc = checkBeamThickness({ supportCondition: String(beam.supportCondition), span, hActual: h });
              thickRes = { safe: tc.safe, hMin: tc.hMin };
            }

            // Flexure check
            let flexRes: { safe: boolean; fc: number; fs: number; fcAllow: number; fsAllow: number; overReinforced: boolean } | null = null;
            if (M > 0 && b > 0 && d > 0 && As > 0 && fcVal > 0 && fyVal > 0) {
              const fl = checkFlexure({ moment: M, width: b, effectiveDepth: d, As, fc: fcVal, fy: fyVal });
              flexRes = {
                safe: !fl.overReinforced && fl.safe,
                fc: fl.fc,
                fs: fl.fs,
                fcAllow: fl.fcAllowable,
                fsAllow: fl.fsAllowable,
                overReinforced: fl.overReinforced,
              };
            }

            // Shear check
            let shearRes: { safe: boolean; v: number; vc: number; vmax: number; needsStirrups: boolean } | null = null;
            if (V > 0 && b > 0 && d > 0 && fcVal > 0) {
              const sc = checkShear({ shear: V, width: b, effectiveDepth: d, fc: fcVal });
              shearRes = { safe: sc.safe, v: sc.v, vc: sc.vc, vmax: sc.vmax, needsStirrups: sc.stirrupsNeeded };
            }

            const allSafe = (thickRes ? thickRes.safe : true)
              && (flexRes ? flexRes.safe : true)
              && (shearRes ? shearRes.safe : true);

            const resultRows: { label: string; value: string }[] = [];
            if (thickRes) {
              resultRows.push({
                label: `شرط السماكة: h المنفذ = ${h} سم، h Min = ${thickRes.hMin.toFixed(1)} سم`,
                value: thickRes.safe ? 'محقق' : 'غير محقق',
              });
            }
            if (flexRes) {
              resultRows.push(
                { label: 'إجهاد الخرسانة الفعلي fc (كغ/سم²)', value: flexRes.fc.toFixed(2) },
                { label: "إجهاد الخرسانة المسموح 0.4f'c (كغ/سم²)", value: flexRes.fcAllow.toFixed(2) },
                { label: 'إجهاد الحديد الفعلي fs (كغ/سم²)', value: flexRes.fs.toFixed(2) },
                { label: 'إجهاد الحديد المسموح 0.5fy (كغ/سم²)', value: flexRes.fsAllow.toFixed(2) },
              );
              if (flexRes.overReinforced) {
                resultRows.push({ label: 'ملاحظة', value: 'تسليح زائد — يحتاج إعادة تصميم' });
              }
            }
            if (shearRes) {
              resultRows.push(
                { label: 'إجهاد القص الفعلي v (كغ/سم²)', value: shearRes.v.toFixed(2) },
                { label: 'مقاومة الخرسانة للقص vc (كغ/سم²)', value: shearRes.vc.toFixed(2) },
                { label: 'الإجهاد الأقصى vmax (كغ/سم²)', value: shearRes.vmax.toFixed(2) },
                { label: 'هل تحتاج أطواق؟', value: shearRes.needsStirrups ? 'نعم' : 'لا' },
              );
            }

            return (
              <View key={String(beam.id || idx)} wrap={false}>
                <EntryCard title={`${beamName} — ${beamLabel}`} safe={allSafe}>
                  {Object.entries(beam)
                    .filter(([k]) => !shouldSkip(k) && k !== 'id')
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
                  <ResultsTable
                    title="نتائج الفحوصات الإنشائية"
                    safe={allSafe}
                    rows={resultRows}
                  />
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/** Generic Section (electrical, plumbing, technical notes, final report) */
function RenderGenericSection({ data }: { data: Record<string, unknown> }) {
  if (!data || Object.keys(data).length === 0) {
    return <Text style={S.noData}>لا توجد بيانات متاحة</Text>;
  }
  return <KVTable data={data} />;
}

// ===================================================================
// SECTION DISPATCHER
// ===================================================================

function RenderSection({
  section,
  projectData,
}: {
  section: PDFSection;
  projectData: Record<string, unknown>;
}) {
  const data = projectData[section.dataKey] as Record<string, unknown> | undefined;

  const content = (() => {
    if (!data || Object.keys(data).length === 0) {
      return <Text style={S.noData}>لا توجد بيانات متاحة</Text>;
    }
    switch (section.id) {
      case 'buildingData':
        return <RenderBuildingData data={data} />;
      case 'architecturalReport':
        return <RenderArchitecturalReport data={data} />;
      case 'structuralReport':
        return <RenderStructuralReport data={data} projectData={projectData} />;
      case 'foundations':
        return <RenderFoundations data={data} />;
      case 'columnsWalls':
        return <RenderColumnsWalls data={data} projectData={projectData} />;
      case 'beamSlab':
        return <RenderBeamSlab data={data} />;
      default:
        return <RenderGenericSection data={data} />;
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
  return new Date().toLocaleDateString('ar-SY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function BSReportDocument({ config }: { config: PDFReportConfig }) {
  const { companyName, reportHeader, reportFooter, sections, projectData } = config;
  const dateStr = getReportDate();

  return (
    <Document>
      {sections.map((section, secIdx) => {
        const isFirstPage = secIdx === 0;
        const isLastPage = secIdx === sections.length - 1;

        return (
          <Page key={section.id} size="A4" style={S.page}>
            {/* ===== Repeating Header ===== */}
            <View style={S.header} fixed>
              {companyName && (
                <Text style={S.headerCompany}>{companyName}</Text>
              )}
              <Text style={S.headerTitle}>تقرير تقييم المباني الخرسانية المسلحة</Text>
              <Text style={S.headerSubtitle}>
                وفقاً للكود العربي السوري 2024 — الطريقة الكلاسيكية التشغيلية
              </Text>
              <Text style={S.headerDate}>تاريخ التقرير: {dateStr}</Text>
              {reportHeader && (
                <Text style={S.headerCustomText}>{reportHeader}</Text>
              )}
            </View>

            {/* ===== Content ===== */}
            <View style={S.content}>
              <RenderSection section={section} projectData={projectData} />

              {/* Separator between sections (except last) */}
              {!isLastPage && <Sep />}
            </View>

            {/* ===== Repeating Footer ===== */}
            <View style={S.footer} fixed>
              {reportFooter ? (
                <Text style={S.footerText}>{reportFooter}</Text>
              ) : (
                <Text style={S.footerText}>
                  تم إعداد هذا التقرير وفقاً للكود العربي السوري 2024 — الطريقة الكلاسيكية التشغيلية
                </Text>
              )}
              {isLastPage && (
                <Text style={S.footerEndMark}>— نهاية التقرير —</Text>
              )}
            </View>

            {/* Page number */}
            <Text
              style={S.footerPage}
              render={({ pageNumber, totalPages }) =>
                `${pageNumber} / ${totalPages}`
              }
              fixed
            />
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
