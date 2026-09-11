export const SCHEMA_SQL = `-- Senarai ID DELIMA murid mengikut kelas
create table if not exists public.murid (
  id uuid primary key default gen_random_uuid(),
  kelas text not null,
  id_delima text not null unique,
  nama text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists murid_kelas_idx on public.murid (kelas);
create index if not exists murid_nama_idx on public.murid (nama);

alter table public.murid enable row level security;

drop policy if exists "murid_select" on public.murid;
drop policy if exists "murid_insert" on public.murid;
drop policy if exists "murid_update" on public.murid;
drop policy if exists "murid_delete" on public.murid;

create policy "murid_select" on public.murid for select using (true);
create policy "murid_insert" on public.murid for insert to authenticated with check (true);
create policy "murid_update" on public.murid for update to authenticated using (true) with check (true);
create policy "murid_delete" on public.murid for delete to authenticated using (true);

-- Akaun admin (disambungkan ke Authentication)
create table if not exists public.admin (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  nama text not null,
  created_at timestamptz not null default now()
);

alter table public.admin enable row level security;

drop policy if exists "admin_select_own" on public.admin;
drop policy if exists "admin_insert_own" on public.admin;

create policy "admin_select_own" on public.admin
  for select to authenticated using (auth.uid() = id);

create policy "admin_insert_own" on public.admin
  for insert to authenticated with check (auth.uid() = id);
`
