/**
 * B.S Evaluation — File System Access API Adapter
 * محول نظام الملفات — يعمل على Chrome (جوال + كمبيوتر)
 * يسمح بإنشاء ملفات .bsproj مباشرة في مجلد المستخدم
 */

import type {
  IFileSystemAdapter,
  LocalProject,
  ProjectListItem,
} from '../types/storage.types';
import { ProjectSerializer } from '../services/ProjectSerializer';

export class FileSystemAdapter implements IFileSystemAdapter {
  readonly name = 'FileSystem';
  private _directoryHandle: FileSystemDirectoryHandle | null = null;
  private _isSupported: boolean;

  constructor() {
    this._isSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  }

  get isSupported(): boolean {
    return this._isSupported;
  }

  get hasDirectory(): boolean {
    return this._directoryHandle !== null;
  }

  get directoryHandle(): FileSystemDirectoryHandle | null {
    return this._directoryHandle;
  }

  // ======== Directory Selection ========
  async selectDirectory(): Promise<FileSystemDirectoryHandle | null> {
    if (!this.isSupported) {
      console.warn('File System Access API غير مدعوم في هذا المتصفح');
      return null;
    }

    try {
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents',
      });

      // Verify permission
      const permission = await handle.requestPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        console.warn('لم يتم منح إذن الكتابة للمجلد');
        return null;
      }

      this._directoryHandle = handle;

      // Persist the handle in IndexedDB for later use
      await this.persistHandle(handle);

      return handle;
    } catch (err: unknown) {
      // User cancelled or denied
      if (err instanceof Error && err.name === 'AbortError') {
        return null;
      }
      console.error('خطأ في اختيار المجلد:', err);
      return null;
    }
  }

  // ======== Restore Persisted Directory ========
  async restoreDirectory(): Promise<FileSystemDirectoryHandle | null> {
    if (!this.isSupported) return null;

    try {
      const handle = await this.getPersistedHandle();
      if (!handle) return null;

      // Verify permission (may prompt user)
      const permission = await handle.requestPermission({ mode: 'readwrite' });
      if (permission === 'granted') {
        this._directoryHandle = handle;
        return handle;
      }
      return null;
    } catch {
      return null;
    }
  }

  // ======== Save as .bsproj File ========
  async saveAsFile(project: LocalProject): Promise<void> {
    const dirHandle = this._directoryHandle || await this.restoreDirectory();
    if (!dirHandle) {
      throw new Error('لم يتم اختيار مجلد المشاريع بعد. يرجى اختيار مجلد أولاً.');
    }

    const serialized = ProjectSerializer.serialize(project);
    const fileName = this.sanitizeFileName(project.name) + '.bsproj';

    try {
      const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(serialized);
      await writable.close();
    } catch (err) {
      throw new Error('فشل حفظ الملف. تأكد من أن المجلد متاح ولديك صلاحية الكتابة.');
    }
  }

  // ======== Import from .bsproj File ========
  async importFromFile(): Promise<LocalProject | null> {
    if (!this.isSupported) {
      return this.importViaInput();
    }

    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'ملفات B.S Evaluation',
          accept: { 'application/json': ['.bsproj'] },
        }],
        multiple: false,
      });

      const file = await fileHandle.getFile();
      const content = await file.text();
      return ProjectSerializer.deserialize(content);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return null;
      throw new Error('فشل استيراد الملف');
    }
  }

  // ======== Fallback: Import via <input> ========
  private async importViaInput(): Promise<LocalProject | null> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.bsproj,.json';

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        try {
          const content = await file.text();
          const project = ProjectSerializer.deserialize(content);
          resolve(project);
        } catch {
          reject(new Error('فشل قراءة الملف. تأكد من أنه ملف .bsproj صالح.'));
        }
      };

      input.oncancel = () => resolve(null);
      input.click();
    });
  }

  // ======== List Projects in Directory ========
  async listProjects(): Promise<ProjectListItem[]> {
    const dirHandle = this._directoryHandle || await this.restoreDirectory();
    if (!dirHandle) return [];

    const items: ProjectListItem[] = [];

    try {
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.bsproj')) {
          const file = await entry.getFile();
          const content = await file.text();
          try {
            const project = ProjectSerializer.deserialize(content);
            items.push({
              id: project.id,
              name: project.name,
              isCurrent: project.isCurrent,
              updatedAt: project.updatedAt,
              lastSavedAt: project.lastSavedAt,
              lastSyncedAt: project.lastSyncedAt,
              isDirty: project.isDirty,
              sizeBytes: file.size,
            });
          } catch {
            // Skip corrupted files
          }
        }
      }
    } catch {
      // Directory not accessible
    }

    return items;
  }

  // ======== IStorageAdapter Stubs (delegated to IndexedDB) ========
  async saveProject(project: LocalProject): Promise<void> {
    await this.saveAsFile(project);
  }

  async loadProject(projectId: string): Promise<LocalProject | null> {
    const dirHandle = this._directoryHandle || await this.restoreDirectory();
    if (!dirHandle) return null;

    try {
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.bsproj')) {
          const file = await entry.getFile();
          const content = await file.text();
          const project = ProjectSerializer.deserialize(content);
          if (project.id === projectId) return project;
        }
      }
    } catch {
      // Directory not accessible
    }

    return null;
  }

  async deleteProject(projectId: string): Promise<void> {
    const dirHandle = this._directoryHandle || await this.restoreDirectory();
    if (!dirHandle) return;

    try {
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.bsproj')) {
          const file = await entry.getFile();
          const content = await file.text();
          const project = ProjectSerializer.deserialize(content);
          if (project.id === projectId) {
            await dirHandle.removeEntry(entry.name);
            return;
          }
        }
      }
    } catch {
      throw new Error('فشل حذف الملف');
    }
  }

  async hasProject(projectId: string): Promise<boolean> {
    const project = await this.loadProject(projectId);
    return project !== null;
  }

  // ======== Persist/Restore Handle ========
  private async persistHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    try {
      const db = await this.getHandleDB();
      const tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').put({ key: 'projectDirectory', handle });
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Non-critical — handle will need to be re-selected
    }
  }

  private async getPersistedHandle(): Promise<FileSystemDirectoryHandle | null> {
    try {
      const db = await this.getHandleDB();
      const tx = db.transaction('handles', 'readonly');
      const request = tx.objectStore('handles').get('projectDirectory');

      return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result?.handle || null);
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  private handleDB: IDBDatabase | null = null;
  private async getHandleDB(): Promise<IDBDatabase> {
    if (this.handleDB) return this.handleDB;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('bs-fs-handles', 1);
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('handles')) {
          db.createObjectStore('handles', { keyPath: 'key' });
        }
      };
      request.onsuccess = () => {
        this.handleDB = request.result;
        resolve(this.handleDB);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ======== Helpers ========
  private sanitizeFileName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 100);
  }
}

// Singleton
export const fileSystemAdapter = new FileSystemAdapter();
