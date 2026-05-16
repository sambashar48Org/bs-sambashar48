/**
 * B.S Evaluation — Download/Upload Adapter
 * محول التحميل والرفع — يعمل على كل المتصفحات
 * بديل لـ File System API في Safari/Firefox/المتصفحات القديمة
 */

import type {
  IDownloadAdapter,
  LocalProject,
  ProjectListItem,
} from '../types/storage.types';
import { ProjectSerializer } from '../services/ProjectSerializer';

export class DownloadAdapter implements IDownloadAdapter {
  readonly name = 'Download';

  get isSupported(): boolean {
    return typeof window !== 'undefined' && 'Blob' in window;
  }

  // ======== Download Project as .bsproj File ========
  async downloadProject(project: LocalProject): Promise<void> {
    const fileName = this.sanitizeFileName(project.name) + '.bsproj';

    try {
      // استخدام الضغط الحقيقي (GZIP) عبر serializeToBlob
      const blob = await ProjectSerializer.serializeToBlob(project);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch {
      throw new Error('فشل تحميل الملف');
    }
  }

  // ======== Upload/Import .bsproj File ========
  async uploadProject(): Promise<LocalProject | null> {
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
          // استخدام deserializeFromBlob لدعم الملفات المضغوطة والنصية
          const project = await ProjectSerializer.deserializeFromBlob(file);
          resolve(project);
        } catch {
          reject(new Error('فشل قراءة الملف. تأكد من أنه ملف .bsproj صالح.'));
        }
      };

      input.oncancel = () => resolve(null);
      input.click();
    });
  }

  // ======== IStorageAdapter Stubs (Download adapter doesn't persist) ========
  async saveProject(project: LocalProject): Promise<void> {
    await this.downloadProject(project);
  }

  async loadProject(_projectId: string): Promise<LocalProject | null> {
    // Download adapter doesn't manage local state — use import
    return null;
  }

  async deleteProject(_projectId: string): Promise<void> {
    // Download adapter doesn't manage local files — only IndexedDB does
  }

  async listProjects(): Promise<ProjectListItem[]> {
    // Download adapter doesn't track saved files
    return [];
  }

  async hasProject(_projectId: string): Promise<boolean> {
    return false;
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
export const downloadAdapter = new DownloadAdapter();
