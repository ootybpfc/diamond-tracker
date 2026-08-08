# t4 — Schema/Type Alignment Audit (supabase/*.sql ↔ src/types/database.ts ↔ consumers)

## Scope

Independent, field-by-field verification of:
- `supabase/migration.sql` (clean-install schema, 9 tables) and `supabase/upgrade-dtm-count-2026-08-08.sql` (incremental patch) against `src/types/database.ts`.
- Every DB-touching consumer: `src/hooks/useData.tsx` (all 17 CRUD/realtime methods), `src/hooks/useAuth.tsx`, `src/lib/supabase.ts`, `src/lib/db.ts` (IndexedDB, non-Supabase), and all 5 pages that read/write DB-shaped data (`DailyCheckin.tsx`, `SetupScreen.tsx`, `Coach.tsx`, `Network.tsx`, `Content.tsx`, `Dashboard.tsx`).

## Method

For each of the 9 tables, verified: column name, nullability, type, default, check constraint, and unique constraint against the corresponding TypeScript interface — then traced every `supabase.from('<table>')` call site in `useData.tsx` to confirm table names, selected/inserted/updated column names, and JSON-shaped column payloads (`items`, `action_items`) match the interface exactly and are never cross-used between tables that happen to share a column name.

## Findings

| # | Severity | Area | Result |
|---|---|---|---|
| 1 | **INFO — verified, no action** | All 9 tables vs. `src/types/database.ts` | Confirmed field-for-field: `associations`, `ditto_logs`, `content_entries`, `people`, `dtm_log`, `inventory`, `accountability_days`, `checklist_template`, `coach_sessions`. Nullability matches (`phone`/`notes`/`polished_text` nullable in both schema and TS), check-constraint enums match TS union types (`PersonCategory`, `ContentType`), and jsonb column shapes match their TS array types (`ChecklistItem[]`, `string[]`, `ActionItem[]`) — confirms t1 Finding #7. |
| 2 | **INFO — verified, no action** | `useData.tsx` table/column names | All 9 `supabase.from(...)` calls use exact `public.<table>` names; every `.insert()`/`.update()` payload key matches a real column (no typos, no stray fields). Realtime channel subscriptions (`postgres_changes`) target the same 9 table names. |
| 3 | **INFO — verified, no action** | `items` column shape confusion risk | `accountability_days.items` (jsonb, shape `ChecklistItem[]` = `{label, checked}`) and `checklist_template.items` (jsonb, shape `string[]`) share a column name across two different tables. Traced both write paths (`saveAccountability` vs. `updateChecklistTemplate`) and the merge logic in `DailyCheckin.tsx` (`savedByLabel` map keyed by `label`) — no cross-contamination; each write path only ever constructs its own shape. |
| 4 | **INFO — verified, no action** | Unique-constraint ↔ find-or-update logic | `ditto_logs (user_id, month)`, `accountability_days (user_id, date)`, `checklist_template (user_id)` unique constraints all have matching client-side "find existing row, else insert" logic (`saveDitto`, `saveAccountability`, `updateChecklistTemplate`) — no risk of the client attempting a duplicate insert that would violate the constraint under normal (non-racing) use. |
| 5 | **INFO — verified, no action** | FK/user-scoping indexes | Every table has an `idx_<table>_user_id` index, required because Row Level Security (`auth.uid() = user_id`) implicitly filters every query — without it, all 9 tables would full-scan under RLS. `dtm_log.person_id` and `inventory.person_id` FK columns both have supporting indexes (`idx_dtm_log_person_id`, `idx_inventory_person_id`) for the `Network.tsx` per-person filter queries. |
| 6 | **INFO — verified, no action** | UPDATE RLS policies (no explicit `WITH CHECK`) | `..._update_own` policies specify only `USING (auth.uid() = user_id)`. Per Postgres semantics, an UPDATE policy without an explicit `WITH CHECK` reuses the `USING` expression for the post-update check as well — so a user cannot reassign a row's `user_id` to escape RLS scoping via `UPDATE`. Confirmed independently at the TypeScript layer too: `updatePerson`/`updateCoachSession` signatures use `Partial<Omit<T, 'id' \| 'user_id' \| 'created_at'>>`, so `user_id` is not even assignable from the client code. |
| 7 | **INFO — verified, no action** | Migration idempotency/safety (charter requirement) | `migration.sql` is an explicitly-labeled **clean-install** script (`drop table if exists ... cascade` then recreate) with a `WARNING` comment calling out data loss — satisfies the DBA charter's "irreversible changes are explicitly called out" bar; it is not intended to be re-run against a live database with data to preserve. `upgrade-dtm-count-2026-08-08.sql` (`add column if not exists dtm_count integer not null default 0`) is genuinely idempotent/re-runnable and safe against existing rows (default value satisfies the `not null` constraint for pre-existing data). No changes needed. |
| 8 | **LOW — optional, not a defect** | `people.phone` / `people.notes` (nullable text columns) | `addPerson`/`AddPersonModal` always pass `phone`/`notes` as `''` (empty string) rather than `null` when the user leaves them blank, even though the column and TS type (`string \| null`) allow `null`. Functionally harmless — all read sites (`{person.phone && ...}`) treat falsy the same way — but if a future report/analytics query needs to distinguish "field never set" from "explicitly blank," this would need to change. Not flagging as a fix; documenting for awareness only. |

**Net result: zero schema/type misalignments found.** This independently re-confirms and extends t1's Finding #7 (clean bill of health) — no code changes were required in this task.

## Upstream Artifacts Consumed
- `.github/modernize/rearchitecture/artifacts/t1-architect.md` — Finding #7 (schema/type alignment, marked "confirmation only" for t4) and Finding #6 (API request/response shapes, unrelated to this task but reviewed for context); "Notes for Downstream Tasks → t4" pointer confirming no migration required beyond `upgrade-dtm-count-2026-08-08.sql`.
- `.github/modernize/rearchitecture/clarification.md` — confirmed `upgrade` classification (same-stack correctness audit, no migration-boundary artifacts required).

## Evidence Mapping
- `t1-architect.md#Finding 7` → this report's Findings #1–#4 (independent field-by-field + call-site re-verification of the same claim, using direct reads of `supabase/migration.sql`, `supabase/upgrade-dtm-count-2026-08-08.sql`, `src/types/database.ts`, and `src/hooks/useData.tsx`).
- `t1-architect.md#Notes for Downstream Tasks (t4 dba)` → confirmed via direct read of `supabase/upgrade-dtm-count-2026-08-08.sql` (Finding #7 in this report) — no additional migration needed.
- Direct read of `src/pages/{DailyCheckin,Coach,Network,Content,Dashboard}.tsx` and `src/hooks/useAuth.tsx`, `src/lib/{db,supabase}.ts` → Findings #2, #3, #6, #8 (consumer-side call-site verification, RLS/TS-type cross-check, jsonb shape-confusion check).

## Test Results
No code changes were made (confirmation-only audit — zero defects found), so no build/test run was required for this task. Schema/type correctness was verified by static cross-reference of SQL DDL, TypeScript interfaces, and every call site, not by executing a build (Node.js/npm are not installed in this environment per t1 Finding #1, which blocks `npm run build`/`typecheck` regardless).
