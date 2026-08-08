# t1 — Data/Variable Flow Analysis & Inconsistency Report

## Scope

Full trace of the data/variable flow across the app: `src/hooks` → `src/pages` → `src/components` → `api/*.ts` → `src/types/database.ts` → `supabase/*.sql`. Project is a single-module React + TypeScript + Vite PWA with two Vercel serverless functions and a Supabase (Postgres) backend — no multi-unit split or migration boundary applies (same-stack correctness audit per `clarification.md`).

## Data Flow Map

```
supabase/migration.sql (9 tables, RLS, realtime)
        │  (column shapes)
        ▼
src/types/database.ts (Association, DittoLog, ContentEntry, Person, DtmLog,
                        InventoryItem, AccountabilityDay, ChecklistTemplate,
                        CoachSession, AIQueueEntry)
        │
        ▼
src/hooks/useData.tsx  ──uses──> src/hooks/useAuth.tsx (user.id for row scoping)
        │  (DataContext: 9 state arrays + 17 CRUD/realtime methods)
        ▼
src/pages/{Dashboard,DailyCheckin,Content,Network,Coach}.tsx
        │  (consume useData()/useAuth(), pass props down)
        ▼
src/components/{BarChart,Heatmap,StatCard,MicButton,Navigation}.tsx
        + src/components/ui/{Badge,Button,Card,Input,Modal,Toast}.tsx

src/lib/ai.ts (polishContent/extractActions) ──fetch──> api/polish-content.ts
                                              ──fetch──> api/extract-actions.ts
        │  (offline fallback)                                  │ (env: GITHUB_TOKEN)
        ▼
src/lib/db.ts (IndexedDB cache + queue) <──> src/hooks/useOnlineStatus.ts (processQueue)
```

## Findings

