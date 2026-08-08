-- Safe schema upgrade for existing Supabase projects
-- Adds the dtm_count column to the accountability_days table.
-- Run this in the Supabase SQL editor or via Supabase CLI after an existing deployment.

alter table public.accountability_days
  add column if not exists dtm_count integer not null default 0;
