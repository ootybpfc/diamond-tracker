# t1 - Patch dashboard calculation path

## Summary
Patched the dashboard DTM calculation path so the page-level stat cards, activity heatmap, and activity mix chart all derive DTM counts from `accountabilityDays.dtm_count` instead of mixing that new source with legacy `dtmLogs`.

## Upstream Artifacts Consumed
- none - no dependency artifacts provided

## Evidence Mapping
- none - no dependency artifacts provided

## Changes Made
- Updated `src/pages/Dashboard.tsx` to stop wiring legacy `dtmLogs` into dashboard visualizations.
- Updated `src/components/BarChart.tsx` so DTM bar segments aggregate from `accountabilityDays.dtm_count` for weekly and monthly periods.
- Updated `src/components/Heatmap.tsx` so day intensity and modal DTM output derive from `accountabilityDays`, showing the logged DTM count for the selected day.

## Test Results
- Command: `npm run typecheck`
- Passed: 0
- Failed: 0
- Skipped: 1
- Failure details: validation was blocked because the PowerShell execution environment could not resolve `npm` or `npm.cmd` on PATH (`CommandNotFoundException`). A fallback editor-diagnostics check was run on the touched files; it reported environment-level missing React/npm dependency resolution in `Dashboard.tsx` and `BarChart.tsx`, not a dashboard-specific logic error introduced by this patch.

## Environment Blockers
- The validation shell cannot resolve `npm` or `npm.cmd`, so the repo's narrow TypeScript validation script could not be executed from this tool session.
- Editor diagnostics also indicate missing module resolution for `react`, `lucide-react`, and `react/jsx-runtime`, which is consistent with dependencies not being available to the TypeScript service in the current environment.
