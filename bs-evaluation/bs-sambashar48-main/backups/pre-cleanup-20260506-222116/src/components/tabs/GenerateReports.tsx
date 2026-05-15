'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileOutput, Printer } from 'lucide-react';

interface GenerateReportsProps {
  projectData: Record<string, Record<string, unknown>>;
}

interface ReportType {
  id: string;
  title: string;
  description: string;
  dataKey: string;
  icon: React.ReactNode;
}

const reportTypes: ReportType[] = [
  {
    id: 'building-data',
    title: 'بيانات المنشأة',
    description: 'معلومات أساسية عن المنشأة ومواصفاتها العامة',
    dataKey: 'building_data',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
        <path d="M9 22v-4h6v4" />
        <path d="M8 6h.01" />
        <path d="M16 6h.01" />
        <path d="M12 6h.01" />
        <path d="M12 10h.01" />
        <path d="M12 14h.01" />
        <path d="M16 10h.01" />
        <path d="M16 14h.01" />
        <path d="M8 10h.01" />
        <path d="M8 14h.01" />
      </svg>
    ),
  },
  {
    id: 'architectural-report',
    title: 'التقرير المعماري',
    description: 'التقييم المعماري الشامل للمنشأة',
    dataKey: 'architectural_report',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20h20" />
        <path d="M5 20V8l7-5 7 5v12" />
        <path d="M9 20v-6h6v6" />
      </svg>
    ),
  },
  {
    id: 'structural-report',
    title: 'التقرير الإنشائي',
    description: 'التقييم الإنشائي وتحليل العناصر الخرسانية',
    dataKey: 'structural_report',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" />
        <path d="M5 21V7l8-4v18" />
        <path d="M19 21V11l-6-4" />
        <path d="M9 9h.01" />
        <path d="M9 12h.01" />
        <path d="M9 15h.01" />
        <path d="M9 18h.01" />
      </svg>
    ),
  },
  {
    id: 'foundations',
    title: 'الأساسات',
    description: 'تقرير فحص وتقييم الأساسات',
    dataKey: 'foundations',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="16" height="20" x="4" y="2" rx="2" />
        <path d="M4 22h16" />
        <path d="M8 22v-4h8v4" />
      </svg>
    ),
  },
  {
    id: 'columns-walls',
    title: 'الأعمدة والجدران',
    description: 'فحص وتقييم الأعمدة والجدران الحاملة',
    dataKey: 'columns_walls',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="4" y1="8" x2="20" y2="8" />
        <line x1="4" y1="14" x2="20" y2="14" />
        <line x1="12" y1="2" x2="12" y2="22" />
      </svg>
    ),
  },
  {
    id: 'beam-slab',
    title: 'الجوائز والبلاطات',
    description: 'فحص وتقييم الجوائز والبلاطات',
    dataKey: 'beam_slab',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20h20" />
        <path d="M4 16V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8" />
        <path d="M12 4v12" />
        <path d="M2 20v2" />
        <path d="M22 20v2" />
      </svg>
    ),
  },
  {
    id: 'electrical-report',
    title: 'التقرير الكهربائي',
    description: 'تقييم النظام الكهربائي والتمديدات',
    dataKey: 'electrical',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    id: 'plumbing-report',
    title: 'التقرير الصحي',
    description: 'تقييم شبكة المياه والصرف الصحي',
    dataKey: 'plumbing',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20" />
        <path d="M2 12h20" />
        <path d="m4.93 4.93 14.14 14.14" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    id: 'technical-notes',
    title: 'الملاحظات الفنية',
    description: 'الملاحظات والتوصيات الفنية الميدانية',
    dataKey: 'technical_notes',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    id: 'final-report',
    title: 'التقرير النهائي',
    description: 'التقرير الشامل الختامي مع التوصيات',
    dataKey: 'final_report',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <path d="M10 9H8" />
      </svg>
    ),
  },
];

