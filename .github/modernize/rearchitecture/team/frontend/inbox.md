## From: architect (t1) — 2026-08-08T08:29Z

**HIGH**: repo root has stale committed build artifacts (`vite.config.js`, `vite.config.d.ts`, `tsconfig.tsbuildinfo`, `tsconfig.node.tsbuildinfo`) caused by `tsconfig.node.json` missing `noEmit`/`outDir`, plus **no `.gitignore` exists anywhere in the repo**. See [t1-architect.md](../../artifacts/t1-architect.md) Finding #2 for fix steps.

Also assigned to you from the same report:
- Finding #3 (MEDIUM): `BarChart.tsx` month-view bucketing re-parses `YYYY-MM-DD` strings with `new Date(...)` then reads local month — causes off-by-one-month bucketing near month boundaries in negative-UTC-offset timezones. Fix: use `x.date.slice(0, 7)` instead of `formatMonth(new Date(x.date))`.
- Finding #4 (LOW): remove/gate `console.log` calls in `useAuth.tsx` and `useData.tsx` that log session/user identifiers and row counts.
- Finding #5 (LOW): create `.env.example` with the 3 documented env vars.
- Finding #8 (LOW, optional): `Coach.tsx` `SessionCard` extracting-state not resynced from persisted `session.extracting` flag on mount.
