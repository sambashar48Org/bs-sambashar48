/**
 * B.S Evaluation — Cloud Storage Adapter
 * محول التخزين السحابي — Supabase
 * متاح فقط للمدير والمستخدمين المصرح لهم
 */

import type {
  ICloudAdapter,
  LocalProject,
  ProjectListItem,
  SyncResult,
  ProjectSection,
} from '../types/storage.types';

const API_BASE = '/api/projects';

export class CloudAdapter implements ICloudAdapter {
  readonly name = 'Cloud';
  private _isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;

  get isSupported(): boolean {
    return typeof fetch !== 'undefined';
  }

  get isOnline(): boolean {
    return this._isOnline;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => { this._isOnline = true; });
      window.addEventListener('offline', () => { this._isOnline = false; });
    }
  }

  // ======== Sync Single Project ========
  async syncProject(projectId: string): Promise<SyncResult> {
    const timestamp = new Date().toISOString();

    if (!this._isOnline) {
      return {
        projectId,
        projectName: '',
        success: false,
        action: 'none',
        message: 'لا يوجد اتصال بالإنترنت',
        timestamp,
      };
    }

    try {
      // Try to upload local data to cloud
      const localData = await this.getLocalProjectData(projectId);
      if (!localData) {
        // No local data — try to pull from cloud
        const pulled = await this.pullProject(projectId);
        if (pulled) {
          return {
            projectId,
            projectName: pulled.name,
            success: true,
            action: 'download',
            message: 'تم تحميل المشروع من السحابة',
            timestamp,
          };
        }
        return {
          projectId,
          projectName: '',
          success: false,
          action: 'none',
          message: 'المشروع غير موجود محلياً ولا سحابياً',
          timestamp,
        };
      }

      // Upload to cloud
      const response = await fetch(`${API_BASE}/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(localData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'فشل المزامنة' })) as { error?: string };
        return {
          projectId,
          projectName: String(localData.name || ''),
          success: false,
          action: 'none',
          message: errorData.error || 'فشل الرفع إلى السحابة',
          timestamp,
        };
      }

      return {
        projectId,
        projectName: String(localData.name || ''),
        success: true,
        action: 'upload',
        message: 'تم حفظ المشروع في السحابة بنجاح',
        timestamp,
      };
    } catch (err) {
      return {
        projectId,
        projectName: '',
        success: false,
        action: 'none',
        message: err instanceof Error ? err.message : 'خطأ غير متوقع',
        timestamp,
      };
    }
  }

  // ======== Sync All Projects ========
  async syncAll(): Promise<SyncResult[]> {
    if (!this._isOnline) return [];

    try {
      const projects = await this.listProjects();
      const results: SyncResult[] = [];

      for (const project of projects) {
        const result = await this.syncProject(project.id);
        results.push(result);
      }

      return results;
    } catch {
      return [];
    }
  }

  // ======== Pull Project from Cloud ========
  async pullProject(projectId: string): Promise<LocalProject | null> {
    if (!this._isOnline) return null;

    try {
      const response = await fetch(`${API_BASE}/${projectId}`, {
        credentials: 'include',
      });

      if (!response.ok) return null;

      const data = await response.json();
      return this.cloudToLocalProject(data);
    } catch {
      return null;
    }
  }

  // ======== Upload Project to Cloud ========
  async uploadProject(project: LocalProject): Promise<SyncResult> {
    const timestamp = new Date().toISOString();

    if (!this._isOnline) {
      return {
        projectId: project.id,
        projectName: project.name,
        success: false,
        action: 'none',
        message: 'لا يوجد اتصال بالإنترنت',
        timestamp,
      };
    }

    try {
      // Build the update payload from project data
      const payload: Record<string, unknown> = {};
      for (const section of Object.keys(project.data) as ProjectSection[]) {
        if (Object.keys(project.data[section]).length > 0) {
          payload[section] = project.data[section];
        }
      }
      payload.name = project.name;
      payload.is_current = project.isCurrent;

      const response = await fetch(`${API_BASE}/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'فشل الرفع' }));
        return {
          projectId: project.id,
          projectName: project.name,
          success: false,
          action: 'none',
          message: errorData.error || 'فشل الرفع إلى السحابة',
          timestamp,
        };
      }

      return {
        projectId: project.id,
        projectName: project.name,
        success: true,
        action: 'upload',
        message: 'تم الحفظ السحابي بنجاح',
        timestamp,
      };
    } catch (err) {
      return {
        projectId: project.id,
        projectName: project.name,
        success: false,
        action: 'none',
        message: err instanceof Error ? err.message : 'خطأ غير متوقع',
        timestamp,
      };
    }
  }

  // ======== IStorageAdapter Implementation ========
  async saveProject(project: LocalProject): Promise<void> {
    const result = await this.uploadProject(project);
    if (!result.success) {
      throw new Error(result.message || 'فشل الحفظ السحابي');
    }
  }

  async loadProject(projectId: string): Promise<LocalProject | null> {
    return this.pullProject(projectId);
  }

  async deleteProject(projectId: string): Promise<void> {
    if (!this._isOnline) throw new Error('لا يوجد اتصال بالإنترنت');

    const response = await fetch(`${API_BASE}/${projectId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'فشل الحذف' }));
      throw new Error(data.error || 'فشل حذف المشروع من السحابة');
    }
  }

  async listProjects(): Promise<ProjectListItem[]> {
    if (!this._isOnline) return [];

    try {
      const response = await fetch(`${API_BASE}?_t=${Date.now()}`, {
        credentials: 'include',
      });

      if (!response.ok) return [];

      const data = await response.json();
      return (data as Array<Record<string, unknown>>).map((p) => ({
        id: p.id as string,
        name: p.name as string,
        isCurrent: p.is_current as boolean,
        updatedAt: p.updated_at as string,
        lastSavedAt: null,
        lastSyncedAt: p.updated_at as string,
        isDirty: false,
      }));
    } catch {
      return [];
    }
  }

  async hasProject(projectId: string): Promise<boolean> {
    const project = await this.pullProject(projectId);
    return project !== null;
  }

  // ======== Private Helpers ========
  private async getLocalProjectData(projectId: string): Promise<Record<string, unknown> | null> {
    try {
      const response = await fetch(`${API_BASE}/${projectId}`, {
        credentials: 'include',
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  private cloudToLocalProject(cloudData: Record<string, unknown>): LocalProject {
    const data: Record<string, Record<string, unknown>> = {};
    const sectionKeys = [
      'building_data', 'architectural_report', 'structural_report',
      'foundations', 'columns_walls', 'beam_slab',
      'electrical', 'plumbing', 'technical_notes', 'final_report',
    ];

    for (const key of sectionKeys) {
      data[key] = (cloudData[key] as Record<string, unknown>) || {};
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
}

// Singleton
export const cloudAdapter = new CloudAdapter();
