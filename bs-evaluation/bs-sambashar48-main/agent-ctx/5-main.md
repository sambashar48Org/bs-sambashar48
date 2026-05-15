---
Task ID: 5
Agent: main
Task: Rebuild GenerateReports.tsx with Professional Report Preview

Work Log:
- Explored project data structures across all tab components (BuildingInfo, Foundations, ColumnsWalls, BeamSlab, StructuralReport)
- Analyzed store schemas for projectData, reportPreferences, and section data keys
- Mapped all Arabic labels for each section's data fields
- Built complete ReportPreviewComponent outside the main component (ESLint compliance)
- Implemented section-specific renderers:
  - Building Data: labeled key-value table
  - Architectural Report: flat fields + floor sub-tables
  - Structural Report: main fields + hammer test table + soil report table
  - Foundations: general info + per-foundation sub-tables with soil stress calculation results
  - Columns & Walls: per-entry sub-tables with compression stress calculation results (using f'c from structural report)
  - Beams & Slabs: general parameters + per-slab thickness checks + per-beam flexure/shear/thickness checks
  - Generic renderer for electrical, plumbing, technical notes, final report
- Added SafetyBadge component (green/red)
- Added LabeledTable component with alternating row colors
- Added showPreview state toggle and three action buttons (Preview, Print, PDF)
- Added comprehensive print CSS: A4 page, no-print class, print-report class, table print rules, break-inside-avoid
- Maintained all existing functionality: section selection, company name, report header/footer

Files Modified:
- /home/z/my-project/src/components/tabs/GenerateReports.tsx (complete rewrite ~1250 lines)
- /home/z/my-project/src/app/globals.css (added print styles ~90 lines)

Stage Summary:
- ESLint passes with 0 errors, 0 warnings
- Dev server compiles successfully (✓ Compiled)
- All original features preserved
- Professional report preview with engineering calculation results
- Print-optimized CSS for A4 output
