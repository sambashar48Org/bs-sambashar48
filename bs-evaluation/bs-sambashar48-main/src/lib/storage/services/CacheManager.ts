/**
 * B.S Evaluation — Cache Manager
 * إدارة الكاش المحلي وتنظيف المساحة
 */

import { indexedDBAdapter } from '../adapters/IndexedDBAdapter';
import type { StorageStats } from '../types/storage.types';

export class CacheManager {
  /**
   * حساب إحصائيات التخزين
   */
  async getStats(): Promise<StorageStats> {
    return indexedDBAdapter.getStorageStats();
  }

  /**
   * تنظيف البيانات القديمة — حذف المشاريع القديمة لتحرير مساحة
   */
  async cleanupOldProjects(keepCount: number = 10): Promise<number> {
    const stats = await this.getStats();
    if (stats.totalProjects <= keepCount) return 0;

    const projects = await indexedDBAdapter.listProjects();
    const sorted = [...projects].sort(
      (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
    );

    const toDelete = sorted.slice(0, stats.totalProjects - keepCount);
    let deleted = 0;

    for (const project of toDelete) {
      try {
        await indexedDBAdapter.deleteProject(project.id);
        deleted++;
      } catch {
        // Skip projects that fail to delete
      }
    }

    return deleted;
  }

  /**
   * حذف كل البيانات المحلية
   */
  async clearAll(): Promise<void> {
    await indexedDBAdapter.clearAll();
  }

  /**
   * تنسيق الحجم بالوحدات المناسبة
   */
  static formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = bytes / Math.pow(k, i);

    return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
  }

  /**
   * حساب نسبة الاستخدام
   */
  async getUsagePercentage(): Promise<number> {
    const stats = await this.getStats();
    // Estimate max storage at 50MB for IndexedDB
    const maxBytes = 50 * 1024 * 1024;
    return Math.min(100, (stats.totalSizeBytes / maxBytes) * 100);
  }

  /**
   * فحص هل المساحة كافية لمشروع جديد
   */
  async canCreateProject(): Promise<boolean> {
    const stats = await this.getStats();
    return stats.totalProjects < stats.maxProjects;
  }

  /**
   * إرجاع وقت نسبي بالعربية
   */
  static timeAgo(dateString: string | null): string {
    if (!dateString) return 'لم يتم الحفظ';

    const now = Date.now();
    const then = new Date(dateString).getTime();
    const diffMs = now - then;

    if (diffMs < 0) return 'الآن';

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 10) return 'الآن';
    if (seconds < 60) return `قبل ${seconds} ثانية`;
    if (minutes < 60) return `قبل ${minutes} دقيقة`;
    if (hours < 24) return `قبل ${hours} ساعة`;
    if (days < 30) return `قبل ${days} يوم`;
    if (days < 365) return `قبل ${Math.floor(days / 30)} شهر`;
    return `قبل ${Math.floor(days / 365)} سنة`;
  }
}

// Singleton
export const cacheManager = new CacheManager();
