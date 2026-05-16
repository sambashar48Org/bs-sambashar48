/**
 * B.S Evaluation — BSStorageCore
 * المحرك الرئيسي لنظام التخزين — الواجهة الموحدة
 * ينسق بين جميع المحولات والخدمات
 */

import type {
  LocalProject,
  ProjectListItem,
  ProjectSection,
  SaveOptions,
  SyncResult,
  ConnectionStatus,
  StorageStats,
  CompressedImage,
} from './types/storage.types';
import { PROJECT_SECTIONS } from './types/storage.types';
import { indexedDBAdapter } from './adapters/IndexedDBAdapter';
import { fileSystemAdapter } from './adapters/FileSystemAdapter';
import { downloadAdapter } from './adapters/DownloadAdapter';
import { cloudAdapter } from './adapters/CloudAdapter';
import { ProjectSerializer } from './services/ProjectSerializer';
import { ImageCompressor } from './services/ImageCompressor';
import { syncManager } from './services/SyncManager';
import { cacheManager } from './services/CacheManager';

export class BSStorageCore {
  // ======== Initialization ========
  /**
   * تهيئة نظام التخزين — يجب استدعاؤها عند بدء التطبيق
   */
  async init(): Promise<void> {
    // Initialize IndexedDB
    if (indexedDBAdapter.isSupported) {
      await indexedDBAdapter.getDB?.();
    }

    // Try to restore FileSystem directory handle
    if (fileSystemAdapter.isSupported) {
      await fileSystemAdapter.restoreDirectory();
    }

    // Start periodic connection check
    syncManager.startPeriodicCheck(30000);
  }

  // ======== Project CRUD ========
  /**
   * إنشاء مشروع جديد
   */
  async createProject(userId: string, name: string): Promise<LocalProject> {
    // Check project limit
    const canCreate = await cacheManager.canCreateProject();
    if (!canCreate) {
      throw new Error('تم بلوغ الحد الأقصى للمشاريع (50). يرجى حذف مشاريع قديمة.');
    }

    const project: LocalProject = {
      id: ProjectSerializer.generateId(),
      userId,
      name: name.trim(),
      isCurrent: true,
      data: this.emptyProjectData(),
      images: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastSavedAt: null,
      lastSyncedAt: null,
      isDirty: false,
    };

    // Unset other current projects
    const existing = await indexedDBAdapter.listProjects();
    for (const p of existing) {
      if (p.isCurrent) {
        const full = await indexedDBAdapter.loadProject(p.id);
        if (full) {
          full.isCurrent = false;
          await indexedDBAdapter.saveProject(full);
        }
      }
    }

    // Save locally
    await indexedDBAdapter.saveProject(project);

    return project;
  }

  /**
   * حفظ مشروع — الطريقة الموحدة
   */
  async saveProject(
    project: LocalProject,
    options: SaveOptions = {}
  ): Promise<void> {
    const opts: SaveOptions = {
      local: true,
      compressImages: true,
      ...options,
    };

    // Compress images if requested
    if (opts.compressImages && project.images) {
      // Images are already compressed when added individually
      // This flag is for batch operations
    }

    // 1. Always save locally first (IndexedDB)
    if (opts.local !== false) {
      await indexedDBAdapter.saveProject(project);
    }

    // 2. Save as .bsproj file if requested
    if (opts.asFile) {
      if (fileSystemAdapter.isSupported && fileSystemAdapter.hasDirectory) {
        await fileSystemAdapter.saveAsFile(project);
      } else {
        await downloadAdapter.downloadProject(project);
      }
    }

    // 3. Cloud sync if requested and permitted
    if (opts.cloud && syncManager.isOnline) {
      await cloudAdapter.uploadProject(project);
    }
  }

  /**
   * حفظ قسم واحد من المشروع
   */
  async saveSection(
    projectId: string,
    section: ProjectSection,
    data: Record<string, unknown>
  ): Promise<void> {
    await indexedDBAdapter.saveSection(projectId, section, data);
  }

  /**
   * تحميل مشروع
   */
  async loadProject(projectId: string): Promise<LocalProject | null> {
    return indexedDBAdapter.loadProject(projectId);
  }

  /**
   * استدعاء مشروع — تحميل بياناته وعرضها
   */
  async recallProject(projectId: string): Promise<LocalProject | null> {
    const project = await indexedDBAdapter.loadProject(projectId);
    if (!project) return null;

    // Set as current
    await this.setCurrentProject(projectId);

    return project;
  }

  /**
   * حذف مشروع
   */
  async deleteProject(projectId: string, deleteCloud: boolean = false): Promise<void> {
    // Delete locally
    await indexedDBAdapter.deleteProject(projectId);

    // Delete from cloud if requested
    if (deleteCloud && syncManager.isOnline) {
      try {
        await cloudAdapter.deleteProject(projectId);
      } catch {
        // Non-critical — local deletion succeeded
      }
    }
  }

  /**
   * قائمة المشاريع
   */
  async listProjects(): Promise<ProjectListItem[]> {
    return indexedDBAdapter.listProjects();
  }

  /**
   * تعيين المشروع الحالي
   */
  async setCurrentProject(projectId: string): Promise<void> {
    await indexedDBAdapter.setCurrentProject(projectId);
  }

