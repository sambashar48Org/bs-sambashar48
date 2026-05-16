'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useTranslation } from '@/lib/i18n';
import { EVALUATION_CATEGORIES, ENGINEERING_DISCIPLINES, APPROVAL_TYPES } from '@/lib/constants';
import {
  FileText,
  Edit3,
  Save,
  Plus,
  Trash2,
  ClipboardList,
  CheckCircle2,
  ShieldCheck,
  Users,
  PenTool,
} from 'lucide-react';
import { toast } from 'sonner';

// ======== Types ========
interface EngineerEntry {
  id: string;
  sequence: number;
  discipline: string;
  name: string;
  licenseNumber: string;
  signature: string;
}

interface ApprovalEntry {
  id: string;
  sequence: number;
  role: string;
  name: string;
  discipline: string;
  date: string;
  signature: string;
}

interface FinalReportData {
  requirements: string;
  overallEvaluation: string;
  reportPurpose: string;
  reportPurposeDescription: string;
  engineers: EngineerEntry[];
  approvals: ApprovalEntry[];
}

interface FinalReportProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
}

// ======== Helpers ========
const generateId = () => crypto.randomUUID();

const defaultFormData: FinalReportData = {
  requirements: '',
  overallEvaluation: '',
  reportPurpose: '',
  reportPurposeDescription: '',
  engineers: [],
  approvals: [],
};

function parseEngineers(raw: unknown): EngineerEntry[] {
  if (Array.isArray(raw)) {
    return raw.filter(
      (e): e is EngineerEntry =>
        typeof e === 'object' && e !== null && 'id' in e
    );
  }
  return [];
}

function parseApprovals(raw: unknown): ApprovalEntry[] {
  if (Array.isArray(raw)) {
    return raw.filter(
      (e): e is ApprovalEntry =>
        typeof e === 'object' && e !== null && 'id' in e
    );
  }
  return [];
}

function computeInitialData(data: Record<string, unknown>): FinalReportData {
  return {
    requirements: typeof data.requirements === 'string' ? data.requirements : defaultFormData.requirements,
    overallEvaluation: typeof data.overallEvaluation === 'string' ? data.overallEvaluation : defaultFormData.overallEvaluation,
    reportPurpose: typeof data.reportPurpose === 'string' ? data.reportPurpose : defaultFormData.reportPurpose,
    reportPurposeDescription: typeof data.reportPurposeDescription === 'string' ? data.reportPurposeDescription : defaultFormData.reportPurposeDescription,
    engineers: parseEngineers(data.engineers),
    approvals: parseApprovals(data.approvals),
  };
}

const evaluationColorMap: Record<string, string> = {
  'آمن': 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300',
  'يحتاج مراقبة': 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300',
  'يحتاج ترميم': 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300',
  'غير آمن': 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300',
  'خطر': 'bg-red-200 text-red-900 border-red-400 dark:bg-red-900/50 dark:text-red-200',
};

const evaluationBadgeClass = (value: string): string =>
  evaluationColorMap[value] || 'bg-muted text-muted-foreground border-border';

const REPORT_PURPOSE_OPTIONS = [
  { value: 'تقرير وضع راهن', label: 'تقرير وضع راهن' },
  { value: 'تقرير إضافة طابق', label: 'تقرير إضافة طابق' },
];

