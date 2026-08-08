-- Diamond Tracker — safe upgrade for existing Supabase projects
-- Adds a WITH CHECK clause to every UPDATE row-level-security policy.
--
-- Why: an UPDATE policy with only USING validates the *existing* row. Without a
-- matching WITH CHECK, an authenticated user can update one of their own rows and
-- reassign `user_id` to another account, silently handing over (or planting) data.
-- Adding WITH CHECK (auth.uid() = user_id) validates the *resulting* row too.
--
-- This script is non-destructive: it drops and recreates only the UPDATE policies.
-- Run it in the Supabase SQL Editor (Dashboard → SQL → New Query).

do $$
declare
  t text;
  policy_name text;
begin
  foreach t in array array[
    'associations',
    'ditto_logs',
    'content_entries',
    'people',
    'dtm_log',
    'inventory',
    'accountability_days',
    'checklist_template',
    'coach_sessions'
  ]
  loop
    -- Recreate whatever UPDATE policies exist on the table with a WITH CHECK clause.
    for policy_name in
      select p.policyname
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = t
        and p.cmd = 'UPDATE'
    loop
      execute format('drop policy %I on public.%I', policy_name, t);
      execute format(
        'create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)',
        policy_name, t
      );
    end loop;
  end loop;
end $$;
