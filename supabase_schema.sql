-- ==============================================================================
-- WAYPOINT - FRESH RESET & COMPLETE DATABASE SCHEMA
-- ==============================================================================

-- 1. Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ==============================================================================
-- 2. DROP ALL EXISTING TABLES & OBJECTS (COMPLETE CLEAN RESET)
-- ==============================================================================
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.is_board_member(text) cascade;

drop table if exists public.email_logs cascade;
drop table if exists public.notifications cascade;
drop table if exists public.comments cascade;
drop table if exists public.attachments cascade;
drop table if exists public.custom_labels cascade;
drop table if exists public.card_labels cascade;
drop table if exists public.card_assignees cascade;
drop table if exists public.cards cascade;
drop table if exists public.columns cascade;
drop table if exists public.board_members cascade;
drop table if exists public.boards cascade;
drop table if exists public.profiles cascade;

-- ==============================================================================
-- 3. PROFILES TABLE (Linked to Supabase Auth)
-- ==============================================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  email text unique not null,
  avatar_url text,
  border_style text default 'none',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Trigger to automatically create or update profile upon auth.users signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do update
  set
    name = coalesce(excluded.name, public.profiles.name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any already registered auth users
insert into public.profiles (id, name, email, avatar_url)
select
  id,
  coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
  email,
  coalesce(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture')
from auth.users
on conflict (id) do nothing;

-- ==============================================================================
-- 4. BOARDS TABLE
-- ==============================================================================
create table public.boards (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  color text default '#6366f1' not null,
  created_by text not null, -- User Email
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ==============================================================================
-- 5. BOARD MEMBERS TABLE
-- ==============================================================================
create table public.board_members (
  id text primary key default gen_random_uuid()::text,
  board_id text references public.boards(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  color text default '#6366f1' not null,
  avatar_url text,
  border_style text default 'none',
  role text default 'member' not null,
  added_at timestamptz default now() not null,
  unique (board_id, email)
);

-- ==============================================================================
-- 6. COLUMNS TABLE
-- ==============================================================================
create table public.columns (
  id text primary key default gen_random_uuid()::text,
  board_id text references public.boards(id) on delete cascade not null,
  name text not null,
  position integer default 0 not null,
  created_at timestamptz default now() not null
);

-- ==============================================================================
-- 7. CARDS TABLE
-- ==============================================================================
create table public.cards (
  id text primary key default gen_random_uuid()::text,
  board_id text references public.boards(id) on delete cascade not null,
  column_id text references public.columns(id) on delete cascade,
  title text not null,
  description text default '' not null,
  priority text default 'medium' not null, -- 'low', 'medium', 'high', 'urgent'
  completed boolean default false not null,
  completed_at timestamptz,
  due_date timestamptz,
  cover_attachment_id text,
  position integer default 0 not null,
  is_inbox boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ==============================================================================
-- 8. CARD ASSIGNEES TABLE
-- ==============================================================================
create table public.card_assignees (
  id text primary key default gen_random_uuid()::text,
  card_id text references public.cards(id) on delete cascade not null,
  member_id text not null,
  assigned_at timestamptz default now() not null,
  unique (card_id, member_id)
);

-- ==============================================================================
-- 9. CARD LABELS TABLE
-- ==============================================================================
create table public.card_labels (
  id text primary key default gen_random_uuid()::text,
  card_id text references public.cards(id) on delete cascade not null,
  label_id text not null,
  unique (card_id, label_id)
);

-- ==============================================================================
-- 10. CUSTOM LABELS TABLE
-- ==============================================================================
create table public.custom_labels (
  id text primary key default gen_random_uuid()::text,
  user_email text,
  name text not null,
  color text default '#3b82f6' not null,
  created_at timestamptz default now() not null
);

-- ==============================================================================
-- 11. ATTACHMENTS TABLE
-- ==============================================================================
create table public.attachments (
  id text primary key default gen_random_uuid()::text,
  card_id text references public.cards(id) on delete cascade not null,
  name text not null,
  size bigint default 0 not null,
  type text default 'application/octet-stream' not null,
  data_url text,
  storage_path text,
  added_at timestamptz default now() not null
);

-- ==============================================================================
-- 12. COMMENTS TABLE
-- ==============================================================================
create table public.comments (
  id text primary key default gen_random_uuid()::text,
  card_id text references public.cards(id) on delete cascade not null,
  parent_id text references public.comments(id) on delete cascade,
  reply_to_author text,
  author text not null,
  author_initials text not null,
  avatar_color text default '#6366f1' not null,
  text text not null,
  created_at timestamptz default now() not null
);

-- ==============================================================================
-- 13. NOTIFICATIONS TABLE
-- ==============================================================================
create table public.notifications (
  id text primary key default gen_random_uuid()::text,
  recipient_email text not null,
  recipient_id uuid references auth.users(id) on delete set null,
  title text not null,
  sub text not null,
  icon text default 'bell' not null,
  card_id text,
  board_id text,
  time timestamptz default now() not null,
  is_read boolean default false not null
);

-- ==============================================================================
-- 14. EMAIL NOTIFICATION LOGS TABLE
-- ==============================================================================
create table public.email_logs (
  id text primary key default gen_random_uuid()::text,
  recipient_email text not null,
  recipient_name text not null,
  subject text not null,
  body text not null,
  status text default 'sent' not null,
  event_type text not null,
  sent_at timestamptz default now() not null
);

-- ==============================================================================
-- 15. PERFORMANCE INDICES
-- ==============================================================================
create index if not exists idx_boards_created_by on public.boards(created_by);
create index if not exists idx_board_members_board_id on public.board_members(board_id);
create index if not exists idx_board_members_email on public.board_members(email);
create index if not exists idx_columns_board_id on public.columns(board_id);
create index if not exists idx_cards_board_id on public.cards(board_id);
create index if not exists idx_cards_column_id on public.cards(column_id);
create index if not exists idx_card_assignees_card_id on public.card_assignees(card_id);
create index if not exists idx_card_labels_card_id on public.card_labels(card_id);
create index if not exists idx_attachments_card_id on public.attachments(card_id);
create index if not exists idx_comments_card_id on public.comments(card_id);
create index if not exists idx_notifs_recipient on public.notifications(recipient_email);

-- ==============================================================================
-- 16. ROW LEVEL SECURITY (RLS) - HARDENED TENANT ISOLATION
-- ==============================================================================
alter table public.profiles enable row level security;
alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.columns enable row level security;
alter table public.cards enable row level security;
alter table public.card_assignees enable row level security;
alter table public.card_labels enable row level security;
alter table public.custom_labels enable row level security;
alter table public.attachments enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;
alter table public.email_logs enable row level security;

-- ── RLS Security Helper Functions (SECURITY DEFINER to avoid RLS recursion) ────
create or replace function public.auth_user_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select email from auth.users where id = auth.uid();
$$;

create or replace function public.is_board_collaborator(b_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.boards b
    where b.id = b_id
      and (
        b.created_by ilike (select email from auth.users where id = auth.uid())
        or exists (
          select 1 from public.board_members bm
          where bm.board_id = b_id
            and bm.email ilike (select email from auth.users where id = auth.uid())
        )
      )
  );
$$;

create or replace function public.get_board_role(b_id text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select 'owner' from public.boards where id = b_id and created_by ilike (select email from auth.users where id = auth.uid())),
    (select role from public.board_members where board_id = b_id and email ilike (select email from auth.users where id = auth.uid()) limit 1),
    'none'
  );
$$;

-- ── 16.1 Profiles Policies ──
create policy "Allow authenticated users to read profiles" on public.profiles
  for select to authenticated using (true);

create policy "Users can insert their own profile" on public.profiles
  for insert to authenticated with check (id = auth.uid() or email ilike public.auth_user_email());

create policy "Users can update their own profile" on public.profiles
  for update to authenticated using (id = auth.uid() or email ilike public.auth_user_email());

create policy "Users can delete their own profile" on public.profiles
  for delete to authenticated using (id = auth.uid());

-- ── 16.2 Boards Policies ──
create policy "Users can view boards they created or belong to" on public.boards
  for select to authenticated
  using (created_by ilike public.auth_user_email() or public.is_board_collaborator(id));

create policy "Users can insert boards" on public.boards
  for insert to authenticated
  with check (created_by ilike public.auth_user_email());

create policy "Board owners and admins can update boards" on public.boards
  for update to authenticated
  using (public.get_board_role(id) in ('owner', 'admin'))
  with check (public.get_board_role(id) in ('owner', 'admin'));

create policy "Board owners can delete boards" on public.boards
  for delete to authenticated
  using (public.get_board_role(id) = 'owner');

-- ── 16.3 Board Members Policies ──
create policy "Collaborators can view board members" on public.board_members
  for select to authenticated
  using (public.is_board_collaborator(board_id));

create policy "Owners and admins can add members, or users can accept invites" on public.board_members
  for insert to authenticated
  with check (public.get_board_role(board_id) in ('owner', 'admin') or email ilike public.auth_user_email());

create policy "Owners and admins can update members" on public.board_members
  for update to authenticated
  using (public.get_board_role(board_id) in ('owner', 'admin') or email ilike public.auth_user_email());

create policy "Owners, admins, or leaving members can delete membership" on public.board_members
  for delete to authenticated
  using (public.get_board_role(board_id) in ('owner', 'admin') or email ilike public.auth_user_email());

-- ── 16.4 Columns Policies ──
create policy "Collaborators can view columns" on public.columns
  for select to authenticated
  using (public.is_board_collaborator(board_id));

create policy "Board editors can manage columns" on public.columns
  for all to authenticated
  using (public.get_board_role(board_id) in ('owner', 'admin', 'member'))
  with check (public.get_board_role(board_id) in ('owner', 'admin', 'member'));

-- ── 16.5 Cards Policies ──
create policy "Collaborators can view cards" on public.cards
  for select to authenticated
  using (public.is_board_collaborator(board_id));

create policy "Board editors can insert cards" on public.cards
  for insert to authenticated
  with check (public.get_board_role(board_id) in ('owner', 'admin', 'member'));

create policy "Board collaborators can update cards" on public.cards
  for update to authenticated
  using (public.is_board_collaborator(board_id));

create policy "Board editors can delete cards" on public.cards
  for delete to authenticated
  using (public.get_board_role(board_id) in ('owner', 'admin', 'member'));

-- ── 16.6 Card Assignees Policies ──
create policy "Collaborators can view card assignees" on public.card_assignees
  for select to authenticated
  using (exists (select 1 from public.cards c where c.id = card_assignees.card_id and public.is_board_collaborator(c.board_id)));

create policy "Board editors can manage card assignees" on public.card_assignees
  for all to authenticated
  using (exists (select 1 from public.cards c where c.id = card_assignees.card_id and public.get_board_role(c.board_id) in ('owner', 'admin', 'member')))
  with check (exists (select 1 from public.cards c where c.id = card_assignees.card_id and public.get_board_role(c.board_id) in ('owner', 'admin', 'member')));

-- ── 16.7 Card Labels Policies ──
create policy "Collaborators can view card labels" on public.card_labels
  for select to authenticated
  using (exists (select 1 from public.cards c where c.id = card_labels.card_id and public.is_board_collaborator(c.board_id)));

create policy "Board editors can manage card labels" on public.card_labels
  for all to authenticated
  using (exists (select 1 from public.cards c where c.id = card_labels.card_id and public.get_board_role(c.board_id) in ('owner', 'admin', 'member')))
  with check (exists (select 1 from public.cards c where c.id = card_labels.card_id and public.get_board_role(c.board_id) in ('owner', 'admin', 'member')));

-- ── 16.8 Custom Labels Policies ──
create policy "Users can view global and own custom labels" on public.custom_labels
  for select to authenticated
  using (user_email is null or user_email ilike public.auth_user_email());

create policy "Users can manage own custom labels" on public.custom_labels
  for all to authenticated
  using (user_email is null or user_email ilike public.auth_user_email())
  with check (user_email is null or user_email ilike public.auth_user_email());

-- ── 16.9 Attachments Policies ──
create policy "Collaborators can view attachments" on public.attachments
  for select to authenticated
  using (exists (select 1 from public.cards c where c.id = attachments.card_id and public.is_board_collaborator(c.board_id)));

create policy "Collaborators can add and update attachments" on public.attachments
  for insert to authenticated
  with check (exists (select 1 from public.cards c where c.id = attachments.card_id and public.is_board_collaborator(c.board_id)));

create policy "Board editors can delete attachments" on public.attachments
  for delete to authenticated
  using (exists (select 1 from public.cards c where c.id = attachments.card_id and public.get_board_role(c.board_id) in ('owner', 'admin', 'member')));

-- ── 16.10 Comments Policies ──
create policy "Collaborators can view comments" on public.comments
  for select to authenticated
  using (exists (select 1 from public.cards c where c.id = comments.card_id and public.is_board_collaborator(c.board_id)));

create policy "Collaborators can add comments" on public.comments
  for insert to authenticated
  with check (exists (select 1 from public.cards c where c.id = comments.card_id and public.is_board_collaborator(c.board_id)));

create policy "Collaborators can update comments" on public.comments
  for update to authenticated
  using (exists (select 1 from public.cards c where c.id = comments.card_id and public.is_board_collaborator(c.board_id)));

create policy "Collaborators can delete comments" on public.comments
  for delete to authenticated
  using (exists (select 1 from public.cards c where c.id = comments.card_id and public.is_board_collaborator(c.board_id)));

-- ── 16.11 Notifications Policies ──
create policy "Users can view their own notifications" on public.notifications
  for select to authenticated
  using (recipient_email ilike public.auth_user_email() or recipient_id = auth.uid());

create policy "Collaborators can dispatch notifications" on public.notifications
  for insert to authenticated
  with check (true);

create policy "Users can update their own notifications" on public.notifications
  for update to authenticated
  using (recipient_email ilike public.auth_user_email() or recipient_id = auth.uid());

create policy "Users can delete their own notifications" on public.notifications
  for delete to authenticated
  using (recipient_email ilike public.auth_user_email() or recipient_id = auth.uid());

-- ── 16.12 Email Logs Policies ──
create policy "Users can view their own email logs" on public.email_logs
  for select to authenticated
  using (recipient_email ilike public.auth_user_email());

create policy "Authenticated callers can write email logs" on public.email_logs
  for insert to authenticated
  with check (true);

-- ==============================================================================
-- 17. ENABLE REALTIME REPLICATION & REPLICA IDENTITY (Safe & Idempotent)
-- ==============================================================================
do $$
declare
  tbl text;
  tables text[] := array[
    'boards',
    'board_members',
    'columns',
    'cards',
    'card_assignees',
    'card_labels',
    'comments',
    'attachments',
    'notifications',
    'custom_labels',
    'profiles'
  ];
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach tbl in array tables
  loop
    -- Ensure replica identity full so UPDATE and DELETE emit full row data for Realtime & RLS
    execute format('alter table public.%I replica identity full', tbl);

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end;
$$;

-- ==============================================================================
-- 18. STORAGE BUCKET FOR ATTACHMENTS (Private, Authenticated Access Only)
-- ==============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false, -- Private bucket
  52428800, -- 50MB
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/zip']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/zip'];

-- Storage Policies for Attachments (Restricted to authenticated users)
drop policy if exists "Authenticated Uploads" on storage.objects;
drop policy if exists "Public/Authenticated Reads" on storage.objects;
drop policy if exists "Authenticated Reads" on storage.objects;
drop policy if exists "Authenticated Deletes" on storage.objects;

create policy "Authenticated Uploads" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments');

create policy "Authenticated Reads" on storage.objects
  for select to authenticated
  using (bucket_id = 'attachments');

create policy "Authenticated Deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'attachments' and (owner = auth.uid() or auth.role() = 'authenticated'));

-- ==============================================================================
-- 19. ACCOUNT DELETION & DEACTIVATION RPC (Hardened with search_path and cascade)
-- ==============================================================================
create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  
  select email into v_email from auth.users where id = v_user_id;
  
  if v_email is not null then
    -- 1. Cascade delete boards created by this user (and their columns, cards, comments, attachments)
    delete from public.boards where created_by ilike v_email;

    -- 2. Remove user from other boards' memberships
    delete from public.board_members where email ilike v_email;

    -- 3. Delete user notifications and custom labels
    delete from public.notifications where recipient_email ilike v_email;
    delete from public.custom_labels where user_email ilike v_email;
  end if;
  
  -- 4. Delete user profile record
  delete from public.profiles where id = v_user_id;
  
  -- 5. Delete user from auth.users
  delete from auth.users where id = v_user_id;
end;
$$;

revoke execute on function public.delete_user_account() from public;
grant execute on function public.delete_user_account() to authenticated;


-- ==============================================================================
-- 20. MIGRATION — Add border_style columns (run if upgrading an existing DB)
-- ==============================================================================
-- Run these ALTER TABLE statements if you already have the tables and just need
-- to add the new border_style column (safe to run on existing databases):
--
-- alter table public.profiles add column if not exists border_style text default 'none';
-- alter table public.board_members add column if not exists border_style text default 'none';
--

-- ==============================================================================
-- 21. REALTIME REPLICATION (Instant Realtime Sync across all browsers/devices)
-- ==============================================================================
-- Enable Realtime publication so Postgres WAL changes are broadcast over WebSockets:
do $$
begin
  alter publication supabase_realtime add table public.boards;
  alter publication supabase_realtime add table public.board_members;
  alter publication supabase_realtime add table public.columns;
  alter publication supabase_realtime add table public.cards;
  alter publication supabase_realtime add table public.card_assignees;
  alter publication supabase_realtime add table public.card_labels;
  alter publication supabase_realtime add table public.comments;
  alter publication supabase_realtime add table public.attachments;
  alter publication supabase_realtime add table public.custom_labels;
  alter publication supabase_realtime add table public.profiles;
  alter publication supabase_realtime add table public.notifications;
exception when others then
  null; -- Ignore if tables are already added or publication already exists
end;
$$;


