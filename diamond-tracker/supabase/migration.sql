-- Diamond Tracker — Supabase Schema Migration (Clean Install)
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New Query)
-- This drops all existing Diamond Tracker tables first, then recreates them.
-- WARNING: This will delete all existing data in these tables.

-- ============================================================
-- Step 1: Drop existing tables (reverse dependency order)
-- ============================================================
drop table if exists public.coach_sessions cascade;
drop table if exists public.checklist_template cascade;
drop table if exists public.accountability_days cascade;
drop table if exists public.inventory cascade;
drop table if exists public.dtm_log cascade;
drop table if exists public.people cascade;
drop table if exists public.content_entries cascade;
drop table if exists public.ditto_logs cascade;
drop table if exists public.associations cascade;

-- ============================================================
-- Step 2: Create tables
-- ============================================================

-- Associations: daily association log
create table public.associations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  note text not null,
  created_at timestamptz not null default now()
);

-- Ditto logs: one row per calendar month per user
create table public.ditto_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  month text not null,
  note text not null,
  logged_at timestamptz not null default now(),
  unique (user_id, month)
);

-- Content entries: reading & podcast logs
create table public.content_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('reading', 'podcast')),
  date date not null,
  raw_text text not null,
  polished_text text,
  created_at timestamptz not null default now()
);

-- People: unified prospects & customers list
create table public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  phone text,
  category text not null check (category in ('prospect', 'customer', 'both')),
  notes text,
  created_at timestamptz not null default now()
);

-- DTM log: message sent timestamps
create table public.dtm_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  person_id uuid references public.people(id) on delete cascade not null,
  sent_at timestamptz not null default now()
);

-- Inventory: items associated with a customer/both person
create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  person_id uuid references public.people(id) on delete cascade not null,
  item text not null,
  qty integer not null default 1,
  note text,
  created_at timestamptz not null default now()
);

-- Accountability days: daily checklist completion
create table public.accountability_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  items jsonb not null default '[]'::jsonb,
  unique (user_id, date)
);

-- Checklist template: editable list of daily checklist labels
create table public.checklist_template (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  items jsonb not null default '[]'::jsonb,
  unique (user_id)
);

-- Coach sessions: weekly coaching session logs
create table public.coach_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  notes text not null,
  action_items jsonb not null default '[]'::jsonb,
  extracting boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Step 3: Indexes
-- ============================================================
create index idx_associations_user_id on public.associations(user_id);
create index idx_associations_date on public.associations(date desc);
create index idx_ditto_logs_user_id on public.ditto_logs(user_id);
create index idx_content_entries_user_id on public.content_entries(user_id);
create index idx_content_entries_created on public.content_entries(created_at desc);
create index idx_people_user_id on public.people(user_id);
create index idx_dtm_log_user_id on public.dtm_log(user_id);
create index idx_dtm_log_person_id on public.dtm_log(person_id);
create index idx_inventory_person_id on public.inventory(person_id);
create index idx_accountability_days_user_id on public.accountability_days(user_id);
create index idx_accountability_days_date on public.accountability_days(date desc);
create index idx_checklist_template_user_id on public.checklist_template(user_id);
create index idx_coach_sessions_user_id on public.coach_sessions(user_id);
create index idx_coach_sessions_created on public.coach_sessions(created_at desc);

-- ============================================================
-- Step 4: Row Level Security
-- ============================================================
alter table public.associations enable row level security;
alter table public.ditto_logs enable row level security;
alter table public.content_entries enable row level security;
alter table public.people enable row level security;
alter table public.dtm_log enable row level security;
alter table public.inventory enable row level security;
alter table public.accountability_days enable row level security;
alter table public.checklist_template enable row level security;
alter table public.coach_sessions enable row level security;

-- Associations
create policy "associations_select_own" on public.associations for select using (auth.uid() = user_id);
create policy "associations_insert_own" on public.associations for insert with check (auth.uid() = user_id);
create policy "associations_update_own" on public.associations for update using (auth.uid() = user_id);
create policy "associations_delete_own" on public.associations for delete using (auth.uid() = user_id);

-- Ditto logs
create policy "ditto_select_own" on public.ditto_logs for select using (auth.uid() = user_id);
create policy "ditto_insert_own" on public.ditto_logs for insert with check (auth.uid() = user_id);
create policy "ditto_update_own" on public.ditto_logs for update using (auth.uid() = user_id);
create policy "ditto_delete_own" on public.ditto_logs for delete using (auth.uid() = user_id);

