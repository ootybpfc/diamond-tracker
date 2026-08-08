## User Input

> Go thru entire project and check each variable and test it to make sure no errors and all variables are connected logically to make sure the ask is satisfied.

**Project started**: 2026-08-08T08:00:11Z

## Tasks

### Phase: Analysis
- 🔄 t1 [architect] Analyze data/variable flow across app (hooks → pages → components → api → schema), flag inconsistencies (dispatched 08:02Z) [deps: none]

### Phase: Implementation
- ⏳ t2 [frontend] Audit & fix variable/logic wiring in src/components, src/hooks, src/pages [deps: t1]
- ⏳ t3 [backend] Audit & fix request/response and env-var wiring in api/extract-actions.ts, api/polish-content.ts [deps: t1]
- ⏳ t4 [dba] Audit & fix schema/type alignment between supabase/*.sql and src/types/database.ts and consumers [deps: t1]

### Phase: Review & Validation
- ⏳ t5 [architect] Smoke test — build/typecheck verification [deps: t2, t3, t4]
- ⏳ t6 [tester] Runtime validation — verify data flows behave correctly, regression check [deps: t5]

### Phase: Completeness
- ⏳ t7 [teamlead] Conformance review — verify all t1 findings addressed, zero HIGH/CRITICAL, completeness sign-off [deps: t6]
