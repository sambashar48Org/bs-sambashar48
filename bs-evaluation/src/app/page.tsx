'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useProjectStore, useUIStore, waitForAuthHydration } from '@/stores';
import { useTranslation } from '@/lib/i18n';
import { bsStorage, CacheManager } from '@/lib/storage';
import type { LocalProject, ProjectSection, ConnectionStatus } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Image from 'next/image';
import {
  Building2,
  Columns3,
  Layers,
  ClipboardCheck,
  Settings,
  FileOutput,
  Info,
  Plus,
  Trash2,
  Edit3,
  LogOut,
  Shield,
  Menu,
  X,
  Database,
  DraftingCompass,
  PlugZap,
  Pipette,
  FileSpreadsheet,
  FileDown,
  AppWindow,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Download,
  FolderOpen,
  Cloud,
  Upload,
  Save,
  HardDrive,
  RotateCcw,
  Inbox,
  Wifi,
  WifiOff,
  Home,
  FileText,
  Wrench,
  Hammer,
  Zap,
  Droplets,
  ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';

import BuildingInfo from '@/components/tabs/BuildingInfo';
import ArchitecturalReport from '@/components/tabs/ArchitecturalReport';
import StructuralReport from '@/components/tabs/StructuralReport';
import Foundations from '@/components/tabs/Foundations';
import ColumnsWalls from '@/components/tabs/ColumnsWalls';
import BeamSlab from '@/components/tabs/BeamSlab';
import ElectricalReport from '@/components/tabs/ElectricalReport';
import PlumbingReport from '@/components/tabs/PlumbingReport';
import TechnicalNotes from '@/components/tabs/TechnicalNotes';
import FinalReport from '@/components/tabs/FinalReport';
import GenerateReports from '@/components/tabs/GenerateReports';
import SettingsPanel from '@/components/tabs/SettingsPanel';
import AboutPanel from '@/components/tabs/AboutPanel';

export default function HomePage() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const { user, isAuthenticated, clearAuth, canSyncCloud } = useAuthStore();
  const { activeTab, setActiveTab, sidebarOpen, setSidebarOpen } = useUIStore();
  const {
    projects,
    setProjects,
    currentProjectId,
    setCurrentProjectId,
    projectData,
    updateProjectData,
    isLoading,
    setLoading,
    lastSaveTime,
    setLastSaveTime,
    isOnline,
    setOnline,
  } = useProjectStore();

  const [mounted, setMounted] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    projectData: true,
    architectural: true,
    structural: true,
    structuralEval: true,
    electrical: true,
    plumbing: true,
    reportGen: true,
    general: true,
  });
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [showProjectsPanel, setShowProjectsPanel] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('offline');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSaveTimeDisplay, setLastSaveTimeDisplay] = useState<string>('');

  // Ref to track if we already notified about online status
  const onlineNotifiedRef = useRef(false);

  // Wait for zustand persist rehydration before reading auth state.
  useEffect(() => {
    let cancelled = false;
    waitForAuthHydration().then(() => {
      if (!cancelled) setMounted(true);
    });
    return () => { cancelled = true; };
  }, []);

  // Validate session with the server on mount.
  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    // Server-side validation: verify the cookie is still valid
    fetch('/api/auth/me?_t=' + Date.now(), { credentials: 'include' }).then((res) => {
      if (res.status === 401) {
        clearAuth();
        router.push('/login');
      }
    }).catch(() => {
      // Network Error — keep existing state, will retry on next API call
    });
  }, [mounted, isAuthenticated, clearAuth, router]);

  // Initialize BSStorageCore on mount
  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    bsStorage.init().catch(() => {
      // Storage init failure is non-critical
    });
  }, [mounted, isAuthenticated]);

  // Listen for connection changes via syncManager
  useEffect(() => {
    if (!mounted || !isAuthenticated) return;

    const unsubscribe = bsStorage.onConnectionChange((status) => {
      setConnectionStatus(status);
      setOnline(status === 'online');

      // Show toast when coming online with cloud permission
      if (status === 'online' && !onlineNotifiedRef.current && canSyncCloud()) {
        onlineNotifiedRef.current = true;
        toast.success(t.internetForCloud, { duration: 3000 });
      }
      if (status === 'offline') {
        onlineNotifiedRef.current = false;
      }
    });

    // Set initial status
    setConnectionStatus(bsStorage.isOnline ? 'online' : 'offline');
    setOnline(bsStorage.isOnline);

    return () => {
      unsubscribe();
    };
  }, [mounted, isAuthenticated, canSyncCloud, setOnline]);

  // Update "last save time" display periodically
  useEffect(() => {
    const update = () => {
      setLastSaveTimeDisplay(CacheManager.timeAgo(lastSaveTime));
    };
    update();
    const interval = setInterval(update, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [lastSaveTime]);

  // Offline-first project loading
  useEffect(() => {
    if (isAuthenticated) {
      fetchProjectsOfflineFirst();
    }
  }, [isAuthenticated]);

  /**
   * Offline-first loading:
   * 1. Load from IndexedDB (instant)
   * 2. Then try cloud sync if online
   * 3. Merge: local dirty data takes precedence
   */
  const fetchProjectsOfflineFirst = async () => {
    try {
      setLoading(true);

      // Step 1: Load from IndexedDB first (instant)
      const localProjects = await bsStorage.listProjects();
      if (localProjects.length > 0) {
        const mapped = localProjects.map(mapListItemToStore);
        setProjects(mapped);

        // Set current project
        const current = localProjects.find((p) => p.isCurrent);
        if (current) {
          setCurrentProjectId(current.id);
          loadProjectDataFromLocal(current.id);
        }
      }

      // Step 2: Try cloud sync if online
      if (bsStorage.isOnline) {
        try {
          const res = await fetch('/api/projects?_t=' + Date.now(), { credentials: 'include' });
          if (res.status === 401) {
            clearAuth();
            router.push('/login');
            return;
          }
          const cloudData = await res.json();

          // Step 3: Merge — local dirty projects take precedence
          const localIds = new Set(localProjects.filter((p) => p.isDirty).map((p) => p.id));
          const merged = [...cloudData];

          // Add dirty local projects that aren't in cloud data
          for (const lp of localProjects) {
            if (lp.isDirty && !cloudData.find((cp: { id: string }) => cp.id === lp.id)) {
              merged.push(mapListItemToStore(lp));
            }
          }

          setProjects(merged);

          // Set current project from cloud if not already set
          if (!currentProjectId) {
            const current = merged.find((p: { is_current: boolean }) => p.is_current);
            if (current) {
              setCurrentProjectId(current.id);
              loadProjectData(current.id);
            }
          }

          // Sync dirty projects to cloud in background
          if (canSyncCloud()) {
            bsStorage.syncAll().catch(() => {
              // Background sync failure is non-critical
            });
          }
        } catch {
          // Cloud fetch failed — local data is sufficient
        }
      }
    } catch {
      // Fallback to API-only if IndexedDB fails
      await fetchProjects();
    } finally {
      setLoading(false);
    }
  };

  /**
   * Map a ProjectListItem from storage to the store format
   */
  const mapListItemToStore = (item: { id: string; name: string; isCurrent: boolean; updatedAt: string; lastSavedAt: string | null; lastSyncedAt: string | null; isDirty: boolean }) => ({
    id: item.id,
    user_id: user?.id || '',
    name: item.name,
    is_current: item.isCurrent,
    created_at: item.updatedAt,
    updated_at: item.updatedAt,
    lastSavedAt: item.lastSavedAt,
    lastSyncedAt: item.lastSyncedAt,
    isDirty: item.isDirty,
  });

  /**
   * Fallback: fetch projects from API only (legacy)
   */
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/projects?_t=' + Date.now(), { credentials: 'include' });
      if (res.status === 401) {
        clearAuth();
        router.push('/login');
        return;
      }
      const data = await res.json();
      setProjects(data);

      const current = data.find((p: { is_current: boolean }) => p.is_current);
      if (current) {
        setCurrentProjectId(current.id);
        loadProjectData(current.id);
      }
    } catch {
      toast.error(t.fetchProjectsFailed);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load project data from IndexedDB (local)
   */
  const loadProjectDataFromLocal = async (projectId: string) => {
    try {
      const project = await bsStorage.loadProject(projectId);
      if (project && project.data) {
        Object.keys(project.data).forEach((key) => {
          updateProjectData(key as keyof typeof projectData, project.data[key as ProjectSection] || {});
        });
      }
    } catch {
      // silent fail — data is in local state
    }
  };

  /**
   * Load project data from API
   */
  const loadProjectData = async (projectId: string) => {
    try {
      // Try local first
      const localProject = await bsStorage.loadProject(projectId);
      if (localProject && localProject.data) {
        Object.keys(localProject.data).forEach((key) => {
          updateProjectData(key as keyof typeof projectData, localProject.data[key as ProjectSection] || {});
        });
        return;
      }

      // Fallback to API
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        Object.keys(data).forEach((key) => {
          if (key !== 'id' && key !== 'user_id' && key !== 'name' && key !== 'is_current' && key !== 'created_at' && key !== 'updated_at') {
            updateProjectData(key as keyof typeof projectData, data[key] || {});
          }
        });
      }
    } catch {
      // silent fail — data is in local state
    }
  };

  /**
   * Get current project as LocalProject (syncs store state → LocalProject)
   */
  const getCurrentLocalProject = async (): Promise<LocalProject | null> => {
    if (!currentProjectId) return null;

    const existingProject = await bsStorage.loadProject(currentProjectId);
    const currentProject = projects.find((p: { id: string }) => p.id === currentProjectId);

    if (existingProject) {
      return {
        ...existingProject,
        data: projectData as unknown as Record<ProjectSection, Record<string, unknown>>,
        name: currentProject?.name || existingProject.name,
        isDirty: true,
        updatedAt: new Date().toISOString(),
      };
    }

    // Create a new LocalProject from store data
    return {
      id: currentProjectId,
      userId: user?.id || '',
      name: currentProject?.name || t.projectDefault,
      isCurrent: true,
      data: projectData as unknown as Record<ProjectSection, Record<string, unknown>>,
      images: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastSavedAt: null,
      lastSyncedAt: null,
      isDirty: true,
    };
  };

  /**
   * Create a new project — IndexedDB first, then cloud
   */
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      // Create in IndexedDB
      const localProject = await bsStorage.createProject(user?.id || '', newProjectName.trim());

      // If online, also create in Supabase
      if (bsStorage.isOnline) {
        try {
          const res = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newProjectName.trim(), id: localProject.id }),
          });
          if (!res.ok) {
            const data = await res.json();
            toast.error(data.error);
            // Don't return — local creation succeeded
          }
        } catch {
          // Cloud creation failed — local project exists, mark as dirty
          // Will be synced later
        }
      }

      toast.success(t.projectCreated);
      setShowNewProject(false);
      setNewProjectName('');

      // Refresh project list
      const updatedProjects = await bsStorage.listProjects();
      setProjects(updatedProjects.map(mapListItemToStore));

      // Set as current
      setCurrentProjectId(localProject.id);
      useProjectStore.getState().resetProjectData();
    } catch {
      toast.error(t.projectCreateFailed);
    }
  };

  /**
   * Select (switch to) a project
   */
  const handleSelectProject = async (projectId: string) => {
    try {
      // Set current in IndexedDB
      await bsStorage.setCurrentProject(projectId);

      // Also update in cloud if online
      if (bsStorage.isOnline) {
        fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_current: true }),
        }).catch(() => {
          // Non-critical
        });
      }

      setCurrentProjectId(projectId);
      loadProjectDataFromLocal(projectId);

      // Optimistic update: reflect is_current in local project list
      setProjects(
        (useProjectStore.getState().projects || []).map((p) => ({
          ...p,
          is_current: p.id === projectId,
        }))
      );
    } catch {
      // silent — project still switches in local state
    } finally {
      setShowProjectsPanel(false);
    }
  };

  /**
   * Recall a project from IndexedDB — loads data and displays it
   */
  const handleRecallProject = async (projectId: string) => {
    try {
      const project = await bsStorage.recallProject(projectId);
      if (!project) {
        toast.error(t.recallFailed);
        return;
      }

      // Load project data into Zustand store
      setCurrentProjectId(project.id);
      Object.keys(project.data).forEach((key) => {
        updateProjectData(key as keyof typeof projectData, project.data[key as ProjectSection] || {});
      });

      // Optimistic update: reflect is_current in local project list
      setProjects(
        (useProjectStore.getState().projects || []).map((p) => ({
          ...p,
          is_current: p.id === projectId,
        }))
      );

      toast.success(t.recallSuccess);
      setShowProjectsPanel(false);
      setSidebarOpen(false);
    } catch {
      toast.error(t.recallFailedGeneral);
    }
  };

  const handleRenameProject = async () => {
    if (!editProjectName.trim() || !editProjectId) return;
    try {
      // Update in IndexedDB
      const project = await bsStorage.loadProject(editProjectId);
      if (project) {
        project.name = editProjectName.trim();
        project.isDirty = true;
        await bsStorage.saveProject(project);
      }

      // Update in cloud if online
      if (bsStorage.isOnline) {
        const res = await fetch(`/api/projects/${editProjectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editProjectName.trim() }),
        });
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error);
          return;
        }
      }

      toast.success(t.projectRenamed);
      setEditProjectId(null);

      // Refresh project list
      const updatedProjects = await bsStorage.listProjects();
      setProjects(updatedProjects.map(mapListItemToStore));
    } catch {
      toast.error(t.projectRenameFailed);
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteProjectId) return;
    try {
      // Delete from both local and cloud
      await bsStorage.deleteProject(deleteProjectId, bsStorage.isOnline);

      // Also try API delete if online
      if (bsStorage.isOnline) {
        try {
          await fetch(`/api/projects/${deleteProjectId}`, { method: 'DELETE' });
        } catch {
          // Non-critical — already deleted locally
        }
      }

      toast.success(t.projectDeleted);
      setDeleteProjectId(null);

      // Refresh project list
      const updatedProjects = await bsStorage.listProjects();
      setProjects(updatedProjects.map(mapListItemToStore));
    } catch {
      toast.error(t.projectDeleteFailed);
    }
  };

  // ======== Save Handlers ========

  /**
   * 💾 حفظ محلي — Save to IndexedDB immediately
   */
  const handleSaveLocal = async () => {
    if (!currentProjectId) {
      toast.error(t.noProjectSelected);
      return;
    }
    try {
      const project = await getCurrentLocalProject();
      if (!project) {
        toast.error(t.noProjectToSave);
        return;
      }
      await bsStorage.saveProject(project, { local: true });
      const now = new Date().toISOString();
      setLastSaveTime(now);
      setLastSaveTimeDisplay(CacheManager.timeAgo(now));
      toast.success(t.saveLocalSuccess);
    } catch {
      toast.error(t.saveLocalFailed);
    }
  };

  /**
   * 📁 حفظ كملف — Save as .bsproj file
   */
  const handleSaveAsFile = async () => {
    if (!currentProjectId) {
      toast.error(t.noProjectSelected);
      return;
    }
    try {
      const project = await getCurrentLocalProject();
      if (!project) {
        toast.error(t.noProjectToSave);
        return;
      }
      // First save locally to ensure IndexedDB is up to date
      await bsStorage.saveProject(project, { local: true });
      // Then save as file
      await bsStorage.saveAsFile(project);
      const now = new Date().toISOString();
      setLastSaveTime(now);
      setLastSaveTimeDisplay(CacheManager.timeAgo(now));
      toast.success(t.saveAsFileSuccess);
    } catch {
      toast.error(t.saveAsFileFailed);
    }
  };

  /**
   * ☁️ حفظ سحابي — Save to cloud (requires permission + online)
   */
  const handleSaveCloud = async () => {
    if (!currentProjectId) {
      toast.error(t.noProjectSelected);
      return;
    }
    if (!bsStorage.isOnline) {
      toast.error(t.noInternet);
      return;
    }
    if (!canSyncCloud()) {
      toast.error(t.noCloudPermission);
      return;
    }
    try {
      const project = await getCurrentLocalProject();
      if (!project) {
        toast.error(t.noProjectToSave);
        return;
      }
      // Save locally first, then cloud
      await bsStorage.saveProject(project, { local: true, cloud: true });
      const now = new Date().toISOString();
      setLastSaveTime(now);
      setLastSaveTimeDisplay(CacheManager.timeAgo(now));
      toast.success(t.saveCloudSuccess);
    } catch {
      toast.error(t.saveCloudFailed);
    }
  };

  /**
   * 📥 استيراد ملف — Import .bsproj from device
   */
  const handleImportFile = async () => {
    try {
      const project = await bsStorage.importProject();
      if (project) {
        // Set user ID on imported project
        project.userId = user?.id || '';
        await bsStorage.saveProject(project);

        // Refresh project list
        const updatedProjects = await bsStorage.listProjects();
        setProjects(updatedProjects.map(mapListItemToStore));

        // Set as current
        setCurrentProjectId(project.id);
        Object.keys(project.data).forEach((key) => {
          updateProjectData(key as keyof typeof projectData, project.data[key as ProjectSection] || {});
        });

        toast.success(t.importSuccess);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.importFailed);
    }
  };

  /**
   * 🔄 مزامنة الآن — Sync now (requires permission + online)
   */
  const handleSyncNow = async () => {
    if (!bsStorage.isOnline) {
      toast.error(t.noInternet);
      return;
    }
    if (!canSyncCloud()) {
      toast.error(t.noSyncPermission);
      return;
    }
    try {
      setIsSyncing(true);
      const results = await bsStorage.syncAll();
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      if (failCount === 0) {
        toast.success(t.syncSuccessCount.replace('{count}', String(successCount)));
      } else {
        toast.error(t.syncPartial.replace('{success}', String(successCount)).replace('{fail}', String(failCount)));
      }

      // Refresh project list
      const updatedProjects = await bsStorage.listProjects();
      setProjects(updatedProjects.map(mapListItemToStore));
    } catch {
      toast.error(t.syncFailed);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // silent
    }
    clearAuth();
    // Full reload to ensure cookie is cleared and SW cache is bypassed
    window.location.href = '/login';
  };

  /**
   * Auto-save project data — saves to IndexedDB first, then tries cloud
   */
  const saveCurrentTab = useCallback(
    async (section: string, data: Record<string, unknown>) => {
      if (!currentProjectId) return;

      try {
        // 1. Always save to IndexedDB first (even if admin)
        await bsStorage.saveSection(currentProjectId, section as ProjectSection, data);
        const now = new Date().toISOString();
        setLastSaveTime(now);

        // 2. Try cloud sync if user has permission and is online
        if (canSyncCloud() && bsStorage.isOnline && user?.role !== 'admin') {
          // Non-blocking cloud sync
          fetch(`/api/projects/${currentProjectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [section]: data }),
          }).catch(() => {
            // Cloud save failed — data is safe in IndexedDB
          });
        }
      } catch {
        // IndexedDB save failed — data is preserved in local state
      }
    },
    [currentProjectId, user?.role, canSyncCloud]
  );

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  // Sidebar navigation groups with custom colored icons
  const sidebarGroups = [
    {
      id: 'projectData',
      label: t.groupProjectData,
      icon: Home,
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-emerald-500/10',
      borderClass: 'border-emerald-500/20',
      indicatorClass: 'bg-emerald-500',
      items: [
        { id: 'savedProjects', label: t.savedProjects, icon: FolderOpen, isSpecial: true as const },
        { id: 'buildingData', label: t.buildingData, icon: Database },
      ],
    },
    {
      id: 'architectural',
      label: t.groupArchitectural,
      icon: DraftingCompass,
      colorClass: 'text-[#D4A574] dark:text-[#E0B88A]',
      bgClass: 'bg-[#D4A574]/10',
      borderClass: 'border-[#D4A574]/20',
      indicatorClass: 'bg-[#D4A574]',
      items: [
        { id: 'architecturalReport', label: t.architecturalReport, icon: FileText },
      ],
    },
    {
      id: 'structural',
      label: t.groupStructural,
      icon: Building2,
      colorClass: 'text-[#5B8DB8] dark:text-[#7BAED4]',
      bgClass: 'bg-[#5B8DB8]/10',
      borderClass: 'border-[#5B8DB8]/20',
      indicatorClass: 'bg-[#5B8DB8]',
      items: [
        { id: 'structuralReport', label: t.structuralReport, icon: Building2 },
        { id: 'foundations', label: t.foundations, icon: Layers },
        { id: 'columnsWalls', label: t.columnsWalls, icon: Columns3 },
        { id: 'beamSlab', label: t.beamSlab, icon: Wrench },
        { id: 'technicalObservations', label: t.technicalObservations, icon: ClipboardCheck },
        { id: 'finalReport', label: t.finalReport, icon: FileSpreadsheet },
      ],
    },
    {
      id: 'structuralEval',
      label: t.groupStructuralEval,
      icon: Hammer,
      colorClass: 'text-teal-600 dark:text-teal-400',
      bgClass: 'bg-teal-500/10',
      borderClass: 'border-teal-500/20',
      indicatorClass: 'bg-teal-500',
      items: [],
    },
    {
      id: 'electrical',
      label: t.groupElectrical,
      icon: Zap,
      colorClass: 'text-[#E8B84B] dark:text-[#F0C868]',
      bgClass: 'bg-[#E8B84B]/10',
      borderClass: 'border-[#E8B84B]/20',
      indicatorClass: 'bg-[#E8B84B]',
      items: [
        { id: 'electricalReport', label: t.electricalReport, icon: PlugZap },
      ],
    },
    {
      id: 'plumbing',
      label: t.groupPlumbing,
      icon: Droplets,
      colorClass: 'text-cyan-600 dark:text-cyan-400',
      bgClass: 'bg-cyan-500/10',
      borderClass: 'border-cyan-500/20',
      indicatorClass: 'bg-cyan-500',
      items: [
        { id: 'plumbingReport', label: t.plumbingReport, icon: Pipette },
      ],
    },
    {
      id: 'reportGen',
      label: t.groupReportGen,
      icon: FileDown,
      colorClass: 'text-[#8B7EC8] dark:text-[#A99BE0]',
      bgClass: 'bg-[#8B7EC8]/10',
      borderClass: 'border-[#8B7EC8]/20',
      indicatorClass: 'bg-[#8B7EC8]',
      items: [
        { id: 'pdfExport', label: t.pdfExport, icon: ClipboardList },
      ],
    },
    {
      id: 'general',
      label: t.groupGeneral,
      icon: Settings,
      colorClass: 'text-[#8B8FA3] dark:text-[#A0A4B8]',
      bgClass: 'bg-[#8B8FA3]/10',
      borderClass: 'border-[#8B8FA3]/20',
      indicatorClass: 'bg-[#8B8FA3]',
      items: [
        { id: 'settings', label: t.settings, icon: Settings },
        { id: 'about', label: t.about, icon: AppWindow },
      ],
    },
  ];

  // Track which groups are expanded (initialized above before early return)
  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Flat tab list for mobile tab bar (exclude special items and empty groups)
  const allTabs = sidebarGroups.flatMap((g) => g.items.filter((item) => !('isSpecial' in item && item.isSpecial)));

  const renderTabContent = () => {
    switch (activeTab) {
      case 'buildingData':
        return <BuildingInfo data={projectData.building_data} onSave={(d) => { updateProjectData('building_data', d); saveCurrentTab('building_data', d); }} />;
      case 'architecturalReport':
        return <ArchitecturalReport data={projectData.architectural_report} onSave={(d) => { updateProjectData('architectural_report', d); saveCurrentTab('architectural_report', d); }} />;
      case 'structuralReport':
        return <StructuralReport data={projectData.structural_report} onSave={(d) => { updateProjectData('structural_report', d); saveCurrentTab('structural_report', d); }} />;
      case 'foundations':
        return <Foundations data={projectData.foundations} onSave={(d) => { updateProjectData('foundations', d); saveCurrentTab('foundations', d); }} />;
      case 'columnsWalls':
        return <ColumnsWalls data={projectData.columns_walls} onSave={(d) => { updateProjectData('columns_walls', d); saveCurrentTab('columns_walls', d); }} />;
      case 'beamSlab':
        return <BeamSlab data={projectData.beam_slab} onSave={(d) => { updateProjectData('beam_slab', d); saveCurrentTab('beam_slab', d); }} />;
      case 'electricalReport':
        return <ElectricalReport data={projectData.electrical} onSave={(d) => { updateProjectData('electrical', d); saveCurrentTab('electrical', d); }} />;
      case 'plumbingReport':
        return <PlumbingReport data={projectData.plumbing} onSave={(d) => { updateProjectData('plumbing', d); saveCurrentTab('plumbing', d); }} />;
      case 'technicalObservations':
        return <TechnicalNotes data={projectData.technical_notes} onSave={(d) => { updateProjectData('technical_notes', d); saveCurrentTab('technical_notes', d); }} />;
      case 'finalReport':
        return <FinalReport data={projectData.final_report} onSave={(d) => { updateProjectData('final_report', d); saveCurrentTab('final_report', d); }} />;
      case 'pdfExport':
        return <GenerateReports projectData={projectData as unknown as Record<string, unknown>} />;
      case 'settings':
        return <SettingsPanel />;
      case 'about':
        return <AboutPanel />;
      default:
        return <BuildingInfo data={projectData.building_data} onSave={(d) => { updateProjectData('building_data', d); saveCurrentTab('building_data', d); }} />;
    }
  };

  const currentProject = projects.find((p: { id: string }) => p.id === currentProjectId);

  // Whether cloud features are available
  const cloudAvailable = canSyncCloud();
  const onlineAndCloud = cloudAvailable && connectionStatus === 'online';

  // Reusable save buttons section
  const renderSaveButtons = (compact: boolean = false) => (
    <div className={compact ? 'grid grid-cols-2 gap-1.5 mb-1' : 'grid grid-cols-2 gap-2 mb-2'}>
      {/* 💾 حفظ محلي */}
      <Button
        size="sm"
        variant="outline"
        className={compact ? 'h-8 text-[10px] gap-1 leading-tight' : 'h-9 text-xs gap-1.5'}
        onClick={handleSaveLocal}
        disabled={!currentProjectId}
      >
        <HardDrive className={compact ? 'w-3.5 h-3.5 shrink-0' : 'w-4 h-4 shrink-0'} />
        <span>💾 {t.saveLocal}</span>
      </Button>

      {/* 📁 حفظ كملف */}
      <Button
        size="sm"
        variant="outline"
        className={compact ? 'h-8 text-[10px] gap-1 leading-tight' : 'h-9 text-xs gap-1.5'}
        onClick={handleSaveAsFile}
        disabled={!currentProjectId}
      >
        <Download className={compact ? 'w-3.5 h-3.5 shrink-0' : 'w-4 h-4 shrink-0'} />
        <span>📁 {t.saveAsFile}</span>
      </Button>

      {/* ☁️ حفظ سحابي — Only if canSyncCloud */}
      {cloudAvailable && (
        <Button
          size="sm"
          className={`${compact ? 'h-8 text-[10px] gap-1 leading-tight' : 'h-9 text-xs gap-1.5'} bg-emerald-600 hover:bg-emerald-700 text-white`}
          onClick={handleSaveCloud}
          disabled={!currentProjectId || !onlineAndCloud}
        >
          <Cloud className={compact ? 'w-3.5 h-3.5 shrink-0' : 'w-4 h-4 shrink-0'} />
          <span>☁️ {t.saveCloud}</span>
        </Button>
      )}

      {/* 📥 استيراد ملف */}
      <Button
        size="sm"
        variant="outline"
        className={compact ? 'h-8 text-[10px] gap-1 leading-tight' : 'h-9 text-xs gap-1.5'}
        onClick={handleImportFile}
      >
        <Upload className={compact ? 'w-3.5 h-3.5 shrink-0' : 'w-4 h-4 shrink-0'} />
        <span>📥 {t.importFile}</span>
      </Button>

      {/* 🔄 مزامنة الآن — Only if canSyncCloud and online */}
      {cloudAvailable && (
        <Button
          size="sm"
          variant="outline"
          className={`${compact ? 'h-8 text-[10px] gap-1 leading-tight col-span-2' : 'h-9 text-xs gap-1.5 col-span-2'}`}
          onClick={handleSyncNow}
          disabled={!onlineAndCloud || isSyncing}
        >
          <RotateCcw className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>🔄 {t.syncNow}</span>
        </Button>
      )}
    </div>
  );

  // Last save time display
  const renderLastSaveTime = () => {
    if (!lastSaveTime) return null;
    return (
      <div className="text-[10px] text-muted-foreground mb-2 text-center">
        {t.lastSave}: {lastSaveTimeDisplay}
      </div>
    );
  };

  // Reusable project management section
  const renderProjectManagement = (onAfterSelect?: () => void) => (
    <div className="p-3 border-b">
      {/* Section Title */}
      <div className="flex items-center gap-2 mb-2">
        <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{t.projectManagement}</span>
      </div>

      {/* Save Buttons */}
      {renderSaveButtons(true)}
      {renderLastSaveTime()}

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-2 gap-1.5 mb-2.5">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-[10px] gap-1 leading-tight"
          onClick={() => setShowNewProject(true)}
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          <span>{t.newProject}</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-[10px] gap-1 leading-tight"
          onClick={fetchProjectsOfflineFirst}
        >
          <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{t.refreshData}</span>
        </Button>
      </div>

      {/* Accordion Toggle */}
      <button
        onClick={() => setAccordionOpen(!accordionOpen)}
        className="flex items-center justify-between w-full py-1.5 px-2 rounded-md hover:bg-accent transition-all duration-200"
      >
        <span className="text-xs font-medium text-muted-foreground">{t.projects}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
            accordionOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Accordion Content - Animated */}
      <div
        className={`grid transition-all duration-200 ease-in-out ${
          accordionOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
        style={{ transitionProperty: 'grid-template-rows, opacity' }}
      >
        <div className="overflow-hidden min-h-0">
          <div className="pt-1">
            <ScrollArea className="max-h-60">
              {projects.map((p: { id: string; name: string; is_current: boolean; lastSavedAt?: string | null; isDirty?: boolean }) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-sm transition-all duration-150 mb-0.5 group ${
                    p.id === currentProjectId
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                      : 'hover:bg-accent'
                  }`}
                >
                  {/* Load/Select Button */}
                  <button
                    className="flex items-center gap-2 flex-1 min-w-0 rounded-sm"
                    onClick={() => {
                      handleSelectProject(p.id);
                      onAfterSelect?.();
                    }}
                    title={`📂 ${t.loadProject}`}
                  >
                    <FolderOpen
                      className={`w-3.5 h-3.5 shrink-0 ${
                        p.id === currentProjectId
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                    <span className="truncate text-xs">{p.name}</span>
                    {p.is_current && (
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    )}
                    {p.isDirty && (
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title={t.notSynced} />
                    )}
                  </button>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    {/* 📥 استدعاء */}
                    <button
                      className="p-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-150"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRecallProject(p.id);
                        onAfterSelect?.();
                      }}
                      title={`📥 ${t.recallProject}`}
                    >
                      <Inbox className="w-3 h-3" />
                    </button>
                    <button
                      className="p-1 rounded hover:bg-accent/80 text-muted-foreground hover:text-foreground transition-all duration-150"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditProjectId(p.id);
                        setEditProjectName(p.name);
                      }}
                      title={`✏️ ${t.edit}`}
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-all duration-150"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteProjectId(p.id);
                      }}
                      title={`🗑️ ${t.delete}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              {projects.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">{t.noProjects}</p>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );

  // ====== Reusable Sidebar Content (shared between desktop & mobile) ======
  const renderSidebarContent = (onAfterSelect?: () => void) => (
    <>
      {/* Professional Header with Enhanced Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-800 via-teal-500 to-emerald-400 dark:from-emerald-950 dark:via-teal-700 dark:to-emerald-600">
        {/* Diagonal engineering lines background */}
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 8px,
            rgba(255,255,255,0.5) 8px,
            rgba(255,255,255,0.5) 9px
          )`
        }} />
        <div className="relative p-5 text-center">
          {/* Logo — slightly larger */}
          <div className="mx-auto mb-3 w-[72px] h-[72px] rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/20">
            <Image
              src="/logo-circle.png"
              alt="B.S"
              width={60}
              height={60}
              className="rounded-lg"
            />
          </div>
          {/* App Name — larger and bolder */}
          <h2 className="text-xl font-extrabold text-white tracking-wide">B.S Evaluation</h2>
          {/* Subtitle — Arabic */}
          <p className="text-xs text-emerald-100/80 mt-1 leading-relaxed font-light">{t.appFullName}</p>
          {/* Copyright — very small */}
          <p className="text-[8px] text-emerald-100/50 mt-2 leading-tight">{t.copyright}</p>
        </div>
      </div>

      {/* Project Management Section */}
      {renderProjectManagement(onAfterSelect)}

      <Separator />

      {/* Grouped Tab Navigation */}
      <ScrollArea className="flex-1 px-2 py-1">
        <nav className="space-y-0">
          {sidebarGroups.map((group, groupIndex) => {
            const GroupIcon = group.icon;
            const isExpanded = expandedGroups[group.id];
            const hasActiveItem = group.items.some((item) => item.id === activeTab);
            const isLabelOnly = group.items.length === 0;

            // For label-only groups (like structuralEval), render a non-clickable divider
            if (isLabelOnly) {
              return (
                <div key={group.id} className="py-2">
                  <div className="h-px bg-border/40 mx-2 mb-2" />
                  <div className={`flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider ${group.colorClass} opacity-70`}>
                    <GroupIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{group.label}</span>
                  </div>
                </div>
              );
            }

            return (
              <div key={group.id}>
                {/* Group Header — clickable to expand/collapse */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    hasActiveItem
                      ? `${group.bgClass} ${group.colorClass}`
                      : 'text-muted-foreground hover:bg-accent/50'
                  }`}
                >
                  <GroupIcon className={`w-4 h-4 shrink-0 ${hasActiveItem ? group.colorClass : ''}`} />
                  <span className="flex-1 text-start truncate">{group.label}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    } ${hasActiveItem ? group.colorClass : 'text-muted-foreground'}`}
                  />
                </button>

                {/* Group Items — animated expand/collapse */}
                <div
                  className={`grid transition-all duration-200 ease-in-out ${
                    isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                  style={{ transitionProperty: 'grid-template-rows, opacity' }}
                >
                  <div className="overflow-hidden min-h-0">
                    <div className="ps-4 pe-1 pt-0.5 space-y-1">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        const isActive = activeTab === item.id;
                        const isSpecial = 'isSpecial' in item && item.isSpecial;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              if (isSpecial) {
                                // savedProjects — toggle projects panel
                                setShowProjectsPanel(true);
                                setAccordionOpen(true);
                              } else {
                                setActiveTab(item.id);
                              }
                              onAfterSelect?.();
                            }}
                            className={`relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] transition-all duration-200 group ${
                              isActive && !isSpecial
                                ? `bg-emerald-500/10 ${group.colorClass} font-semibold shadow-sm shadow-emerald-500/5`
                                : isSpecial
                                ? 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            }`}
                          >
                            {/* Active indicator bar — 4px on the start side (RTL-aware) */}
                            {isActive && !isSpecial && (
                              <div className={`absolute top-1.5 bottom-1.5 ${isRTL ? 'right-0' : 'left-0'} w-1 rounded-full bg-emerald-500`} />
                            )}
                            <ItemIcon
                              className={`w-4 h-4 shrink-0 transition-all duration-200 ${
                                isActive && !isSpecial
                                  ? `${group.colorClass}`
                                  : ''
                              }`}
                              {...(isActive && !isSpecial ? { fill: 'currentColor', fillOpacity: 0.15 } : {})}
                            />
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Visible divider between groups */}
                {groupIndex < sidebarGroups.length - 1 && (
                  <div className="my-2 mx-3 h-px bg-border/40" />
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Bottom User Section — Enhanced */}
      <div className="border-t bg-card/80">
        {/* User Info */}
        <div className="p-3">
          <div className="flex items-center gap-2.5">
            {/* User Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-sm font-bold shadow-md ring-2 ring-white/20">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.fullName}</p>
              <p className="text-[11px] text-muted-foreground truncate">@{user?.username}</p>
            </div>
          </div>
          {/* Quick Links */}
          <div className="flex items-center gap-1 mt-2">
            <button
              onClick={() => { setActiveTab('settings'); onAfterSelect?.(); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{t.settings}</span>
            </button>
            <button
              onClick={() => { setActiveTab('about'); onAfterSelect?.(); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
            >
              <AppWindow className="w-3.5 h-3.5" />
              <span>{t.about}</span>
            </button>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
              onClick={handleLogout}
              title={t.logout}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {/* Connection Status */}
        <div className="px-3 pb-2.5">
          <div className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md ${
            connectionStatus === 'online'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 text-red-500 dark:text-red-400'
          }`}>
            {connectionStatus === 'online' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{connectionStatus === 'online' ? (isRTL ? 'متصل' : 'Online') : (isRTL ? 'غير متصل' : 'Offline')}</span>
          </div>
        </div>
      </div>
    </>
  );

  // Find which group a tab belongs to (for mobile bottom nav highlighting)
  const getActiveGroupColor = () => {
    const group = sidebarGroups.find((g) => g.items.some((i) => i.id === activeTab));
    return group?.colorClass || 'text-emerald-600';
  };

  return (
    <div className="min-h-screen flex flex-col bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="no-print sticky top-0 z-50 bg-gradient-to-r from-emerald-700 via-teal-600 to-emerald-500 text-white shadow-lg">
        <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
            <Image
              src="/logo-header.png"
              alt="B.S"
              width={32}
              height={32}
              className="rounded shrink-0"
            />
            <div>
              <h1 className="text-sm sm:text-lg font-bold leading-tight">B.S Evaluation</h1>
              <p className="text-[10px] sm:text-xs opacity-80 leading-tight hidden sm:block">{t.appFullName}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Connection Status Badge */}
            <Badge
              variant="outline"
              className={`text-[10px] sm:text-xs gap-1 px-1.5 py-0.5 border-0 ${
                connectionStatus === 'online'
                  ? 'bg-green-500/20 text-green-100 hover:bg-green-500/30'
                  : connectionStatus === 'checking'
                  ? 'bg-yellow-500/20 text-yellow-100 hover:bg-yellow-500/30'
                  : 'bg-red-500/20 text-red-100 hover:bg-red-500/30'
              }`}
            >
              {connectionStatus === 'online' ? (
                <>
                  <Wifi className="w-3 h-3" />
                  <span className="hidden sm:inline">{isRTL ? 'متصل' : 'Online'}</span>
                </>
              ) : connectionStatus === 'checking' ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span className="hidden sm:inline">{isRTL ? 'جاري الفحص' : 'Checking'}</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  <span className="hidden sm:inline">{isRTL ? 'غير متصل' : 'Offline'}</span>
                </>
              )}
            </Badge>

            {/* Project selector (mobile) */}
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 text-xs sm:text-sm"
              onClick={() => setShowProjectsPanel(true)}
            >
              <Building2 className="w-4 h-4 ms-1 sm:me-2 sm:ms-0" />
              <span className="hidden sm:inline max-w-[150px] truncate">
                {currentProject?.name || t.projects}
              </span>
              <span className="sm:hidden">...</span>
            </Button>

            {user?.role === 'admin' && (
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={() => router.push('/admin')}
              >
                <Shield className="w-4 h-4 ms-1" />
                <span className="hidden sm:inline">{t.userManagement}</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Desktop */}
        <aside className="no-print hidden lg:flex w-[272px] flex-col border-e bg-card border-sidebar-border overflow-hidden shrink-0">
          {renderSidebarContent()}
        </aside>

        {/* Mobile Sidebar — Sheet Component */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side={isRTL ? 'right' : 'left'} className="w-[280px] p-0 overflow-hidden flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            {renderSidebarContent(() => setSidebarOpen(false))}
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Mobile Scrollable Tab Bar */}
          <div className="no-print lg:hidden sticky top-0 z-30 bg-card/95 backdrop-blur border-b">
            <div className="overflow-x-auto scroll-smooth snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              <div className="flex gap-1 p-2">
                {allTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  // Find group color for this tab
                  const tabGroup = sidebarGroups.find((g) => g.items.some((i) => i.id === tab.id));
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`snap-start flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-200 ${
                        isActive
                          ? `${tabGroup?.bgClass || 'bg-emerald-500/15'} ${tabGroup?.colorClass || 'text-emerald-700'} font-semibold shadow-sm`
                          : 'bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto" id="report-content">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent" />
              </div>
            ) : (
              renderTabContent()
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar — Enhanced */}
      <nav className="no-print lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border/80 safe-area-bottom">
        <div className="flex justify-around items-center px-1 py-1.5">
          {/* المشاريع */}
          <button
            onClick={() => setShowProjectsPanel(true)}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200 ${
              false
                ? 'text-emerald-600 dark:text-emerald-400 bg-gradient-to-br from-emerald-500/15 to-teal-500/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="p-1 rounded-lg">
              <FolderOpen className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium">{t.projects}</span>
          </button>

          {/* التقرير الإنشائي */}
          <button
            onClick={() => setActiveTab('structuralReport')}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200 ${
              ['structuralReport', 'foundations', 'columnsWalls', 'beamSlab', 'technicalObservations', 'finalReport'].includes(activeTab)
                ? 'text-[#5B8DB8] dark:text-[#7BAED4] bg-gradient-to-br from-[#5B8DB8]/15 to-[#5B8DB8]/5'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="p-1 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium">{t.groupStructural}</span>
          </button>

          {/* توليد التقارير */}
          <button
            onClick={() => setActiveTab('pdfExport')}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200 ${
              activeTab === 'pdfExport'
                ? 'text-[#8B7EC8] dark:text-[#A99BE0] bg-gradient-to-br from-[#8B7EC8]/15 to-[#8B7EC8]/5'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="p-1 rounded-lg">
              <ClipboardList className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium">{t.pdfExport}</span>
          </button>

          {/* عام */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200 ${
              ['settings', 'about'].includes(activeTab)
                ? 'text-[#8B8FA3] dark:text-[#A0A4B8] bg-gradient-to-br from-[#8B8FA3]/15 to-[#8B8FA3]/5'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="p-1 rounded-lg">
              <Settings className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium">{t.groupGeneral}</span>
          </button>
        </div>
      </nav>

      {/* New Project Dialog */}
      <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
        <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t.newProject}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>{t.projectName}</Label>
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder={t.projectName}
                className="mt-1"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewProject(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Project Dialog */}
      <Dialog open={!!editProjectId} onOpenChange={() => setEditProjectId(null)}>
        <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t.edit}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>{t.projectName}</Label>
              <Input
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
                className="mt-1"
                onKeyDown={(e) => e.key === 'Enter' && handleRenameProject()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProjectId(null)}>
              {t.cancel}
            </Button>
            <Button onClick={handleRenameProject} disabled={!editProjectName.trim()}>
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteProjectId} onOpenChange={() => setDeleteProjectId(null)}>
        <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmDelete}</AlertDialogTitle>
            <AlertDialogDescription>{t.confirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-white">
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Projects Panel (Mobile) — with Project Management */}
      <Dialog open={showProjectsPanel} onOpenChange={setShowProjectsPanel}>
        <DialogContent dir={isRTL ? 'rtl' : 'ltr'} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              {t.projects}
            </DialogTitle>
          </DialogHeader>

          {/* Save Buttons */}
          {renderSaveButtons(false)}
          {renderLastSaveTime()}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-xs gap-1.5"
              onClick={() => { setShowProjectsPanel(false); setShowNewProject(true); }}
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>{t.newProject}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-xs gap-1.5"
              onClick={fetchProjectsOfflineFirst}
            >
              <RefreshCw className={`w-4 h-4 shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{t.refreshData}</span>
            </Button>
          </div>

          <Separator className="mb-2" />

          {/* Project List with Accordion */}
          <div className="max-h-72 overflow-y-auto">
            <button
              onClick={() => setAccordionOpen(!accordionOpen)}
              className="flex items-center justify-between w-full py-2 px-3 rounded-md hover:bg-accent transition-all duration-200 mb-1"
            >
              <span className="text-sm font-medium text-muted-foreground">{t.savedProjects} ({projects.length})</span>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                  accordionOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            <div
              className={`grid transition-all duration-200 ease-in-out ${
                accordionOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
              style={{ transitionProperty: 'grid-template-rows, opacity' }}
            >
              <div className="overflow-hidden min-h-0">
                <div className="space-y-1.5">
                  {projects.map((p: { id: string; name: string; is_current: boolean; lastSavedAt?: string | null; isDirty?: boolean }) => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-3 rounded-lg transition-all duration-150 ${
                        p.id === currentProjectId
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                          : 'hover:bg-accent border border-transparent'
                      }`}
                    >
                      <button
                        className="flex items-center gap-2 flex-1 min-w-0"
                        onClick={() => handleSelectProject(p.id)}
                        title={`📂 ${t.loadProject}`}
                      >
                        <FolderOpen
                          className={`w-4 h-4 shrink-0 ${
                            p.id === currentProjectId
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-muted-foreground'
                          }`}
                        />
                        <span className="truncate text-sm">{p.name}</span>
                        {p.is_current && (
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        )}
                        {p.isDirty && (
                          <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title={t.notSynced} />
                        )}
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        {/* 📥 استدعاء */}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRecallProject(p.id);
                            setShowProjectsPanel(false);
                          }}
                          title={`📥 ${t.recallProject}`}
                        >
                          <Inbox className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditProjectId(p.id);
                            setEditProjectName(p.name);
                            setShowProjectsPanel(false);
                          }}
                          title={`✏️ ${t.edit}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteProjectId(p.id);
                            setShowProjectsPanel(false);
                          }}
                          title={`🗑️ ${t.delete}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {projects.length === 0 && (
                    <p className="text-center text-muted-foreground py-4 text-sm">{t.noProjects}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom padding for mobile nav */}
      <div className="h-16 lg:hidden" />
    </div>
  );
}