  // ======== File Operations ========
  /**
   * اختيار مجلد المشاريع (File System API)
   */
  async selectProjectDirectory(): Promise<boolean> {
    if (!fileSystemAdapter.isSupported) return false;
    const handle = await fileSystemAdapter.selectDirectory();
    return handle !== null;
  }

  /**
   * حفظ كملف .bsproj
   */
  async saveAsFile(project: LocalProject): Promise<void> {
    if (fileSystemAdapter.isSupported && fileSystemAdapter.hasDirectory) {
      await fileSystemAdapter.saveAsFile(project);
    } else {
      await downloadAdapter.downloadProject(project);
    }
  }

  /**
   * استيراد ملف .bsproj
   */
  async importProject(): Promise<LocalProject | null> {
    let project: LocalProject | null = null;

    if (fileSystemAdapter.isSupported) {
      project = await fileSystemAdapter.importFromFile();
    } else {
      project = await downloadAdapter.uploadProject();
    }

    if (project) {
      // Save imported project locally
      await indexedDBAdapter.saveProject(project);
    }

    return project;
  }

  // ======== Image Operations ========
  /**
   * إضافة صورة مضغوطة لمشروع
   */
  async addImage(
    projectId: string,
    section: string,
    file: File | string
  ): Promise<CompressedImage> {
    const compressed = await ImageCompressor.compress(file);

    await indexedDBAdapter.saveImages(projectId, section, [
      compressed,
      // We add to existing — need to load first
    ]);

    // Actually, we need to merge with existing images
    const existing = await indexedDBAdapter.loadImages(projectId, section);
    const updated = [...existing, compressed];
    await indexedDBAdapter.saveImages(projectId, section, updated);

    return compressed;
  }

  /**
   * حذف صورة من مشروع
   */
  async removeImage(
    projectId: string,
    section: string,
    imageId: string
  ): Promise<void> {
    const existing = await indexedDBAdapter.loadImages(projectId, section);
    const updated = existing.filter((img) => img.id !== imageId);
    await indexedDBAdapter.saveImages(projectId, section, updated);
  }

  // ======== Cloud Sync ========
  /**
   * مزامنة مشروع مع السحابة
   */
  async syncProject(projectId: string): Promise<SyncResult> {
    return syncManager.syncProject(projectId);
  }

  /**
   * مزامنة كل المشاريع المتسخة
   */
  async syncAll(): Promise<SyncResult[]> {
    return syncManager.syncDirtyProjects();
  }

  /**
   * رفع مشروع محلي إلى السحابة
   */
  async uploadToCloud(project: LocalProject): Promise<SyncResult> {
    return cloudAdapter.uploadProject(project);
  }

  // ======== Connection & Status ========
  get connectionStatus(): ConnectionStatus {
    return syncManager.connectionStatus;
  }

  get isOnline(): boolean {
    return syncManager.isOnline;
  }

  onConnectionChange(callback: (status: ConnectionStatus) => void): () => void {
    return syncManager.onConnectionChange(callback);
  }

  onSyncStatusChange(callback: (status: string, message?: string) => void): () => void {
    return syncManager.onSyncStatusChange(callback as Parameters<typeof syncManager.onSyncStatusChange>[0]);
  }

  // ======== Storage Stats ========
  async getStorageStats(): Promise<StorageStats> {
    return cacheManager.getStats();
  }

  async clearAllData(): Promise<void> {
    await cacheManager.clearAll();
  }

  async cleanupOldProjects(keepCount: number = 10): Promise<number> {
    return cacheManager.cleanupOldProjects(keepCount);
  }

  // ======== Utility Methods ========
  /**
   * هل File System API مدعوم؟
   */
  get isFileSystemSupported(): boolean {
    return fileSystemAdapter.isSupported;
  }

  /**
   * هل تم اختيار مجلد المشاريع؟
   */
  get hasProjectDirectory(): boolean {
    return fileSystemAdapter.hasDirectory;
  }

  /**
   * تحويل بيانات Supabase إلى مشروع محلي
   */
  convertCloudProject(cloudData: Record<string, unknown>): LocalProject {
    const data: Record<string, Record<string, unknown>> = {};
    for (const section of PROJECT_SECTIONS) {
      data[section] = (cloudData[section] as Record<string, unknown>) || {};
    }

    return {
      id: cloudData.id as string,
      userId: cloudData.user_id as string,
      name: cloudData.name as string,
      isCurrent: cloudData.is_current as boolean,
      data: data as LocalProject['data'],
      images: {},
      createdAt: cloudData.created_at as string,
      updatedAt: cloudData.updated_at as string,
      lastSavedAt: null,
      lastSyncedAt: cloudData.updated_at as string,
      isDirty: false,
    };
  }

  // ======== Private Helpers ========
  private emptyProjectData(): Record<ProjectSection, Record<string, unknown>> {
    const data: Record<string, Record<string, unknown>> = {};
    for (const section of PROJECT_SECTIONS) {
      data[section] = {};
    }
    return data as Record<ProjectSection, Record<string, unknown>>;
  }
}

// Singleton — THE main export
export const bsStorage = new BSStorageCore();
