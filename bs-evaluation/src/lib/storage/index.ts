/**
 * B.S Evaluation — Storage Module Entry Point
 * تصدير المحرك الرئيسي والأنواع والمحولات
 */

// Main engine
export { bsStorage } from './BSStorageCore';

// Types
export type {
  BSProjectFile,
  CompressedImage,
  ConnectionStatus,
  ICloudAdapter,
  IDownloadAdapter,
  IFileSystemAdapter,
  IStorageAdapter,
  LocalProject,
  ProjectListItem,
  ProjectSection,
  SaveOptions,
  StorageStats,
  SyncResult,
  SyncStatus,
  UserCloudPermission,
} from './types/storage.types';
export { PROJECT_SECTIONS } from './types/storage.types';

// Adapters (for direct access if needed)
export { indexedDBAdapter } from './adapters/IndexedDBAdapter';
export { fileSystemAdapter } from './adapters/FileSystemAdapter';
export { downloadAdapter } from './adapters/DownloadAdapter';
export { cloudAdapter } from './adapters/CloudAdapter';

// Services
export { ProjectSerializer } from './services/ProjectSerializer';
export { ImageCompressor } from './services/ImageCompressor';
export { SyncManager } from './services/SyncManager';
export { syncManager } from './services/SyncManager';
export { CacheManager } from './services/CacheManager';
export { cacheManager } from './services/CacheManager';
