-- Media library: uploaded, generated and recorded images / videos / audio.
create table if not exists public.media_assets (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  kind        text not null check (kind in ('image', 'video', 'audio')),
  data        jsonb not null,                       -- full MediaItem (url, size, source, tags…)
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists media_assets_created_idx on public.media_assets (created_at desc);

alter table public.media_assets enable row level security;
revoke all on public.media_assets from anon;

drop policy if exists media_assets_select on public.media_assets;
create policy media_assets_select on public.media_assets for select to authenticated using (public.is_team_member());
drop policy if exists media_assets_insert on public.media_assets;
create policy media_assets_insert on public.media_assets for insert to authenticated with check (public.can_edit());
drop policy if exists media_assets_update on public.media_assets;
create policy media_assets_update on public.media_assets for update to authenticated using (public.can_edit()) with check (public.can_edit());
drop policy if exists media_assets_delete on public.media_assets;
create policy media_assets_delete on public.media_assets for delete to authenticated using (public.is_admin() or created_by = auth.uid());
