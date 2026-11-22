-- ============================================================================
-- Trend Radar, Video Studio and media storage
-- ============================================================================

create table if not exists public.trends (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  saved       boolean not null default false,
  data        jsonb not null,                       -- full Trend object (see src/lib/types.ts)
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists trends_created_idx on public.trends (created_at desc);

create table if not exists public.video_projects (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  content_item_id  uuid references public.content_items (id) on delete set null,
  data             jsonb not null,                  -- full VideoProject incl. shots
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists video_touch on public.video_projects;
create trigger video_touch before update on public.video_projects for each row execute function public.touch_updated_at();

alter table public.trends enable row level security;
alter table public.video_projects enable row level security;
revoke all on public.trends from anon;
revoke all on public.video_projects from anon;

drop policy if exists trends_select on public.trends;
create policy trends_select on public.trends for select to authenticated using (public.is_team_member());
drop policy if exists trends_write on public.trends;
create policy trends_write on public.trends for insert to authenticated with check (public.can_edit());
drop policy if exists trends_update on public.trends;
create policy trends_update on public.trends for update to authenticated using (public.can_edit()) with check (public.can_edit());
drop policy if exists trends_delete on public.trends;
create policy trends_delete on public.trends for delete to authenticated using (public.can_edit());

drop policy if exists videos_select on public.video_projects;
create policy videos_select on public.video_projects for select to authenticated using (public.is_team_member());
drop policy if exists videos_insert on public.video_projects;
create policy videos_insert on public.video_projects for insert to authenticated with check (public.can_edit());
drop policy if exists videos_update on public.video_projects;
create policy videos_update on public.video_projects for update to authenticated using (public.can_edit()) with check (public.can_edit());
drop policy if exists videos_delete on public.video_projects;
create policy videos_delete on public.video_projects for delete to authenticated using (public.is_admin() or created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- Private storage bucket for generated / uploaded clips, images and audio.
-- Files are read through signed URLs; only team members can upload.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', false, 209715200)
on conflict (id) do nothing;

drop policy if exists media_read on storage.objects;
create policy media_read on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.is_team_member());
drop policy if exists media_insert on storage.objects;
create policy media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.can_edit());
drop policy if exists media_delete on storage.objects;
create policy media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (public.is_admin() or owner = auth.uid()));
