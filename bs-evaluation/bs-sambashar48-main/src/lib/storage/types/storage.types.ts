/**
 * B.S Evaluation — Storage Type Definitions
 * أنواع TypeScript لنظام التخزين
 */

// ======== Project Data Sections ========
export const PROJECT_SECTIONS = [
  'building_data',
  'architectural_report',
  'structural_report',
  'foundations',
  'columns_walls',
  'beam_slab',
  'electrical',
  'plumbing',
  'technical_notes',
  'final_report',
] as const;

export type ProjectSection = (typeof PROJECT_SECTIONS)[number];

// ======== Project File (.bsproj) Structure ========
export interface BSProjectFile {
  /** صيغة الملف — دائماً "bsproj" */
  format: 'bsproj';
  /** إصدار صيغة الملف */
  version: 1;
  /** معلومات المشروع */
  meta: {
    name: string;
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    appVersion?: string;
  };
  /** بيانات الأقسام العشرة */
  data: Record<ProjectSection, Record<string, unknown>>;
  /** الصور المضغوطة — base64 */
  images?: Record<string, CompressedImage[]>;
}

export interface CompressedImage {
  id: string;
  name: string;
  type: string;
  width: number;
  height: number;
  size: number;
  base64: string;
  thumbnail?: string;
}

// ======== Storage Adapter Interfaces ========
export interface IStorageAdapter {
  readonly name: string;
  readonly isSupported: boolean;

  /** حفظ مشروع كامل */
  saveProject(project: LocalProject): Promise<void>;
  /** تحميل مشروع */
  loadProject(projectId: string): Promise<LocalProject | null>;
  /** حذف مشروع */
  deleteProject(projectId: string): Promise<void>;
  /** قائمة كل المشاريع (معلومات فقط بدون بيانات) */
  listProjects(): Promise<ProjectListItem[]>;
  /** هل المشروع موجود؟ */
  hasProject(projectId: string): Promise<boolean>;
}

export interface IFileSystemAdapter extends IStorageAdapter {
  /** اختيار مجلد المشاريع — يطلب إذن المستخدم */
  selectDirectory(): Promise<FileSystemDirectoryHandle | null>;
  /** حفظ مشروع كملف .bsproj في المجلد المختار */
  saveAsFile(project: LocalProject): Promise<void>;
  /** استيراد ملف .bsproj من الجهاز */
  importFromFile(): Promise<LocalProject | null>;
  /** هل تم اختيار مجلد؟ */
  readonly hasDirectory: boolean;
  /** مقبض المجلد المختار */
  readonly directoryHandle: FileSystemDirectoryHandle | null;
}

export interface IDownloadAdapter extends IStorageAdapter {
  /** تحميل مشروع كملف .bsproj */
  downloadProject(project: LocalProject): Promise<void>;
  /** استيراد ملف .bsproj من اختيار المستخدم */
  uploadProject(): Promise<LocalProject | null>;
}

export interface ICloudAdapter extends IStorageAdapter {
  /** مزامنة مشروع محلي مع السحابة */
  syncProject(projectId: string): Promise<SyncResult>;
  /** رفع كل المشاريع المحلية */
  syncAll(): Promise<SyncResult[]>;
  /** تحميل مشروع من السحابة */
  pullProject(projectId: string): Promise<LocalProject | null>;
  /** هل المستخدم متصل؟ */
  readonly isOnline: boolean;
}

// ======== Local Project Structure ========
export interface LocalProject {
  /** معرف فريد */
  id: string;
  /** معرف المستخدم */
  userId: string;
  /** اسم المشروع */
  name: string;
  /** هل هو المشروع الحالي */
  isCurrent: boolean;
  /** بيانات الأقسام */
  data: Record<ProjectSection, Record<string, unknown>>;
  /** الصور المضغوطة */
  images: Record<string, CompressedImage[]>;
  /** وقت الإنشاء */
  createdAt: string;
  /** وقت آخر تحديث */
  updatedAt: string;
  /** وقت آخر حفظ محلي */
  lastSavedAt: string | null;
  /** وقت آخر مزامنة سحابية */
  lastSyncedAt: string | null;
  /** هل تم تعديله بعد آخر مزامنة */
  isDirty: boolean;
}

export interface ProjectListItem {
  id: string;
  name: string;
  isCurrent: boolean;
  updatedAt: string;
  lastSavedAt: string | null;
  lastSyncedAt: string | null;
  isDirty: boolean;
  sizeBytes?: number;
}

// ======== Sync Types ========
export interface SyncResult {
  projectId: string;
  projectName: string;
  success: boolean;
  action: 'upload' | 'download' | 'conflict' | 'none';
  message?: string;
  timestamp: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

// ======== Connection Status ========
export type ConnectionStatus = 'online' | 'offline' | 'checking';

// ======== Storage Stats ========
export interface StorageStats {
  totalProjects: number;
  totalSizeBytes: number;
  imagesSizeBytes: number;
  dataSizeBytes: number;
  oldestProject?: string;
  newestProject?: string;
  maxProjects: number;
}

// ======== Save Options ========
export interface SaveOptions {
  /** حفظ في IndexedDB (محلي دائماً) */
  local?: boolean;
  /** حفظ كملف .bsproj (File System API أو تحميل) */
  asFile?: boolean;
  /** حفظ سحابي (يحتاج صلاحية) */
  cloud?: boolean;
  /** ضغط الصور قبل الحفظ */
  compressImages?: boolean;
  /** قسم محدد فقط (بدل المشروع كامل) */
  section?: ProjectSection;
}

// ======== User Cloud Permission ========
export interface UserCloudPermission {
  userId: string;
  cloudSyncEnabled: boolean;
  grantedBy?: string; // admin userId
  grantedAt?: string;
}
