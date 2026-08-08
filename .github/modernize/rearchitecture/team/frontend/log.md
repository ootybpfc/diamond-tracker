## [t1] Unified dashboard DTM source
- Dashboard cards already used `accountabilityDays.dtm_count`, but `Heatmap` and `BarChart` still read legacy `dtmLogs`, which made page metrics internally inconsistent.
- The safe fix was to make the visualizations consume the same accountability source instead of trying to reconcile both sources in the page.
- `Heatmap` lost person-level DTM names for the modal because the accountability source only stores counts; the modal now reports the logged DTM count for the day.
- Validation through `npm run typecheck` was blocked because this tool session could not resolve `npm` on PATH.
- Learnings consumed: [(none)]
