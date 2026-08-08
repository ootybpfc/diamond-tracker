# t2 — Frontend Variable/Logic Wiring Audit & Fixes

## Scope

Audited `src/components`, `src/hooks`, `src/pages` (all 4 hooks, all 7 pages, all 11 components + 6 `ui/` primitives) for variable/logic wiring correctness, plus applied the 5 findings from `t1-architect.md` assigned to this role.

## Upstream Artifacts Consumed
- [t1-architect.md](./t1-architect.md) — Findings #2 (HIGH, repo hygiene), #3 (MEDIUM, BarChart month bucketing), #4 (LOW, console.log), #5 (LOW, .env.example), #8 (LOW optional, Coach stale-flag edge case). Findings #6/#7 were informational (no frontend action).
- `clarification.md` — confirmed classification `upgrade` (same-stack correctness audit), no rewrite/spec-gate applies.
- [t1-frontend.md](./t1-frontend.md) + `learnings/frontend/dashboard-dtm-source.md` — prior-session fix unifying dashboard DTM source onto `accountabilityDays.dtm_count`; re-verified still correctly wired in current `Dashboard.tsx`/`BarChart.tsx`/`Heatmap.tsx` (no regression).

## Evidence Mapping
- `t1-architect.md#Finding 2` → `tsconfig.node.json` (`noEmit: true` added), deleted `vite.config.js`/`vite.config.d.ts`/`tsconfig.tsbuildinfo`/`tsconfig.node.tsbuildinfo`, added [.gitignore](../../../.gitignore), untracked `.env` from git index (`git rm --cached .env`, file kept on disk).
- `t1-architect.md#Finding 3` → [src/components/BarChart.tsx](../../../src/components/BarChart.tsx) `recentMonthKeys` now derives month keys via `x.date.slice(0, 7)` instead of `formatMonth(new Date(x.date))`.
- `t1-architect.md#Finding 4` → removed all `console.log` calls from [src/hooks/useAuth.tsx](../../../src/hooks/useAuth.tsx) (3) and [src/hooks/useData.tsx](../../../src/hooks/useData.tsx) (2).
- `t1-architect.md#Finding 5` → created [.env.example](../../../.env.example) with the 3 documented keys.
- `t1-architect.md#Finding 8` → [src/pages/Coach.tsx](../../../src/pages/Coach.tsx) `SessionCard` no longer gates the "no items / retry" fallback on the persisted `session.extracting` flag, so a stale `true` flag (interrupted request) no longer strands the UI with no retry option.

## Changes Made
1. **tsconfig.node.json** — added `"noEmit": true` so `tsc -b` stops emitting `vite.config.js`/`.d.ts` next to source.
2. **Deleted stale generated files**: `vite.config.js`, `vite.config.d.ts`, `tsconfig.tsbuildinfo`, `tsconfig.node.tsbuildinfo`.
3. **Added `.gitignore`** covering `node_modules/`, `dist/`, `.env`, `*.tsbuildinfo`, `vite.config.js`, `vite.config.d.ts`.
4. **Untracked `.env` from git** (`git rm --cached .env`) — inspected contents first: the tracked Supabase anon key is intentionally public/RLS-scoped (comment confirms "safe to expose"), and the tracked `GITHUB_TOKEN` was a placeholder value, not a live secret, so no rotation is required — but it should not be re-added to the index going forward.
5. **BarChart.tsx** — fixed UTC/local timezone re-parse bug in monthly bucketing.
6. **useAuth.tsx / useData.tsx** — removed 5 debug `console.log` calls that logged session/user identifiers and row counts.
7. **Coach.tsx** — hardened `SessionCard` empty-state condition against a stale persisted `extracting` flag.
8. **.env.example** — added with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GITHUB_TOKEN` placeholders.

## Full Wiring Review (no additional issues found)
Read and cross-checked every hook/page/component prop signature against its call sites and against `useData()`/`useAuth()` context shapes and `src/types/database.ts`:
- `useAuth.tsx` ↔ `AuthScreen.tsx`, `Navigation.tsx` (signIn/signUp/signOut/session/user/loading) — all consumed correctly.
- `useData.tsx` ↔ all 5 pages — all 9 data arrays and 17 CRUD methods match consumer call sites and argument types exactly (re-verified against Dashboard, DailyCheckin, Content, Network, Coach).
- `useMic.ts` ↔ `MicButton.tsx` ↔ `Content.tsx`/`Coach.tsx` (`onTranscript` callback wiring) — consistent.
- `useOnlineStatus.ts` ↔ `App.tsx` (`OfflineIndicator`) and `lib/ai.ts` (`processQueue`) — consistent.
- `ui/` primitives (`Badge`, `Button`, `Card`, `Input`, `Modal`, `Toast`) — all variant enums (`Badge` 6 variants, `Button` 5 variants) match every call site across all 5 pages; no invalid variant strings found.
- `Heatmap.tsx` / `BarChart.tsx` / `Dashboard.tsx` — confirmed the prior-session DTM-source unification (accountabilityDays as canonical source) is intact and consistent across all three.

## Test Results
- Command: `node --version` / `npm --version` — **environment blocker, unchanged from t1**: `CommandNotFoundException` for both `node` and `npm` in this terminal session. `node_modules/` does not exist (npm install never completed). `npm run typecheck` / `npm run build` cannot be executed from this tool session.
- Fallback verification: ran `get_errors` (editor TS diagnostics) on every touched file. `tsconfig.node.json`, `useAuth.tsx`, `useData.tsx`, `Coach.tsx` — **no errors**. `BarChart.tsx` — only pre-existing environment-level errors (`JSX.IntrinsicElements`/`react/jsx-runtime` module-resolution errors caused by missing `node_modules`, not by this task's edit — the edited lines themselves are not flagged).
- Passed: 0 (no test runner available) / Failed: 0 / Skipped: 1 (typecheck — env blocker, same as t1)
- This mirrors the environment blocker t1 already reported to the coordinator; t5 (smoke test) still requires Node.js/npm provisioning before it can run.

## Findings
- 0 CRITICAL, 0 HIGH remaining (Finding #2 fully resolved), 0 MEDIUM remaining (Finding #3 resolved), 0 LOW remaining (Findings #4, #5, #8 resolved).
