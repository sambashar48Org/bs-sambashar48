/**
 * B.S Evaluation — Project Serializer
 * تحويل بيانات المشروع إلى ملف .bsproj والعكس
 * ملف .bsproj = JSON مضغوط (GZIP عبر CompressionStream) يحتوي كل البيانات + الصور
 *
 * نظام مزدوج:
 * - مسار A: File System API (Chrome فقط) → حفظ مباشر في مجلد
 * - مسار B: Download/Upload (كل المتصفحات) → تحميل/رفع ملف .bsproj
 */

import type { BSProjectFile, LocalProject, ProjectSection } from '../types/storage.types';
import { PROJECT_SECTIONS } from '../types/storage.types';

const FILE_FORMAT = 'bsproj';
const FILE_VERSION = 2; // v2: ضغط حقيقي

export class ProjectSerializer {
  /**
   * تحويل مشروع محلي إلى Blob مضغوط (.bsproj)
   * يستخدم CompressionStream (GZIP) في Chrome/Firefox
   * يُرجع Blob بدلاً من string لدعم الضغط الثنائي
   */
  static async serializeToBlob(project: LocalProject): Promise<Blob> {
    const file: BSProjectFile = {
      format: FILE_FORMAT,
      version: FILE_VERSION,
      meta: {
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        appVersion: '1.0.0',
      },
      data: project.data,
      images: Object.keys(project.images).length > 0 ? project.images : undefined,
    };

    const jsonString = JSON.stringify(file);

    // محاولة ضغط GZIP عبر CompressionStream
    if (typeof CompressionStream !== 'undefined') {
      try {
        const cs = new CompressionStream('gzip');
        const writer = cs.writable.getWriter();
        const reader = cs.readable.getReader();

        writer.write(new TextEncoder().encode(jsonString));
        writer.close();

        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }

        // تجميع القطع
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const compressed = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          compressed.set(chunk, offset);
          offset += chunk.length;
        }

        return new Blob([compressed], { type: 'application/octet-stream' });
      } catch {
        // فشل الضغط — نستخدم JSON نصي
      }
    }

    // Fallback: JSON نصي بدون ضغط
    return new Blob([jsonString], { type: 'application/json' });
  }

  /**
   * تحويل مشروع محلي إلى سلسلة JSON (للتوافق مع النظام القديم)
   */
  static serialize(project: LocalProject): string {
    const file: BSProjectFile = {
      format: FILE_FORMAT,
      version: FILE_VERSION,
      meta: {
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        appVersion: '1.0.0',
      },
      data: project.data,
      images: Object.keys(project.images).length > 0 ? project.images : undefined,
    };

    return JSON.stringify(file);
  }

  /**
   * تحويل ملف .bsproj (مضغوط أو نصي) إلى مشروع محلي
   * يدعم كلاً من GZIP و JSON النصي
   */
  static async deserializeFromBlob(blob: Blob): Promise<LocalProject> {
    // محاولة فك ضغط GZIP
    if (typeof DecompressionStream !== 'undefined' && blob.type === 'application/octet-stream') {
      try {
        const ds = new DecompressionStream('gzip');
        const writer = ds.writable.getWriter();
        const reader = ds.readable.getReader();

        writer.write(await blob.arrayBuffer());
        writer.close();

        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }

        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const decompressed = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          decompressed.set(chunk, offset);
          offset += chunk.length;
        }

        const jsonString = new TextDecoder().decode(decompressed);
        return this.parseProject(jsonString);
      } catch {
        // فشل فك الضغط — نحاول كـ JSON نصي
      }
    }

    // Fallback: قراءة كـ JSON نصي
    const text = await blob.text();
    return this.parseProject(text);
  }

  /**
   * تحويل سلسلة .bsproj إلى مشروع محلي (للتوافق مع النظام القديم)
   */
  static deserialize(content: string): LocalProject {
    return this.parseProject(content);
  }

  /**
   * تحليل محتوى .bsproj JSON
   */
  private static parseProject(content: string): LocalProject {
    try {
      const file: BSProjectFile = JSON.parse(content);

      if (file.format !== FILE_FORMAT) {
        throw new Error('صيغة الملف غير مدعومة');
      }

      if (file.version > FILE_VERSION) {
        console.warn(`إصدار الملف (${file.version}) أحدث من المدعوم (${FILE_VERSION})`);
      }

      const data: Record<string, Record<string, unknown>> = {};
      for (const section of PROJECT_SECTIONS) {
        data[section] = file.data?.[section] || {};
      }

      return {
        id: this.generateId(),
        userId: '',
        name: file.meta?.name || 'مشروع بدون اسم',
        isCurrent: false,
        data: data as Record<ProjectSection, Record<string, unknown>>,
        images: file.images || {},
        createdAt: file.meta?.createdAt || new Date().toISOString(),
        updatedAt: file.meta?.updatedAt || new Date().toISOString(),
        lastSavedAt: new Date().toISOString(),
        lastSyncedAt: null,
        isDirty: false,
      };
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new Error('الملف تالف أو ليس بصيغة .bsproj صالحة');
      }
      throw err;
    }
  }

  /**
   * تحويل مشروع إلى كائن JSON قابل للتحميل (للتوافق مع النظام القديم)
   */
  static toLegacyFormat(project: LocalProject): Record<string, unknown> {
    return {
      project: {
        id: project.id,
        name: project.name,
        is_current: project.isCurrent,
        created_at: project.createdAt,
        updated_at: project.updatedAt,
      },
      projectData: project.data,
      savedAt: new Date().toISOString(),
    };
  }

  /**
   * استيراد من صيغة JSON القديمة
   */
  static fromLegacyFormat(legacy: Record<string, unknown>): LocalProject {
    const project = legacy.project as Record<string, unknown> || {};
    const projectData = legacy.projectData as Record<string, Record<string, unknown>> || {};

    const data: Record<string, Record<string, unknown>> = {};
    for (const section of PROJECT_SECTIONS) {
      data[section] = projectData[section] || {};
    }

    return {
      id: (project.id as string) || this.generateId(),
      userId: '',
      name: (project.name as string) || 'مشروع مستورد',
      isCurrent: false,
      data: data as Record<ProjectSection, Record<string, unknown>>,
      images: {},
      createdAt: (project.created_at as string) || new Date().toISOString(),
      updatedAt: (project.updated_at as string) || new Date().toISOString(),
      lastSavedAt: legacy.savedAt as string || new Date().toISOString(),
      lastSyncedAt: null,
      isDirty: false,
    };
  }

  /**
   * إنشاء معرف فريد
   */
  static generateId(): string {
    return `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * حساب الحجم التقريبي للمشروع بعد التسلسل
   */
  static estimateSize(project: LocalProject): number {
    return new Blob([this.serialize(project)]).size;
  }

  /**
   * الكشف عن دعم File System Access API
   */
  static supportsFileSystemAPI(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  }
}