export default function GenerateReports({ projectData }: GenerateReportsProps) {
  const [printingReport, setPrintingReport] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const getSectionData = (dataKey: string): Record<string, unknown> => {
    return projectData[dataKey] || {};
  };

  const hasDataForSection = (dataKey: string): boolean => {
    const sectionData = projectData[dataKey];
    if (!sectionData) return false;
    return Object.keys(sectionData).length > 0;
  };

  const renderSectionContent = (report: ReportType) => {
    const sectionData = getSectionData(report.dataKey);

    if (!hasDataForSection(report.dataKey)) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm">لا توجد بيانات متاحة لهذا القسم</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {Object.entries(sectionData).map(([key, value]) => {
          if (key === 'id') return null;
          const displayValue = Array.isArray(value)
            ? (value as unknown[]).map((item, i) => {
                if (typeof item === 'object' && item !== null) {
                  return (
                    <div key={i} className="text-sm bg-muted/50 p-3 rounded-lg mt-1 space-y-1">
                      {Object.entries(item as Record<string, unknown>).map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <span className="font-medium text-foreground/70">{String(k)}:</span>
                          <span className="text-foreground/90">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return <span key={i} className="text-sm">{String(item)}, </span>;
              })
            : String(value);

          return (
            <div key={key} className="flex flex-col gap-1 py-2 border-b border-border/40 last:border-0">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {key}
              </span>
              <span className="text-sm text-foreground/90">{displayValue}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const handlePrint = (report: ReportType) => {
    setPrintingReport(report.id);
    // Give React time to render the print content, then trigger print
    setTimeout(() => {
      window.print();
      // Small delay before resetting to allow print dialog to open
      setTimeout(() => {
        setPrintingReport(null);
      }, 500);
    }, 100);
  };

  const handleGenerateAll = () => {
    setPrintingReport('all');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setPrintingReport(null);
      }, 500);
    }, 100);
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: white;
          }
          .no-print {
            display: none !important;
          }
          .print-card {
            border: 1px solid #e5e7eb !important;
            box-shadow: none !important;
            break-inside: avoid;
            margin-bottom: 20px;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="space-y-6 no-print">
        {/* Header */}
        <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <FileOutput className="h-5 w-5" />
              </div>
              <span>توليد التقارير</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              اختر التقرير الذي تريد طباعته أو توليد التقرير الشامل الكامل
            </p>
          </CardContent>
        </Card>

        {/* Generate All Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleGenerateAll}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-8 py-3 text-base"
          >
            <FileOutput className="h-5 w-5 me-2" />
            توليد التقرير الشامل
          </Button>
        </div>

        {/* Report Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTypes.map((report) => {
            const hasData = hasDataForSection(report.dataKey);
            return (
              <Card
                key={report.id}
                className={`border-emerald-200/50 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 ${
                  !hasData ? 'opacity-60' : ''
                }`}
              >
                <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0 dark:bg-emerald-900/20 dark:text-emerald-400">
                      {report.icon}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-semibold text-sm text-foreground leading-tight">
                        {report.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {report.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${
                      hasData
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {hasData ? 'بيانات متاحة' : 'لا توجد بيانات'}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrint(report)}
                      className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-900/20"
                    >
                      <Printer className="h-4 w-4 me-1.5" />
                      طباعة
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Print Area - Hidden on screen, visible on print */}
      <div className="print-area hidden" ref={printRef}>
        <div className="text-center mb-8 pb-4 border-b-2 border-gray-300">
          <h1 className="text-2xl font-bold mb-1">تقرير تقييم المنشأة</h1>
          <p className="text-sm text-gray-600">B.S Evaluation - Structural Engineering Report</p>
          <p className="text-xs text-gray-500 mt-2">
            {new Date().toLocaleDateString('ar-SY', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {printingReport === 'all' ? (
          <div>
            {reportTypes.map((report) => (
              <div key={report.id} className="print-card mb-8 p-6 border rounded-xl">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
                  <div className="text-emerald-600">
                    {report.icon}
                  </div>
                  <h2 className="text-lg font-bold">{report.title}</h2>
                </div>
                {renderSectionContent(report)}
              </div>
            ))}
          </div>
        ) : (
          <div className="print-card p-6 border rounded-xl">
            {printingReport && (() => {
              const currentReport = reportTypes.find(r => r.id === printingReport);
              if (!currentReport) return null;
              return (
                <>
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
                    <div className="text-emerald-600">
                      {currentReport.icon}
                    </div>
                    <h2 className="text-lg font-bold">{currentReport.title}</h2>
                  </div>
                  {renderSectionContent(currentReport)}
                </>
              );
            })()}
          </div>
        )}

        <div className="mt-8 pt-4 border-t-2 border-gray-300 text-center text-xs text-gray-500">
          <p>تم إنشاء هذا التقرير بواسطة نظام B.S Evaluation</p>
          <p>الكود العربي السوري نسخة 2024</p>
        </div>
      </div>
    </>
  );
}
