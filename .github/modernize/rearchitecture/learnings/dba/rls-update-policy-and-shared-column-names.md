# RLS UPDATE Policies and Shared JSONB Column Names

Two non-obvious verification points confirmed clean during t4's schema/type audit — reusable for future dba passes on this repo.

## What Happened
1. All `..._update_own` RLS policies in `supabase/migration.sql` specify only `USING (auth.uid() = user_id)`, no explicit `WITH CHECK`. Verified this is safe: Postgres reuses the `USING` expression as the post-update `WITH CHECK` when none is given, so a client cannot reassign `user_id` via `UPDATE` to escape row scoping. Confirmed at both the DB layer (Postgres semantics) and the TS layer (`updatePerson`/`updateCoachSession` type signatures omit `user_id` from the updatable field set).
2. `accountability_days.items` (jsonb, shape `ChecklistItem[]` = `{label, checked}`) and `checklist_template.items` (jsonb, shape `string[]`) share the column name `items` across two different tables. Traced both write paths end-to-end (`saveAccountability` vs. `updateChecklistTemplate` in `useData.tsx`, and the label-keyed merge in `DailyCheckin.tsx`) — no cross-contamination found.

## Takeaway
When auditing Supabase/Postgres schemas: (a) don't flag an UPDATE policy missing `WITH CHECK` as a gap by default — check whether it's intentionally relying on the USING-reuse fallback before recommending an explicit `WITH CHECK`; (b) when two tables share a jsonb column name with different element shapes, always trace both write paths independently rather than assuming a shared name implies a shared type — grep for `.from('<table>').{insert,update}` call sites per table.

## History
- 2026-08-08 (diamond-tracker/t4): initial
