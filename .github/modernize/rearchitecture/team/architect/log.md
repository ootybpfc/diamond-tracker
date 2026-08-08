# Architect Log

## [t1] Data/variable flow analysis, flag inconsistencies
- Repo has no Node.js/npm in this dev environment (`Get-Command node/npm` → CommandNotFoundException). Blocks build/typecheck/smoke-test until provisioned — flagged to coordinator, not fixable by architect.
- Found stale compiled build artifacts (`vite.config.js`, `vite.config.d.ts`, `tsconfig.tsbuildinfo`, `tsconfig.node.tsbuildinfo`) committed at repo root, caused by `tsconfig.node.json` missing `noEmit`/`outDir` while being built via `tsc -b`. No `.gitignore` exists anywhere in the repo — confirmed via `file_search`, not just missing convention.
- Found a genuine timezone bug in `BarChart.tsx`: `new Date('YYYY-MM-DD')` parses as UTC, but `formatMonth()` reads local `getMonth()/getFullYear()` — causes month-bucketing drift in negative-UTC-offset zones. `Heatmap.tsx`/`Dashboard.tsx` avoid this by using string comparison or `new Date()` (today) only — good comparison baseline for spotting the same anti-pattern elsewhere.
- Verified full schema/type/table-name alignment between `supabase/migration.sql` and `src/types/database.ts` / `useData.tsx` — clean, no dba work required from this audit alone.
- Verified `api/*.ts` request/response contracts against `lib/ai.ts` — clean, no backend work required from this audit alone.
- Learnings consumed: none (first task, no prior learnings existed in `learnings/architect/`)