// ======== Component ========
export default function FinalReport({ data, onSave }: FinalReportProps) {
  const { t, isRTL } = useTranslation();

  const [formData, setFormData] = useState<FinalReportData>(() => computeInitialData(data));
  const [isEditing, setIsEditing] = useState(false);
  const [prevData, setPrevData] = useState(data);

  // Sync when data prop changes (project switch)
  if (prevData !== data) {
    setPrevData(data);
    setFormData(computeInitialData(data));
    setIsEditing(false);
  }

  // ======== Label mapping functions (translate display, keep Arabic values for DB) ========
  const getEvaluationLabel = (value: string): string => {
    const map: Record<string, string> = {
      'آمن': t.evalSafe,
      'يحتاج مراقبة': t.evalMonitoring,
      'يحتاج ترميم': t.evalRepair,
      'غير آمن': t.evalUnsafe,
      'خطر': t.evalDanger,
    };
    return map[value] || value;
  };

  const getPurposeLabel = (value: string): string => {
    const map: Record<string, string> = {
      'تقرير وضع راهن': t.purposeCurrentState,
      'تقرير إضافة طابق': t.purposeAddFloor,
    };
    return map[value] || value;
  };

  // Field updaters
  const updateField = useCallback(<K extends keyof FinalReportData>(key: K, value: FinalReportData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Engineers CRUD
  const addEngineer = useCallback(() => {
    const newEntry: EngineerEntry = {
      id: generateId(),
      sequence: formData.engineers.length + 1,
      discipline: '',
      name: '',
      licenseNumber: '',
      signature: '',
    };
    updateField('engineers', [...formData.engineers, newEntry]);
  }, [formData.engineers, updateField]);

  const updateEngineer = useCallback((id: string, updates: Partial<EngineerEntry>) => {
    updateField(
      'engineers',
      formData.engineers.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  }, [formData.engineers, updateField]);

  const deleteEngineer = useCallback((id: string) => {
    updateField(
      'engineers',
      formData.engineers.filter((e) => e.id !== id).map((e, i) => ({ ...e, sequence: i + 1 }))
    );
  }, [formData.engineers, updateField]);

  // Approvals CRUD
  const addApproval = useCallback(() => {
    const newEntry: ApprovalEntry = {
      id: generateId(),
      sequence: formData.approvals.length + 1,
      role: '',
      name: '',
      discipline: '',
      date: '',
      signature: '',
    };
    updateField('approvals', [...formData.approvals, newEntry]);
  }, [formData.approvals, updateField]);

  const updateApproval = useCallback((id: string, updates: Partial<ApprovalEntry>) => {
    updateField(
      'approvals',
      formData.approvals.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  }, [formData.approvals, updateField]);

  const deleteApproval = useCallback((id: string) => {
    updateField(
      'approvals',
      formData.approvals.filter((a) => a.id !== id).map((a, i) => ({ ...a, sequence: i + 1 }))
    );
  }, [formData.approvals, updateField]);

  // Save handler
  const handleSave = useCallback(() => {
    onSave(formData as unknown as Record<string, unknown>);
    setIsEditing(false);
    toast.success(t.finalReportSaved);
  }, [formData, onSave, t]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const inputBaseClass = 'w-full text-sm';
  const labelClass = 'text-sm font-medium text-foreground/80';
  const helperClass = 'text-xs text-muted-foreground';

  return (
    <div className="space-y-6">
      {/* ===== Section 1: المتطلبات الأساسية ===== */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <FileText className="h-5 w-5" />
            </div>
            <span>{t.finalReportTitle}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* المتطلبات الأساسية والأعمال المطلوبة */}
          <div className="space-y-2">
            <Label className={labelClass}>{t.requirementsTitle}</Label>
            <p className={helperClass}>{t.requirementsTitle}</p>
            {isEditing ? (
              <Textarea
                value={formData.requirements}
                onChange={(e) => updateField('requirements', e.target.value)}
                placeholder={t.requirementsPlaceholder}
                className="min-h-[140px] resize-y"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            ) : (
              <div
                className="min-h-[80px] p-3 rounded-md border border-border bg-muted/30 text-sm whitespace-pre-wrap text-foreground/90"
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                {formData.requirements || (
                  <span className="text-muted-foreground italic">{t.noRequirementsYet}</span>
                )}
              </div>
            )}
          </div>

          {/* ===== Section 2: التقييم العام ===== */}
          <div className="space-y-2">
            <Label className={labelClass}>{t.overallEvaluation}</Label>
            <p className={helperClass}>{t.chooseEvaluation}</p>
            {isEditing ? (
              <Select
                value={formData.overallEvaluation || ''}
                onValueChange={(val) => updateField('overallEvaluation', val)}
              >
                <SelectTrigger className={inputBaseClass}>
                  <SelectValue placeholder={t.chooseEvaluation} />
                </SelectTrigger>
                <SelectContent>
                  {EVALUATION_CATEGORIES.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {getEvaluationLabel(opt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-3">
                {formData.overallEvaluation ? (
                  <Badge className={`px-4 py-1.5 text-sm border ${evaluationBadgeClass(formData.overallEvaluation)}`}>
                    {getEvaluationLabel(formData.overallEvaluation)}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground italic text-sm">{t.noEvaluation}</span>
                )}
              </div>
            )}
          </div>

          {/* ===== Section 3: غرض التقرير ===== */}
          <div className="space-y-3">
            <Label className={labelClass}>{t.reportPurpose}</Label>
            <p className={helperClass}>{t.choosePurpose}</p>
            {isEditing ? (
              <>
                <Select
                  value={formData.reportPurpose || ''}
                  onValueChange={(val) => updateField('reportPurpose', val)}
                >
                  <SelectTrigger className={inputBaseClass}>
                    <SelectValue placeholder={t.choosePurpose} />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_PURPOSE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {getPurposeLabel(opt.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="space-y-2 mt-3">
                  <Label className="text-xs font-medium text-muted-foreground">{t.additionalDescription}</Label>
                  <Textarea
                    value={formData.reportPurposeDescription}
                    onChange={(e) => updateField('reportPurposeDescription', e.target.value)}
                    placeholder={t.additionalDescPlaceholder}
                    className="min-h-[80px] resize-y"
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground/90">
                  {formData.reportPurpose ? getPurposeLabel(formData.reportPurpose) : <span className="text-muted-foreground italic">{t.noPurpose}</span>}
                </p>
                {formData.reportPurposeDescription && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap" dir={isRTL ? 'rtl' : 'ltr'}>
                    {formData.reportPurposeDescription}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ===== Section 4: جدول المهندسين ===== */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white pb-4">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Users className="h-5 w-5" />
              </div>
              <span>{t.engineersTable}</span>
            </div>
            {isEditing && (
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20 gap-1.5"
                onClick={addEngineer}
              >
                <Plus className="h-4 w-4" />
                <span className="text-xs">{t.addEngineer}</span>
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {formData.engineers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t.noEngineersYet}</p>
              {isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                  onClick={addEngineer}
                >
                  <Plus className="h-4 w-4 me-1.5" />
                  {t.addEngineer}
                </Button>
              )}
            </div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {formData.engineers.map((eng, index) => (
                <AccordionItem key={eng.id} value={eng.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 flex-1" dir={isRTL ? 'rtl' : 'ltr'}>
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 text-sm font-bold shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 text-start min-w-0">
                        <p className="text-sm font-medium truncate">
                          {eng.name || <span className="text-muted-foreground italic">{t.engineerNoName}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {eng.discipline || t.noSpecialization}
                          {eng.licenseNumber && ` — ${eng.licenseNumber}`}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 px-1" dir={isRTL ? 'rtl' : 'ltr'}>
                      {/* التسلسل */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t.sequence}</Label>
                        {isEditing ? (
                          <Input
                            type="number"
                            min={1}
                            value={eng.sequence}
                            onChange={(e) => updateEngineer(eng.id, { sequence: parseInt(e.target.value) || 1 })}
                            className="h-9"
                          />
                        ) : (
                          <p className="text-sm h-9 flex items-center px-3 rounded-md border bg-muted/30">
                            {eng.sequence}
                          </p>
                        )}
                      </div>
                      {/* الاختصاص */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t.specialization}</Label>
                        {isEditing ? (
                          <Select
                            value={eng.discipline || ''}
                            onValueChange={(val) => updateEngineer(eng.id, { discipline: val })}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder={t.chooseSpecialization} />
                            </SelectTrigger>
                            <SelectContent>
                              {ENGINEERING_DISCIPLINES.map((d) => (
                                <SelectItem key={d} value={d}>
                                  {d}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm h-9 flex items-center px-3 rounded-md border bg-muted/30">
                            {eng.discipline || '—'}
                          </p>
                        )}
                      </div>
                      {/* اسم المهندس */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t.engineerName}</Label>
                        {isEditing ? (
                          <Input
                            value={eng.name}
                            onChange={(e) => updateEngineer(eng.id, { name: e.target.value })}
                            placeholder={t.engineerNamePlaceholder}
                            className="h-9"
                          />
                        ) : (
                          <p className="text-sm h-9 flex items-center px-3 rounded-md border bg-muted/30 truncate">
                            {eng.name || '—'}
                          </p>
                        )}
                      </div>
                      {/* رقم المهندس النقابي */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t.engineerNumber}</Label>
                        {isEditing ? (
                          <Input
                            value={eng.licenseNumber}
                            onChange={(e) => updateEngineer(eng.id, { licenseNumber: e.target.value })}
                            placeholder={t.engineerNumberPlaceholder}
                            className="h-9"
                          />
                        ) : (
                          <p className="text-sm h-9 flex items-center px-3 rounded-md border bg-muted/30">
                            {eng.licenseNumber || '—'}
                          </p>
                        )}
                      </div>
                      {/* توقيع المهندس */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs text-muted-foreground">{t.engineerSignature}</Label>
                        {isEditing ? (
                          <Input
                            value={eng.signature}
                            onChange={(e) => updateEngineer(eng.id, { signature: e.target.value })}
                            placeholder={t.signatureNamePlaceholder}
                            className="h-9"
                          />
                        ) : (
                          <p className="text-sm h-9 flex items-center px-3 rounded-md border bg-muted/30 italic text-muted-foreground">
                            {eng.signature || '—'}
                          </p>
                        )}
                      </div>
                      {/* Delete button (editing only) */}
                      {isEditing && (
                        <div className="sm:col-span-2 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 gap-1.5"
                            onClick={() => deleteEngineer(eng.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="text-xs">{t.remove}</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* ===== Section 5: جدول التدقيق والتصديق ===== */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-700 to-teal-700 text-white pb-4">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span>{t.reviewTable}</span>
            </div>
            {isEditing && (
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20 gap-1.5"
                onClick={addApproval}
              >
                <Plus className="h-4 w-4" />
                <span className="text-xs">{t.add}</span>
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {formData.approvals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShieldCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t.noEntriesYet}</p>
              {isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                  onClick={addApproval}
                >
                  <Plus className="h-4 w-4 me-1.5" />
                  {t.add}
                </Button>
              )}
            </div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {formData.approvals.map((app, index) => (
                <AccordionItem key={app.id} value={app.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 flex-1" dir={isRTL ? 'rtl' : 'ltr'}>
                      <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-700 dark:text-teal-400 text-sm font-bold shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 text-start min-w-0">
                        <p className="text-sm font-medium truncate">
                          {app.name || <span className="text-muted-foreground italic">{t.noName}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {app.role || t.noEntity}
                          {app.discipline && ` — ${app.discipline}`}
                          {app.date && ` — ${app.date}`}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 px-1" dir={isRTL ? 'rtl' : 'ltr'}>
                      {/* التسلسل */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t.sequence}</Label>
                        {isEditing ? (
                          <Input
                            type="number"
                            min={1}
                            value={app.sequence}
                            onChange={(e) => updateApproval(app.id, { sequence: parseInt(e.target.value) || 1 })}
                            className="h-9"
                          />
                        ) : (
                          <p className="text-sm h-9 flex items-center px-3 rounded-md border bg-muted/30">
                            {app.sequence}
                          </p>
                        )}
                      </div>
                      {/* الجهة */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t.entity}</Label>
                        {isEditing ? (
                          <Select
                            value={app.role || ''}
                            onValueChange={(val) => updateApproval(app.id, { role: val })}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder={t.chooseEntity} />
                            </SelectTrigger>
                            <SelectContent>
                              {APPROVAL_TYPES.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {r}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm h-9 flex items-center px-3 rounded-md border bg-muted/30">
                            {app.role || '—'}
                          </p>
                        )}
                      </div>
                      {/* الاسم */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t.name}</Label>
                        {isEditing ? (
                          <Input
                            value={app.name}
                            onChange={(e) => updateApproval(app.id, { name: e.target.value })}
                            placeholder={t.name}
                            className="h-9"
                          />
                        ) : (
                          <p className="text-sm h-9 flex items-center px-3 rounded-md border bg-muted/30 truncate">
                            {app.name || '—'}
                          </p>
                        )}
                      </div>
                      {/* الاختصاص */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t.specialization}</Label>
                        {isEditing ? (
                          <Input
                            value={app.discipline}
                            onChange={(e) => updateApproval(app.id, { discipline: e.target.value })}
                            placeholder={t.specialization}
                            className="h-9"
                          />
                        ) : (
                          <p className="text-sm h-9 flex items-center px-3 rounded-md border bg-muted/30">
                            {app.discipline || '—'}
                          </p>
                        )}
                      </div>
                      {/* التاريخ */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t.date}</Label>
                        {isEditing ? (
                          <Input
                            type="date"
                            value={app.date}
                            onChange={(e) => updateApproval(app.id, { date: e.target.value })}
                            className="h-9"
                          />
                        ) : (
                          <p className="text-sm h-9 flex items-center px-3 rounded-md border bg-muted/30">
                            {app.date || '—'}
                          </p>
                        )}
                      </div>
                      {/* التوقيع */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t.signature}</Label>
                        {isEditing ? (
                          <Input
                            value={app.signature}
                            onChange={(e) => updateApproval(app.id, { signature: e.target.value })}
                            placeholder={t.signatureNamePlaceholder}
                            className="h-9"
                          />
                        ) : (
                          <p className="text-sm h-9 flex items-center px-3 rounded-md border bg-muted/30 italic text-muted-foreground">
                            {app.signature || '—'}
                          </p>
                        )}
                      </div>
                      {/* Delete button (editing only) */}
                      {isEditing && (
                        <div className="sm:col-span-2 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 gap-1.5"
                            onClick={() => deleteApproval(app.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="text-xs">{t.remove}</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* ===== Bottom Action Buttons ===== */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardContent className="p-4 flex items-center justify-end gap-3">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setFormData(computeInitialData(data));
                  setIsEditing(false);
                }}
                className="gap-1.5"
              >
                <span className="text-sm">{t.cancel}</span>
              </Button>
              <Button
                onClick={handleSave}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200 gap-1.5 px-6"
              >
                <Save className="h-4 w-4" />
                <span className="text-sm">{t.save}</span>
              </Button>
            </>
          ) : (
            <Button
              onClick={handleEdit}
              variant="outline"
              className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 gap-1.5 px-6"
            >
              <Edit3 className="h-4 w-4" />
              <span className="text-sm">{t.editData}</span>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
