/**
 * B.S Evaluation — Sync Manager
 * إدارة المزامنة السحابية
 * - كشف الاتصال بالإنترنت
 * - مزامنة يدوية
 * - إشعارات حالة المزامنة
 */

import type { SyncResult, SyncStatus, ConnectionStatus } from '../types/storage.types';
import { cloudAdapter } from '../adapters/CloudAdapter';
import { indexedDBAdapter } from '../adapters/IndexedDBAdapter';

type SyncStatusCallback = (status: SyncStatus, message?: string) => void;
type ConnectionCallback = (status: ConnectionStatus) => void;

export class SyncManager {
  private statusListeners: Set<SyncStatusCallback> = new Set();
  private connectionListeners: Set<ConnectionCallback> = new Set();
  private _syncStatus: SyncStatus = 'idle';
  private _connectionStatus: ConnectionStatus = typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline';
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  // ======== Connection Status ========
  get connectionStatus(): ConnectionStatus {
    return this._connectionStatus;
  }

  get syncStatus(): SyncStatus {
    return this._syncStatus;
  }

  get isOnline(): boolean {
    return this._connectionStatus === 'online';
  }

  /**
   * فحص الاتصال بالإنترنت فعلياً (ليس فقط navigator.onLine)
   */
  async checkConnection(): Promise<boolean> {
    this._connectionStatus = 'checking';
    this.notifyConnectionListeners();

    try {
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      const online = response.ok;
      this._connectionStatus = online ? 'online' : 'offline';
    } catch {
      this._connectionStatus = 'offline';
    }

    this.notifyConnectionListeners();
    return this._connectionStatus === 'online';
  }

  // ======== Sync Operations ========
  /**
   * مزامنة مشروع واحد مع السحابة
   */
  async syncProject(projectId: string): Promise<SyncResult> {
    if (!this.isOnline) {
      return {
        projectId,
        projectName: '',
        success: false,
        action: 'none',
        message: 'لا يوجد اتصال بالإنترنت',
        timestamp: new Date().toISOString(),
      };
    }

    this.setSyncStatus('syncing', 'جاري المزامنة...');

    try {
      // Get local project data
      const localProject = await indexedDBAdapter.loadProject(projectId);
      if (!localProject) {
        this.setSyncStatus('error', 'المشروع غير موجود محلياً');
        return {
          projectId,
          projectName: '',
          success: false,
          action: 'none',
          message: 'المشروع غير موجود محلياً',
          timestamp: new Date().toISOString(),
        };
      }

      // Upload to cloud
      const result = await cloudAdapter.uploadProject(localProject);

      if (result.success) {
        // Update local project's sync timestamp
        localProject.lastSyncedAt = new Date().toISOString();
        localProject.isDirty = false;
        await indexedDBAdapter.saveProject(localProject);

        this.setSyncStatus('success', 'تمت المزامنة بنجاح');
      } else {
        this.setSyncStatus('error', result.message);
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'خطأ في المزامنة';
      this.setSyncStatus('error', message);
      return {
        projectId,
        projectName: '',
        success: false,
        action: 'none',
        message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * مزامنة كل المشاريع المتسخة (التي تم تعديلها بعد آخر مزامنة)
   */
  async syncDirtyProjects(): Promise<SyncResult[]> {
    if (!this.isOnline) return [];

    this.setSyncStatus('syncing', 'جاري مزامنة المشاريع...');

    try {
      const projects = await indexedDBAdapter.listProjects();
      const dirtyProjects = projects.filter((p) => p.isDirty);
      const results: SyncResult[] = [];

      for (const project of dirtyProjects) {
        const result = await this.syncProject(project.id);
        results.push(result);
      }

      if (results.every((r) => r.success)) {
        this.setSyncStatus('success', `تمت مزامنة ${results.length} مشروع`);
      } else {
        this.setSyncStatus('error', 'فشلت مزامنة بعض المشاريع');
      }

      return results;
    } catch (err) {
      this.setSyncStatus('error', 'خطأ في المزامنة');
      return [];
    }
  }

  // ======== Event Listeners ========
  onSyncStatusChange(callback: SyncStatusCallback): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionListeners.add(callback);
    return () => this.connectionListeners.delete(callback);
  }

  // ======== Auto-check Connection Periodically ========
  startPeriodicCheck(intervalMs: number = 30000): void {
    if (this.syncInterval) return;
    this.syncInterval = setInterval(() => {
      this.checkConnection();
    }, intervalMs);
  }

  stopPeriodicCheck(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // ======== Private Helpers ========
  private handleOnline(): void {
    this._connectionStatus = 'online';
    this.notifyConnectionListeners();
  }

  private handleOffline(): void {
    this._connectionStatus = 'offline';
    this._syncStatus = 'offline';
    this.notifyConnectionListeners();
    this.notifySyncListeners();
  }

  private setSyncStatus(status: SyncStatus, message?: string): void {
    this._syncStatus = status;
    this.notifySyncListeners(message);
  }

  private notifySyncListeners(message?: string): void {
    this.statusListeners.forEach((cb) => cb(this._syncStatus, message));
  }

  private notifyConnectionListeners(): void {
    this.connectionListeners.forEach((cb) => cb(this._connectionStatus));
  }
}

// Singleton
export const syncManager = new SyncManager();