-- Content entries
create policy "content_select_own" on public.content_entries for select using (auth.uid() = user_id);
create policy "content_insert_own" on public.content_entries for insert with check (auth.uid() = user_id);
create policy "content_update_own" on public.content_entries for update using (auth.uid() = user_id);
create policy "content_delete_own" on public.content_entries for delete using (auth.uid() = user_id);

-- People
create policy "people_select_own" on public.people for select using (auth.uid() = user_id);
create policy "people_insert_own" on public.people for insert with check (auth.uid() = user_id);
create policy "people_update_own" on public.people for update using (auth.uid() = user_id);
create policy "people_delete_own" on public.people for delete using (auth.uid() = user_id);

-- DTM log
create policy "dtm_select_own" on public.dtm_log for select using (auth.uid() = user_id);
create policy "dtm_insert_own" on public.dtm_log for insert with check (auth.uid() = user_id);
create policy "dtm_update_own" on public.dtm_log for update using (auth.uid() = user_id);
create policy "dtm_delete_own" on public.dtm_log for delete using (auth.uid() = user_id);

-- Inventory
create policy "inventory_select_own" on public.inventory for select using (auth.uid() = user_id);
create policy "inventory_insert_own" on public.inventory for insert with check (auth.uid() = user_id);
create policy "inventory_update_own" on public.inventory for update using (auth.uid() = user_id);
create policy "inventory_delete_own" on public.inventory for delete using (auth.uid() = user_id);

-- Accountability days
create policy "accountability_select_own" on public.accountability_days for select using (auth.uid() = user_id);
create policy "accountability_insert_own" on public.accountability_days for insert with check (auth.uid() = user_id);
create policy "accountability_update_own" on public.accountability_days for update using (auth.uid() = user_id);
create policy "accountability_delete_own" on public.accountability_days for delete using (auth.uid() = user_id);

-- Checklist template
create policy "checklist_select_own" on public.checklist_template for select using (auth.uid() = user_id);
create policy "checklist_insert_own" on public.checklist_template for insert with check (auth.uid() = user_id);
create policy "checklist_update_own" on public.checklist_template for update using (auth.uid() = user_id);
create policy "checklist_delete_own" on public.checklist_template for delete using (auth.uid() = user_id);

-- Coach sessions
create policy "coach_select_own" on public.coach_sessions for select using (auth.uid() = user_id);
create policy "coach_insert_own" on public.coach_sessions for insert with check (auth.uid() = user_id);
create policy "coach_update_own" on public.coach_sessions for update using (auth.uid() = user_id);
create policy "coach_delete_own" on public.coach_sessions for delete using (auth.uid() = user_id);

-- ============================================================
-- Step 5: Realtime (enable for all tables)
-- ============================================================
-- Remove and re-add to handle tables already in publication
do $$
begin
  -- Try to remove tables from publication (ignore if not members)
  begin alter publication supabase_realtime drop table public.associations; exception when others then null; end;
  begin alter publication supabase_realtime drop table public.ditto_logs; exception when others then null; end;
  begin alter publication supabase_realtime drop table public.content_entries; exception when others then null; end;
  begin alter publication supabase_realtime drop table public.people; exception when others then null; end;
  begin alter publication supabase_realtime drop table public.dtm_log; exception when others then null; end;
  begin alter publication supabase_realtime drop table public.inventory; exception when others then null; end;
  begin alter publication supabase_realtime drop table public.accountability_days; exception when others then null; end;
  begin alter publication supabase_realtime drop table public.checklist_template; exception when others then null; end;
  begin alter publication supabase_realtime drop table public.coach_sessions; exception when others then null; end;

  -- Add all tables
  alter publication supabase_realtime add table public.associations;
  alter publication supabase_realtime add table public.ditto_logs;
  alter publication supabase_realtime add table public.content_entries;
  alter publication supabase_realtime add table public.people;
  alter publication supabase_realtime add table public.dtm_log;
  alter publication supabase_realtime add table public.inventory;
  alter publication supabase_realtime add table public.accountability_days;
  alter publication supabase_realtime add table public.checklist_template;
  alter publication supabase_realtime add table public.coach_sessions;
end $$;
