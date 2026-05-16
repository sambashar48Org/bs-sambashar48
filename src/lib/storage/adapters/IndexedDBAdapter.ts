/**
 * B.S Evaluation — IndexedDB Storage Adapter
 * محول التخزين المحلي باستخدام IndexedDB
 * سعة أكبر من localStorage، يدعم الصور والبيانات الكبيرة
 */

import {
  PROJECT_SECTIONS,
} from '../types/storage.types';
import type {
  IStorageAdapter,
  LocalProject,
  ProjectListItem,
  CompressedImage,
  ProjectSection,
  StorageStats,
} from '../types/storage.types';

const DB_NAME = 'bs-evaluation-db';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_IMAGES = 'images';
const STORE_META = 'meta';
const MAX_PROJECTS = 50;

export class IndexedDBAdapter implements IStorageAdapter {
  readonly name = 'IndexedDB';
  private db: IDBDatabase | null = null;

  get isSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  // ======== Database Initialization ========
  async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(new Error('فشل فتح قاعدة البيانات المحلية'));

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Projects store — full project data
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          const projectStore = db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
          projectStore.createIndex('userId', 'userId', { unique: false });
          projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          projectStore.createIndex('isCurrent', 'isCurrent', { unique: false });
        }

        // Images store — compressed images per project
        if (!db.objectStoreNames.contains(STORE_IMAGES)) {
          const imageStore = db.createObjectStore(STORE_IMAGES, { keyPath: 'projectId' });
          imageStore.createIndex('projectId', 'projectId', { unique: true });
        }

        // Meta store — general metadata
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
    });
  }

  // ======== IStorageAdapter Implementation ========
  async saveProject(project: LocalProject): Promise<void> {
    const db = await this.getDB();

    // Check project count limit
    const count = await this.countProjects(db);
    const existing = await this.getProjectRaw(db, project.id);

    if (!existing && count >= MAX_PROJECTS) {
      throw new Error(`تم بلوغ الحد الأقصى للمشاريع (${MAX_PROJECTS}). يرجى حذف مشاريع قديمة لتحرير مساحة.`);
    }

    const updatedProject: LocalProject = {
      ...project,
      lastSavedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readwrite');
      const store = tx.objectStore(STORE_PROJECTS);
      const request = store.put(updatedProject);

      request.onerror = () => reject(new Error('فشل حفظ المشروع محلياً'));
      request.onsuccess = () => resolve();
    });
  }

  async loadProject(projectId: string): Promise<LocalProject | null> {
    const db = await this.getDB();
    return this.getProjectRaw(db, projectId);
  }

  async deleteProject(projectId: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_PROJECTS, STORE_IMAGES], 'readwrite');

      // Delete project data
      tx.objectStore(STORE_PROJECTS).delete(projectId);
      // Delete associated images
      tx.objectStore(STORE_IMAGES).delete(projectId);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('فشل حذف المشروع محلياً'));
    });
  }

  async listProjects(): Promise<ProjectListItem[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const request = store.getAll();

      request.onerror = () => reject(new Error('فشل جلب قائمة المشاريع'));
      request.onsuccess = () => {
        const projects: LocalProject[] = request.result || [];
        const items: ProjectListItem[] = projects
          .map((p) => this.toListItem(p))
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        resolve(items);
      };
    });
  }

  async hasProject(projectId: string): Promise<boolean> {
    const project = await this.loadProject(projectId);
    return project !== null;
  }

  // ======== Section-level Operations ========
  async saveSection(projectId: string, section: ProjectSection, data: Record<string, unknown>): Promise<void> {
    const project = await this.loadProject(projectId);
    if (!project) {
      // Create a minimal project if it doesn't exist
      const newProject: LocalProject = {
        id: projectId,
        userId: '',
        name: 'مشروع جديد',
        isCurrent: true,
        data: this.emptyProjectData(),
        images: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastSavedAt: null,
        lastSyncedAt: null,
        isDirty: true,
      };
      newProject.data[section] = data;
      await this.saveProject(newProject);
      return;
    }

    project.data[section] = { ...project.data[section], ...data };
    project.isDirty = true;
    await this.saveProject(project);
  }

  async loadSection(projectId: string, section: ProjectSection): Promise<Record<string, unknown>> {
    const project = await this.loadProject(projectId);
    return project?.data[section] || {};
  }

  // ======== Image Operations ========
  async saveImages(projectId: string, section: string, images: CompressedImage[]): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_IMAGES, 'readwrite');
      const store = tx.objectStore(STORE_IMAGES);

      const request = store.get(projectId);
      request.onsuccess = () => {
        const existing = request.result || { projectId, images: {} };
        existing.images[section] = images;
        store.put(existing);
      };
      request.onerror = () => reject(new Error('فشل حفظ الصور'));

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('فشل حفظ الصور'));
    });
  }

  async loadImages(projectId: string, section: string): Promise<CompressedImage[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_IMAGES, 'readonly');
      const store = tx.objectStore(STORE_IMAGES);
      const request = store.get(projectId);

      request.onerror = () => reject(new Error('فشل تحميل الصور'));
      request.onsuccess = () => {
        const data = request.result;
        resolve(data?.images?.[section] || []);
      };
    });
  }

  // ======== Storage Stats ========
  async getStorageStats(): Promise<StorageStats> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const request = store.getAll();

      request.onerror = () => reject(new Error('فشل حساب حجم التخزين'));
      request.onsuccess = () => {
        const projects: LocalProject[] = request.result || [];
        let totalSize = 0;
        let imagesSize = 0;
        let dataSize = 0;
        let oldest: string | undefined;
        let newest: string | undefined;

        for (const p of projects) {
          const jsonSize = new Blob([JSON.stringify(p.data)]).size;
          const imgSize = Object.values(p.images || {})
            .flat()
            .reduce((sum, img) => sum + (img.size || 0), 0);
          dataSize += jsonSize;
          imagesSize += imgSize;
          totalSize += jsonSize + imgSize;

          if (!oldest || p.createdAt < oldest) oldest = p.createdAt;
          if (!newest || p.updatedAt > newest) newest = p.updatedAt;
        }

        resolve({
          totalProjects: projects.length,
          totalSizeBytes: totalSize,
          imagesSizeBytes: imagesSize,
          dataSizeBytes: dataSize,
          oldestProject: oldest,
          newestProject: newest,
          maxProjects: MAX_PROJECTS,
        });
      };
    });
  }

  // ======== Clear All Data ========
  async clearAll(): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_PROJECTS, STORE_IMAGES, STORE_META], 'readwrite');
      tx.objectStore(STORE_PROJECTS).clear();
      tx.objectStore(STORE_IMAGES).clear();
      tx.objectStore(STORE_META).clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('فشل تنظيف البيانات'));
    });
  }

  // ======== Set Current Project ========
  async setCurrentProject(projectId: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readwrite');
      const store = tx.objectStore(STORE_PROJECTS);
      const request = store.getAll();

      request.onerror = () => reject(new Error('فشل تحديث المشروع الحالي'));
      request.onsuccess = () => {
        const projects: LocalProject[] = request.result || [];
        for (const p of projects) {
          const shouldUpdate = p.id === projectId ? true : p.isCurrent ? false : undefined;
          if (shouldUpdate !== undefined) {
            p.isCurrent = shouldUpdate;
            store.put(p);
          }
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('فشل تحديث المشروع الحالي'));
    });
  }

  // ======== Private Helpers ========
  private async getProjectRaw(db: IDBDatabase, projectId: string): Promise<LocalProject | null> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const request = store.get(projectId);

      request.onerror = () => reject(new Error('فشل تحميل المشروع'));
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  private async countProjects(db: IDBDatabase): Promise<number> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const request = store.count();

      request.onerror = () => reject(new Error('فشل عد المشاريع'));
      request.onsuccess = () => resolve(request.result);
    });
  }

  private toListItem(p: LocalProject): ProjectListItem {
    return {
      id: p.id,
      name: p.name,
      isCurrent: p.isCurrent,
      updatedAt: p.updatedAt,
      lastSavedAt: p.lastSavedAt,
      lastSyncedAt: p.lastSyncedAt,
      isDirty: p.isDirty,
    };
  }

  private emptyProjectData(): Record<ProjectSection, Record<string, unknown>> {
    const data: Record<string, Record<string, unknown>> = {};
    for (const section of PROJECT_SECTIONS) {
      data[section] = {};
    }
    return data as Record<ProjectSection, Record<string, unknown>>;
  }
}

// Singleton
export const indexedDBAdapter = new IndexedDBAdapter();
