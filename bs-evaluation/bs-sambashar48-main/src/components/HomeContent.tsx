'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore, useUIStore } from '@/stores';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Building2,
  FileText,
  Home,
  Columns3,
  Layers,
  Zap,
  Droplets,
  ClipboardCheck,
  FileOutput,
  Settings,
  Info,
  LogOut,
  Shield,
  Menu,
  X,
  Plus,
  Trash2,
  Edit3,
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

export default function HomeContent() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
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
  } = useProjectStore();

  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [showProjectsPanel, setShowProjectsPanel] = useState(false);

  // Fetch projects after auth is confirmed
  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    }
  }, [isAuthenticated]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/projects', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setProjects(data);

      const current = data.find((p: { is_current: boolean }) => p.is_current);
      if (current) {
        setCurrentProjectId(current.id);
        loadProjectData(current.id);
      }
    } catch {
      // silent - don't logout on network errors
    } finally {
      setLoading(false);
    }
  };

  const loadProjectData = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        Object.keys(data).forEach((key) => {
          if (key !== 'id' && key !== 'user_id' && key !== 'name' && key !== 'is_current' && key !== 'created_at' && key !== 'updated_at') {
            updateProjectData(key as keyof typeof projectData, data[key] || {});
          }
        });
      }
    } catch {
      // silent fail
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim() }),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error);
        return;
      }
      toast.success('تم إنشاء المشروع بنجاح');
      setShowNewProject(false);
      setNewProjectName('');
      fetchProjects();
    } catch {
      toast.error('فشل إنشاء المشروع');
    }
  };

  const handleSelectProject = async (projectId: string) => {
    const previousProjectId = currentProjectId;
    setCurrentProjectId(projectId);
    loadProjectData(projectId);
    setShowProjectsPanel(false);
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_current: true }),
        credentials: 'include',
      });
    } catch {
      setCurrentProjectId(previousProjectId);
      toast.error('فشل تحديد المشروع');
    }
  };

  const handleRenameProject = async () => {
    if (!editProjectName.trim() || !editProjectId) return;
    try {
      const res = await fetch(`/api/projects/${editProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editProjectName.trim() }),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error);
        return;
      }
      toast.success('تم تعديل اسم المشروع');
      setEditProjectId(null);
      fetchProjects();
    } catch {
      toast.error('فشل تعديل المشروع');
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteProjectId) return;
    const previousProjects = [...projects];
    setProjects(projects.filter((p: { id: string }) => p.id !== deleteProjectId));
    try {
      const res = await fetch(`/api/projects/${deleteProjectId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error);
        setProjects(previousProjects);
        return;
      }
      toast.success('تم حذف المشروع');
      setDeleteProjectId(null);
      fetchProjects();
    } catch {
      setProjects(previousProjects);
      toast.error('فشل حذف المشروع');
    }
  };

  const handleLogout = () => {
    logout();
  };

  const saveCurrentTab = useCallback(
    async (section: string, data: Record<string, unknown>) => {
      if (!currentProjectId || user?.role === 'admin') return;
      try {
        await fetch(`/api/projects/${currentProjectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [section]: data }),
          credentials: 'include',
        });
      } catch { /* silent fail */ }
    },
    [currentProjectId, user?.role]
  );

  // Show loading while verifying auth
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  const tabs = [
    { id: 'buildingData', label: t.buildingData, icon: Building2 },
    { id: 'architecturalReport', label: t.architecturalReport, icon: Home },
    { id: 'structuralReport', label: t.structuralReport, icon: FileText },
    { id: 'foundations', label: t.foundations, icon: Layers },
    { id: 'columnsWalls', label: t.columnsWalls, icon: Columns3 },
    { id: 'beamSlab', label: t.beamSlab, icon: Layers },
    { id: 'electricalReport', label: t.electricalReport, icon: Zap },
    { id: 'plumbingReport', label: t.plumbingReport, icon: Droplets },
    { id: 'technicalObservations', label: t.technicalObservations, icon: ClipboardCheck },
    { id: 'finalReport', label: t.finalReport, icon: FileText },
    { id: 'pdfExport', label: t.pdfExport, icon: FileOutput },
    { id: 'settings', label: t.settings, icon: Settings },
    { id: 'about', label: t.about, icon: Info },
  ];

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
        return <GenerateReports projectData={projectData} />;
      case 'settings':
        return <SettingsPanel />;
      case 'about':
        return <AboutPanel />;
      default:
        return <BuildingInfo data={projectData.building_data} onSave={(d) => { updateProjectData('building_data', d); saveCurrentTab('building_data', d); }} />;
    }
  };

  const currentProject = projects.find((p: { id: string }) => p.id === currentProjectId);

  return (
    <div className="min-h-screen flex flex-col bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="no-print sticky top-0 z-50 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg">
        <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
            <Building2 className="w-6 h-6 sm:w-7 sm:h-7 shrink-0" />
            <div>
              <h1 className="text-sm sm:text-lg font-bold leading-tight">B.S Evaluation</h1>
              <p className="text-[10px] sm:text-xs opacity-80 leading-tight hidden sm:block">{t.appSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 text-xs sm:text-sm" onClick={() => setShowProjectsPanel(true)}>
              <Building2 className="w-4 h-4 ms-1 sm:me-2 sm:ms-0" />
              <span className="hidden sm:inline max-w-[150px] truncate">{currentProject?.name || t.projects}</span>
              <span className="sm:hidden">...</span>
            </Button>
            {user?.role === 'admin' && (
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => router.push('/admin')}>
                <Shield className="w-4 h-4 ms-1" />
                <span className="hidden sm:inline">{t.admin}</span>
              </Button>
            )}
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Desktop */}
        <aside className="no-print hidden lg:flex w-64 flex-col border-e bg-card border-sidebar-border overflow-y-auto shrink-0">
          <div className="p-3 border-b">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">{t.projects}</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowNewProject(true)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <ScrollArea className="max-h-40">
              {projects.map((p: { id: string; name: string; is_current: boolean }) => (
                <div key={p.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors mb-0.5 ${p.id === currentProjectId ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`} onClick={() => handleSelectProject(p.id)}>
                  <span className="truncate flex-1">{p.name}</span>
                  {p.is_current && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground/60 shrink-0" />}
                </div>
              ))}
              {projects.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">{t.noProjects}</p>}
            </ScrollArea>
          </div>
          <Separator />
          <ScrollArea className="flex-1 py-2 px-2">
            <nav className="space-y-0.5">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${isActive ? 'bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-700 dark:text-emerald-400 font-medium shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}>
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </ScrollArea>
          <div className="p-3 border-t">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">@{user?.username}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <div className="no-print fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)}>
            <aside className="w-72 h-full bg-card border-e overflow-y-auto shadow-xl" dir={isRTL ? 'rtl' : 'ltr'} onClick={(e) => e.stopPropagation()}>
              {user?.role !== 'admin' && (
                <div className="p-3 border-b">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">{t.projects}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowNewProject(true)}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <ScrollArea className="max-h-40">
                    {projects.map((p: { id: string; name: string; is_current: boolean }) => (
                      <div key={p.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors mb-0.5 ${p.id === currentProjectId ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`} onClick={() => { handleSelectProject(p.id); setSidebarOpen(false); }}>
                        <span className="truncate flex-1">{p.name}</span>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}
              <Separator />
              <ScrollArea className="flex-1 py-2 px-2 max-h-[calc(100vh-200px)]">
                <nav className="space-y-0.5">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === tab.id ? 'bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-700 dark:text-emerald-400 font-medium' : 'text-muted-foreground hover:bg-accent'}`}>
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </ScrollArea>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="no-print lg:hidden sticky top-0 z-30 bg-card/95 backdrop-blur border-b">
            <ScrollArea className="w-full">
              <div className="flex gap-1 p-2 min-w-max">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${isActive ? 'bg-emerald-600 text-white shadow-md' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
          <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto" id="report-content">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent" />
              </div>
            ) : renderTabContent()}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="no-print lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border px-2 py-1 flex justify-around safe-area-bottom">
        <button onClick={() => setShowProjectsPanel(true)} className="flex flex-col items-center gap-0.5 py-1 px-2 text-muted-foreground">
          <Building2 className="w-5 h-5" /><span className="text-[10px]">{t.projects}</span>
        </button>
        <button onClick={() => setActiveTab('pdfExport')} className="flex flex-col items-center gap-0.5 py-1 px-2 text-muted-foreground">
          <FileOutput className="w-5 h-5" /><span className="text-[10px]">{t.pdfExport}</span>
        </button>
        <button onClick={() => setActiveTab('settings')} className="flex flex-col items-center gap-0.5 py-1 px-2 text-muted-foreground">
          <Settings className="w-5 h-5" /><span className="text-[10px]">{t.settings}</span>
        </button>
        <button onClick={() => setActiveTab('about')} className="flex flex-col items-center gap-0.5 py-1 px-2 text-muted-foreground">
          <Info className="w-5 h-5" /><span className="text-[10px]">{t.about}</span>
        </button>
      </nav>

      {/* Dialogs */}
      <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
        <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader><DialogTitle>{t.newProject}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>{t.projectName}</Label><Input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder={t.projectName} className="mt-1" onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewProject(false)}>{t.cancel}</Button>
            <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>{t.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editProjectId} onOpenChange={() => setEditProjectId(null)}>
        <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader><DialogTitle>{t.edit}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>{t.projectName}</Label><Input value={editProjectName} onChange={(e) => setEditProjectName(e.target.value)} className="mt-1" onKeyDown={(e) => e.key === 'Enter' && handleRenameProject()} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProjectId(null)}>{t.cancel}</Button>
            <Button onClick={handleRenameProject} disabled={!editProjectName.trim()}>{t.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteProjectId} onOpenChange={() => setDeleteProjectId(null)}>
        <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmDelete}</AlertDialogTitle>
            <AlertDialogDescription>{t.confirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-white">{t.delete}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showProjectsPanel} onOpenChange={setShowProjectsPanel}>
        <DialogContent dir={isRTL ? 'rtl' : 'ltr'} className="max-w-md">
          <DialogHeader><DialogTitle>{t.projects}</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {projects.map((p: { id: string; name: string; is_current: boolean }) => (
              <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${p.id === currentProjectId ? 'bg-primary/10 border border-primary/20' : 'hover:bg-accent border border-transparent'}`} onClick={() => handleSelectProject(p.id)}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {p.is_current && <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
                  <span className="truncate text-sm">{p.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditProjectId(p.id); setEditProjectName(p.name); setShowProjectsPanel(false); }}>
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteProjectId(p.id); setShowProjectsPanel(false); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {projects.length === 0 && <p className="text-center text-muted-foreground py-4">{t.noProjects}</p>}
          </div>
          <DialogFooter>
            <Button onClick={() => { setShowProjectsPanel(false); setShowNewProject(true); }} className="w-full">
              <Plus className="w-4 h-4 me-2" />{t.newProject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="h-16 lg:hidden" />
    </div>
  );
}
