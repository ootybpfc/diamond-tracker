## [t1] Unified dashboard DTM source
- Dashboard cards already used `accountabilityDays.dtm_count`, but `Heatmap` and `BarChart` still read legacy `dtmLogs`, which made page metrics internally inconsistent.
- The safe fix was to make the visualizations consume the same accountability source instead of trying to reconcile both sources in the page.
- `Heatmap` lost person-level DTM names for the modal because the accountability source only stores counts; the modal now reports the logged DTM count for the day.
- Validation through `npm run typecheck` was blocked because this tool session could not resolve `npm` on PATH.
- Learnings consumed: [(none)]

## [t2] Audit & fix variable/logic wiring in src/components, src/hooks, src/pages
- Full read-through of all 4 hooks, 7 pages, 11 components, 6 ui/ primitives confirmed no prop/type mismatches beyond t1's findings — t1's own audit was accurate and thorough.
- `.env` was tracked in git; inspected contents before acting — Supabase anon key is intentionally public (RLS-scoped) and the tracked `GITHUB_TOKEN` was a placeholder, not a live secret, so `git rm --cached .env` was safe without a rotation escalation.
- `tsconfig.node.json`'s missing `"noEmit"` was the actual root cause of stale `vite.config.js`/`.d.ts` being regenerated on every build — fixing only the .gitignore without this would have kept regenerating (and re-polluting working tree) on next `npm run build`.
- Node.js/npm remain unavailable in this terminal session (matches t1's Finding #1) — validated changes via `get_errors` (TS language service diagnostics) instead of `npm run typecheck`; BarChart.tsx shows only pre-existing `react`/jsx-runtime module-resolution noise from missing `node_modules`, not new errors from my edit.
- Learnings consumed: [frontend/dashboard-dtm-source]
