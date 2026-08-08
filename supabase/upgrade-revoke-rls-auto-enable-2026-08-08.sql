-- Diamond Tracker — safe upgrade for existing Supabase projects
-- Removes public.rls_auto_enable() from the public REST API surface.
--
-- Why: rls_auto_enable() is a SECURITY DEFINER function that backs the
-- `ensure_rls` event trigger (it enables row level security on any newly
-- created public table). By default it carried EXECUTE for `anon` and
-- `authenticated`, which exposed it at /rest/v1/rpc/rls_auto_enable — a
-- privileged, definer-rights function reachable by unauthenticated callers.
--
-- Event triggers run as the trigger owner and do not consult EXECUTE
-- privileges, so revoking these grants does NOT disable the trigger. Verify
-- with the query at the bottom of this file.
--
-- This script is non-destructive. Run it in the Supabase SQL Editor.

revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.rls_auto_enable() from authenticated;

-- Verification: `still_granted` should list service_role only, and
-- `trigger_enabled` should be 'O' (enabled, origin).
--
-- select p.proname,
--        array(select r.rolname from pg_roles r
--              where has_function_privilege(r.rolname, p.oid, 'EXECUTE')
--                and r.rolname in ('anon','authenticated','service_role'))::text as still_granted,
--        (select evtenabled from pg_event_trigger where evtfoid = p.oid)::text as trigger_enabled
-- from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public' and p.proname = 'rls_auto_enable';