| # | Severity | Location | Issue | Recommendation | Target |
|---|---|---|---|---|---|
| 1 | **CRITICAL (environment)** | dev environment | `npm install` fails with `CommandNotFoundException` — Node.js/npm are **not installed** in this workspace's terminal. Verified via `Get-Command node/npm` → not found. This blocks `npm install`, `npm run build`, `npm run typecheck`, and t5's smoke test entirely until Node 18+ is provisioned. | Install Node.js 18+ (per README prerequisite) before t5 runs, or run smoke test in an environment with Node available. | coordinator / t5 pre-req |
| 2 | **HIGH** | repo root: `vite.config.js`, `vite.config.d.ts`, `tsconfig.tsbuildinfo`, `tsconfig.node.tsbuildinfo` | Stale **compiled build artifacts are committed to source control**. Root cause: `package.json`'s `build` script runs `tsc -b` against `tsconfig.node.json`, which has **no `noEmit`/`outDir`** (unlike the main `tsconfig.json`, which sets `noEmit: true`). Because `tsconfig.node.json`'s `include` is `["vite.config.ts"]`, every build/typecheck emits `vite.config.js` + `vite.config.d.ts` next to the source file. Compounding this, **there is no `.gitignore` anywhere in the repo** — so `node_modules/`, `dist/`, `.env` (containing `GITHUB_TOKEN`), and these emitted files are all un-excluded from version control. | (a) Add `noEmit: true` (or a dedicated `outDir` outside the repo tree) to `tsconfig.node.json`; (b) delete the 4 stale generated files; (c) add a `.gitignore` covering `node_modules/`, `dist/`, `.env`, `*.tsbuildinfo`, `vite.config.js`, `vite.config.d.ts`. | t2 frontend |
| 3 | **MEDIUM** | [src/components/BarChart.tsx](../../../../src/components/BarChart.tsx) — `recentMonthKeys` and the per-category `dayData` reducers | Month-view bucketing re-parses stored `YYYY-MM-DD` strings with `new Date(a.date)` / `new Date(c.date)` / `new Date(a.date)` (accountability), then calls `formatMonth()` which reads **local** `getFullYear()/getMonth()`. `new Date('2026-08-01')` is parsed as **UTC midnight**; in any negative-UTC-offset timezone (e.g. US), the local calendar date/month rolls back a day, so entries logged on the 1st of a month can be bucketed into the **previous month** in the "Monthly" activity-mix view. `Heatmap.tsx` and `Dashboard.tsx` avoid this (they compare date strings directly, or build `Date` objects only from `new Date()`/day-of-month components — never re-parse a stored `YYYY-MM-DD` string). | Replace `formatMonth(new Date(x.date))` with a direct string slice, e.g. `x.date.slice(0, 7)`, to avoid the UTC/local re-parse entirely. | t2 frontend |
| 4 | **LOW** | [src/hooks/useAuth.tsx](../../../../src/hooks/useAuth.tsx) (4 `console.log` calls incl. session object), [src/hooks/useData.tsx](../../../../src/hooks/useData.tsx) (2 `console.log` calls incl. session UID and row counts) | Debug `console.log` statements left in production code paths log session/user identifiers and row counts to the browser console on every auth event and data load. | Remove, or gate behind `import.meta.env.DEV`. | t2 frontend |
| 5 | **LOW (docs)** | README.md architecture diagram references `.env.example`; file does not exist anywhere in the repo (confirmed via workspace search) | New contributors following the README have no template to copy for the 3 required env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GITHUB_TOKEN`). | Create `.env.example` with the three documented keys (placeholder values), matching README §4. | t2 frontend |
| 6 | **INFO — verified, no action** | `src/lib/ai.ts` ↔ `api/polish-content.ts` / `api/extract-actions.ts` | Request/response shapes match exactly: `polishContent` posts `{text, type}` → handler reads `{text, type}`, returns `{polished}` → client reads `data.polished`. `extractActions` posts `{notes}` → handler reads `{notes}`, returns `{actions}` → client reads `data.actions`. `GITHUB_TOKEN` is read only server-side (`process.env`, never `VITE_`-prefixed) — correctly never exposed to the client bundle. | none | t3 backend (confirmation only) |
| 7 | **INFO — verified, no action** | `src/types/database.ts` ↔ `supabase/migration.sql` | All 9 tables (`associations`, `ditto_logs`, `content_entries`, `people`, `dtm_log`, `inventory`, `accountability_days`, `checklist_template`, `coach_sessions`) match their corresponding TS interfaces field-for-field, including nullability (`phone: string \| null`, `notes: string \| null`, `polished_text: string \| null`) and jsonb-typed columns (`items`, `action_items`). `accountability_days.dtm_count` is present in **both** the clean-install `migration.sql` table definition and the standalone `upgrade-dtm-count-2026-08-08.sql` patch for pre-existing deployments — intentional, not a duplicate/conflict. Table names referenced in `useData.tsx`'s Supabase calls match `public.<table>` names exactly. | none | t4 dba (confirmation only) |
| 8 | **LOW — edge case** | [src/pages/Coach.tsx](../../../../src/pages/Coach.tsx) `SessionCard` | The "is extracting" spinner state is driven entirely by local component state (`extractingId`/`extractStatus`), not synced from the persisted `session.extracting` DB flag on mount/reload. If a request is interrupted (tab closed, crash) before the `finally`-style reset runs, `extracting: true` can persist in the DB while the UI (after reload) shows the idle "Extract" button, allowing a user to re-trigger extraction concurrently. | Optional: on mount, seed `extractingId`/`extractStatus` from any session where `extracting === true`, or add a stale-flag timeout/reset. | t2 frontend (optional hardening) |

## Upstream Artifacts Consumed
- `.github/modernize/rearchitecture/clarification.md` — confirmed classification (`upgrade`, same-stack correctness audit, no rewrite/target-library change), which scoped this analysis to a direct findings report rather than migration-boundary/unit-graph artifacts.

## Evidence Mapping
- `clarification.md#Notes` (classification: same-stack audit) → this report's format decision (flat findings table instead of `unit_graph.yaml`/`migration_boundary.yaml`/seams).
- Direct source read of all 7 pages, all 11 components, all 4 hooks, `lib/{ai,db,supabase,utils}.ts`, both `api/*.ts` handlers, `src/types/database.ts`, `supabase/*.sql`, and config files (`package.json`, `tsconfig*.json`, `vite.config.*`, `tailwind.config.ts`, `vercel.json`) → Findings #1–#8 above, each cited with exact file/section.
- Terminal reproduction (`npm install`, `Get-Command node/npm`) → Finding #1 evidence (`CommandNotFoundException`).
- `file_search` for `*.tsbuildinfo` and `.gitignore` → Finding #2 evidence (2 stray `.tsbuildinfo` files found; zero `.gitignore` files found).

## Notes for Downstream Tasks

- **t2 (frontend)**: fix Findings #2, #3, #4, #5, optionally #8. No prop/type mismatches found between pages and `ui/` components (`Badge`, `Button`, `Card`, `Input`, `Modal`, `Toast` variant enums all match call sites).
- **t3 (backend)**: Finding #6 is a clean bill of health — no request/response wiring changes required unless new issues surface during implementation.
- **t4 (dba)**: Finding #7 is a clean bill of health — schema/type alignment confirmed across all 9 tables; no migration required beyond what's already in `supabase/upgrade-dtm-count-2026-08-08.sql`.
- **t5 (smoke test)**: cannot run until Finding #1 (Node.js/npm provisioning) is resolved — flag to coordinator before dispatch.
