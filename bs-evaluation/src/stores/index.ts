import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Language } from '@/lib/translations';

// ======== Store Versioning ========
// Increment this when store schema changes to trigger migration
const AUTH_STORE_VERSION = 2; // Bumped — added cloudSyncEnabled
const SETTINGS_STORE_VERSION = 1;

// ======== Auth Store ========
interface AuthState {
  isAuthenticated: boolean;
  user: {
    id: string;
    username: string;
    fullName: string;
    role: 'admin' | 'user';
    cloudSyncEnabled: boolean; // هل فعّل المدير المزامنة السحابية لهذا المستخدم؟
  } | null;
  setAuth: (user: {
    id: string;
    username: string;
    fullName: string;
    role: 'admin' | 'user';
    cloudSyncEnabled?: boolean;
  }) => void;
  clearAuth: () => void;
  setCloudSyncEnabled: (enabled: boolean) => void;
  /** هل المستخدم يملك صلاحية المزامنة السحابية؟ (مدير أو مصرح له) */
  canSyncCloud: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      setAuth: (user) =>
        set({
          isAuthenticated: true,
          user: {
            ...user,
            cloudSyncEnabled: user.cloudSyncEnabled ?? false,
          },
        }),
      clearAuth: () => set({ isAuthenticated: false, user: null }),
      setCloudSyncEnabled: (enabled) =>
        set((state) => ({
          user: state.user ? { ...state.user, cloudSyncEnabled: enabled } : null,
        })),
      canSyncCloud: () => {
        const user = get().user;
        if (!user) return false;
        return user.role === 'admin' || user.cloudSyncEnabled === true;
      },
    }),
    {
      name: 'bs-auth',
      version: AUTH_STORE_VERSION,
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') return localStorage;
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
      // Migration: handle version changes
      migrate: (persisted, version) => {
        if (version < AUTH_STORE_VERSION) {
          const old = persisted as Record<string, unknown>;
          const oldUser = old.user as Record<string, unknown> | null;
          return {
            isAuthenticated: old.isAuthenticated || false,
            user: oldUser
              ? {
                  id: oldUser.id as string,
                  username: oldUser.username as string,
                  fullName: oldUser.fullName as string,
                  role: (oldUser.role as 'admin' | 'user') || 'user',
                  cloudSyncEnabled: false, // New field — default false
                }
              : null,
          };
        }
        return persisted as AuthState;
      },
      onRehydrateStorage: () => (state) => {
        // Called when rehydration finishes
        void state;
      },
    }
  )
);

/**
 * Returns a Promise that resolves when the auth store has rehydrated from localStorage.
 * Components should await this before reading isAuthenticated.
 */
export function waitForAuthHydration(): Promise<void> {
  if (useAuthStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

// ======== Settings Store ========
interface SettingsState {
  language: Language;
  units: {
    dimension: string;
    area: string;
    load: string;
    stress: string;
    density: string;
  };
  setLanguage: (lang: Language) => void;
  setUnits: (units: SettingsState['units']) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'ar',
      units: {
        dimension: 'cm',
        area: 'm\u00B2',
        load: 'ton',
        stress: 'kg/cm\u00B2',
        density: 'kg/m\u00B3',
      },
      setLanguage: (language) => set({ language }),
      setUnits: (units) => set({ units }),
    }),
    {
      name: 'bs-evaluation-settings',
      version: SETTINGS_STORE_VERSION,
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') return localStorage;
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      migrate: (persisted, version) => {
        if (version !== SETTINGS_STORE_VERSION) {
          return {
            language: 'ar' as Language,
            units: {
              dimension: 'cm',
              area: 'm\u00B2',
              load: 'ton',
              stress: 'kg/cm\u00B2',
              density: 'kg/m\u00B3',
            },
          };
        }
        return persisted as SettingsState;
      },
    }
  )
);

// ======== Project Store (NOW persisted via IndexedDB through BSStorageCore) ========
interface ProjectData {
  building_data: Record<string, unknown>;
  architectural_report: Record<string, unknown>;
  structural_report: Record<string, unknown>;
  foundations: Record<string, unknown>;
  columns_walls: Record<string, unknown>;
  beam_slab: Record<string, unknown>;
  electrical: Record<string, unknown>;
  plumbing: Record<string, unknown>;
  technical_notes: Record<string, unknown>;
  final_report: Record<string, unknown>;
}

export interface ReportPreferences {
  companyName: string;
  reportHeader: string;
  reportFooter: string;
  selectedSections: string[];
}

const defaultReportPreferences: ReportPreferences = {
  companyName: '',
  reportHeader: '',
  reportFooter: '',
  selectedSections: [],
};

interface ProjectStore {
  projects: Array<{
    id: string;
    user_id: string;
    name: string;
    is_current: boolean;
    created_at: string;
    updated_at: string;
    lastSavedAt?: string | null;
    lastSyncedAt?: string | null;
    isDirty?: boolean;
  }>;
  currentProjectId: string | null;
  projectData: ProjectData;
  reportPreferences: ReportPreferences;
  isLoading: boolean;
  lastSaveTime: string | null;
  isOnline: boolean;
  setProjects: (projects: ProjectStore['projects']) => void;
  setCurrentProjectId: (id: string | null) => void;
  updateProjectData: (section: keyof ProjectData, data: Record<string, unknown>) => void;
  setReportPreferences: (prefs: Partial<ReportPreferences>) => void;
  setLoading: (loading: boolean) => void;
  resetProjectData: () => void;
  setLastSaveTime: (time: string | null) => void;
  setOnline: (online: boolean) => void;
}

const defaultProjectData: ProjectData = {
  building_data: {},
  architectural_report: {},
  structural_report: {},
  foundations: {},
  columns_walls: {},
  beam_slab: {},
  electrical: {},
  plumbing: {},
  technical_notes: {},
  final_report: {},
};

export const useProjectStore = create<ProjectStore>()((set) => ({
  projects: [],
  currentProjectId: null,
  projectData: { ...defaultProjectData },
  reportPreferences: { ...defaultReportPreferences },
  isLoading: false,
  lastSaveTime: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  setProjects: (projects) => set({ projects }),
  setCurrentProjectId: (id) => set({ currentProjectId: id, projectData: { ...defaultProjectData } }),
  updateProjectData: (section, data) =>
    set((state) => ({
      projectData: { ...state.projectData, [section]: { ...state.projectData[section], ...data } },
    })),
  setReportPreferences: (prefs) =>
    set((state) => ({
      reportPreferences: { ...state.reportPreferences, ...prefs },
    })),
  setLoading: (isLoading) => set({ isLoading }),
  resetProjectData: () => set({ projectData: { ...defaultProjectData } }),
  setLastSaveTime: (lastSaveTime) => set({ lastSaveTime }),
  setOnline: (isOnline) => set({ isOnline }),
}));

// ======== UI Store (NOT persisted — ephemeral UI state) ========
interface UIState {
  activeTab: string;
  sidebarOpen: boolean;
  showOnlineStatus: boolean;
  setActiveTab: (tab: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setShowOnlineStatus: (show: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  activeTab: 'buildingData',
  sidebarOpen: false,
  showOnlineStatus: false,
  setActiveTab: (activeTab) => set({ activeTab }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setShowOnlineStatus: (showOnlineStatus) => set({ showOnlineStatus }),
}));
