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

alter table public.murid enable row level security;

drop policy if exists "murid_select" on public.murid;
drop policy if exists "murid_insert" on public.murid;
drop policy if exists "murid_update" on public.murid;
drop policy if exists "murid_delete" on public.murid;

create policy "murid_select" on public.murid for select using (true);
create policy "murid_insert" on public.murid for insert with check (true);
create policy "murid_update" on public.murid for update using (true) with check (true);
create policy "murid_delete" on public.murid for delete using (true);
`
