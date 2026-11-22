-- ============================================================================
-- Project Two — Creator Studio · initial schema
-- Single-team (workspace) internal tool. Every table is protected by RLS:
-- only authenticated users that exist in public.profiles (= invited team
-- members) can read or write data. Anonymous users see nothing.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.team_role as enum ('admin', 'editor', 'viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.platform as enum ('instagram', 'tiktok', 'youtube', 'linkedin', 'x');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.content_format as enum ('reel', 'carousel', 'linkedin', 'x_thread', 'ig_post');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.content_status as enum ('idea', 'generated', 'to_shoot', 'done', 'published');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users). Created automatically by trigger below.
-- Public sign-ups are disabled in Supabase Auth, so rows only appear for
-- users created by an admin (dashboard or the admin-users Edge Function).
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  full_name   text,
  avatar_url  text,
  role        public.team_role not null default 'editor',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Helper functions (SECURITY DEFINER so they can read profiles without
-- recursive RLS evaluation). search_path is pinned to avoid hijacking.
create or replace function public.is_team_member()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid());
$$;

create or replace function public.can_edit()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'editor')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

create or replace function public.my_role()
returns public.team_role
language sql stable security definer set search_path = public
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

revoke all on function public.my_role() from public, anon;
grant execute on function public.my_role() to authenticated;
revoke all on function public.is_team_member() from public, anon;
revoke all on function public.can_edit() from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_team_member() to authenticated;
grant execute on function public.can_edit() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- New auth user -> profile. The very first user becomes admin, everyone
-- after that is an editor (admin can promote them later).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  first_user boolean;
begin
  select not exists (select 1 from public.profiles) into first_user;
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case when first_user then 'admin'::public.team_role else 'editor'::public.team_role end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Generic updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Brand Brain (one row per workspace — this tool has a single brand)
-- ---------------------------------------------------------------------------
create table if not exists public.brand_profiles (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  website         text,
  description     text not null default '',
  products        jsonb not null default '[]'::jsonb,   -- [{name, price, description}]
  usps            text[] not null default '{}',
  personas        jsonb not null default '[]'::jsonb,   -- [{name, description, pains[], desires[]}]
  tone            text[] not null default '{}',          -- e.g. {'lidský','edukativní'}
  tone_notes      text not null default '',
  forbidden_words text[] not null default '{}',
  default_cta     text not null default '',
  hashtags        text[] not null default '{}',
  keywords        text[] not null default '{}',
  reference_posts jsonb not null default '[]'::jsonb,   -- [{id, platform, url, text, why}]
  language        text not null default 'cs',
  updated_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Viral Radar: creators + posts (swipe file)
-- ---------------------------------------------------------------------------
create table if not exists public.creators (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  handle          text not null,
  platform        public.platform not null,
  niche           text[] not null default '{}',
  followers       bigint not null default 0,
  avg_views       bigint not null default 0,
  engagement_rate numeric(5,2) not null default 0,
  growth_30d      numeric(6,2) not null default 0,
  language        text not null default 'cs',
  avatar_color    text,
  profile_url     text,
  why_follow      text,
  source          text not null default 'manual',      -- manual | apify | youtube | seed
  external_id     text,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (platform, handle)
);

create table if not exists public.viral_posts (
  id              uuid primary key default gen_random_uuid(),
  creator_id      uuid references public.creators (id) on delete set null,
  platform        public.platform not null,
  format          public.content_format not null default 'reel',
  url             text,
  title           text not null,
  hook_text       text,
  caption         text,
  transcript      text,
  thumbnail_url   text,
  thumbnail_gradient text,
  views           bigint not null default 0,
  likes           bigint not null default 0,
  comments        bigint not null default 0,
  shares          bigint not null default 0,
  saves           bigint not null default 0,
  duration_sec    integer,
  posted_at       timestamptz,
  tags            text[] not null default '{}',          -- Edukace, Kontroverze, Příběh...
  viral_score     integer not null default 0 check (viral_score between 0 and 100),
  analysis        jsonb,                                 -- {hook, retention, storytelling, visual, cta, takeaways[]}
  saved_to_swipe  boolean not null default false,
  source          text not null default 'manual',
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists viral_posts_score_idx on public.viral_posts (viral_score desc);
create index if not exists viral_posts_swipe_idx on public.viral_posts (saved_to_swipe) where saved_to_swipe;

-- ---------------------------------------------------------------------------
-- Content pipeline (generated reels/posts, kanban + calendar)
-- ---------------------------------------------------------------------------
create table if not exists public.content_items (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  format          public.content_format not null,
  platform        public.platform not null,
  status          public.content_status not null default 'idea',
  topic           text,
  reference_post_id uuid references public.viral_posts (id) on delete set null,
  output          jsonb,                                 -- full generator output (hooks, script, slides…)
  notes           text,
  scheduled_for   date,
  position        double precision not null default 0,   -- ordering inside a kanban column
  crm_synced_at   timestamptz,
  crm_external_id text,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists content_items_status_idx on public.content_items (status, position);
create index if not exists content_items_schedule_idx on public.content_items (scheduled_for);

-- ---------------------------------------------------------------------------
-- Integration settings (non-secret config, e.g. CRM webhook URL)
-- Secrets (API keys) live in Supabase Vault, never in a readable table.
-- ---------------------------------------------------------------------------
create table if not exists public.integration_settings (
  key         text primary key,                          -- e.g. 'crm_webhook_url'
  value       text not null,
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);

-- Audit log of AI generations / CRM syncs (cost + abuse visibility)
create table if not exists public.activity_log (
  id          bigint generated always as identity primary key,
  actor       uuid references public.profiles (id) on delete set null,
  action      text not null,                             -- ai.generate | ai.analyze | radar.search | crm.sync | user.invite
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists activity_log_created_idx on public.activity_log (created_at desc);

-- updated_at triggers
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists brand_touch on public.brand_profiles;
create trigger brand_touch before update on public.brand_profiles for each row execute function public.touch_updated_at();
drop trigger if exists content_touch on public.content_items;
create trigger content_touch before update on public.content_items for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles             enable row level security;
alter table public.brand_profiles       enable row level security;
alter table public.creators             enable row level security;
alter table public.viral_posts          enable row level security;
alter table public.content_items        enable row level security;
alter table public.integration_settings enable row level security;
alter table public.activity_log         enable row level security;

-- Anonymous role gets no table privileges at all.
revoke all on all tables in schema public from anon;

-- profiles: members see the team; users edit their own name/avatar; only admins change roles.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (public.is_team_member());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.my_role());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- brand_profiles
drop policy if exists brand_select on public.brand_profiles;
create policy brand_select on public.brand_profiles
  for select to authenticated using (public.is_team_member());
drop policy if exists brand_write on public.brand_profiles;
create policy brand_write on public.brand_profiles
  for insert to authenticated with check (public.can_edit());
drop policy if exists brand_update on public.brand_profiles;
create policy brand_update on public.brand_profiles
  for update to authenticated using (public.can_edit()) with check (public.can_edit());
drop policy if exists brand_delete on public.brand_profiles;
create policy brand_delete on public.brand_profiles
  for delete to authenticated using (public.is_admin());

-- creators
drop policy if exists creators_select on public.creators;
create policy creators_select on public.creators
  for select to authenticated using (public.is_team_member());
drop policy if exists creators_insert on public.creators;
create policy creators_insert on public.creators
  for insert to authenticated with check (public.can_edit());
drop policy if exists creators_update on public.creators;
create policy creators_update on public.creators
  for update to authenticated using (public.can_edit()) with check (public.can_edit());
drop policy if exists creators_delete on public.creators;
create policy creators_delete on public.creators
  for delete to authenticated using (public.is_admin() or created_by = auth.uid());

-- viral_posts
drop policy if exists posts_select on public.viral_posts;
create policy posts_select on public.viral_posts
  for select to authenticated using (public.is_team_member());
drop policy if exists posts_insert on public.viral_posts;
create policy posts_insert on public.viral_posts
  for insert to authenticated with check (public.can_edit());
drop policy if exists posts_update on public.viral_posts;
create policy posts_update on public.viral_posts
  for update to authenticated using (public.can_edit()) with check (public.can_edit());
drop policy if exists posts_delete on public.viral_posts;
create policy posts_delete on public.viral_posts
  for delete to authenticated using (public.is_admin() or created_by = auth.uid());

-- content_items
drop policy if exists content_select on public.content_items;
create policy content_select on public.content_items
  for select to authenticated using (public.is_team_member());
drop policy if exists content_insert on public.content_items;
create policy content_insert on public.content_items
  for insert to authenticated with check (public.can_edit() and created_by = auth.uid());
drop policy if exists content_update on public.content_items;
create policy content_update on public.content_items
  for update to authenticated using (public.can_edit()) with check (public.can_edit());
drop policy if exists content_delete on public.content_items;
create policy content_delete on public.content_items
  for delete to authenticated using (public.is_admin() or created_by = auth.uid());

-- integration_settings: readable by members, writable only by admins
drop policy if exists settings_select on public.integration_settings;
create policy settings_select on public.integration_settings
  for select to authenticated using (public.is_team_member());
drop policy if exists settings_admin on public.integration_settings;
create policy settings_admin on public.integration_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- activity_log: members insert their own rows, only admins read everything
drop policy if exists log_insert on public.activity_log;
create policy log_insert on public.activity_log
  for insert to authenticated with check (public.is_team_member() and actor = auth.uid());
drop policy if exists log_select on public.activity_log;
create policy log_select on public.activity_log
  for select to authenticated using (public.is_admin() or actor = auth.uid());

-- ---------------------------------------------------------------------------
-- Encrypted API keys via Supabase Vault
-- Admins can SET a key (write-only from the client's point of view) and see
-- whether it exists. The decrypted value is only readable with the
-- service_role key, i.e. inside Edge Functions.
-- ---------------------------------------------------------------------------
create extension if not exists "supabase_vault" with schema vault;

create or replace function public.set_integration_secret(secret_name text, secret_value text)
returns void
language plpgsql security definer set search_path = public, vault
as $$
declare
  existing_id uuid;
  full_name text := 'pw_' || secret_name;
begin
  if not public.is_admin() then
    raise exception 'Only admins can store integration secrets' using errcode = '42501';
  end if;
  if secret_name !~ '^[a-z0-9_]{2,48}$' then
    raise exception 'Invalid secret name';
  end if;

  select id into existing_id from vault.secrets where name = full_name;
  if secret_value is null or length(secret_value) = 0 then
    if existing_id is not null then
      delete from vault.secrets where id = existing_id;
    end if;
  elsif existing_id is null then
    perform vault.create_secret(secret_value, full_name, 'Project Two Creator Studio integration secret');
  else
    perform vault.update_secret(existing_id, secret_value, full_name);
  end if;

  insert into public.activity_log (actor, action, meta)
  values (auth.uid(), 'secret.update', jsonb_build_object('name', secret_name, 'cleared', secret_value is null or length(secret_value) = 0));
end;
$$;

create or replace function public.list_integration_secrets()
returns table (name text, updated_at timestamptz)
language sql stable security definer set search_path = public, vault
as $$
  select substring(s.name from 4) as name, s.updated_at
  from vault.secrets s
  where s.name like 'pw\_%' and public.is_team_member();
$$;

-- Only callable by service_role (Edge Functions)
create or replace function public.get_integration_secret(secret_name text)
returns text
language sql stable security definer set search_path = public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'pw_' || secret_name limit 1;
$$;

revoke all on function public.set_integration_secret(text, text) from public, anon;
revoke all on function public.list_integration_secrets() from public, anon;
revoke all on function public.get_integration_secret(text) from public, anon, authenticated;
grant execute on function public.set_integration_secret(text, text) to authenticated;
grant execute on function public.list_integration_secrets() to authenticated;
grant execute on function public.get_integration_secret(text) to service_role;
