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

create table if not exists public.admin (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  nama text not null,
  created_at timestamptz not null default now()
);

alter table public.admin enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin where id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public._cipta_akaun_admin(
  p_email text,
  p_password text,
  p_nama text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  normalized_email text := lower(trim(p_email));
  normalized_nama text := trim(p_nama);
begin
  if normalized_email is null or position('@' in normalized_email) < 2 then
    raise exception 'Emel tidak sah';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'Kata laluan mestilah sekurang-kurangnya 6 aksara';
  end if;
  if normalized_nama is null or normalized_nama = '' then
    raise exception 'Nama admin diperlukan';
  end if;

  select id into new_id
  from auth.users
  where lower(email) = normalized_email
  limit 1;

  if new_id is not null then
    update auth.users
    set
      encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('nama', normalized_nama),
      updated_at = now()
    where id = new_id;
  else
    new_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      new_id,
      'authenticated',
      'authenticated',
      normalized_email,
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('nama', normalized_nama),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      new_id,
      jsonb_build_object(
        'sub', new_id::text,
        'email', normalized_email,
        'email_verified', true
      ),
      'email',
      new_id::text,
      now(),
      now(),
      now()
    );
  end if;

  insert into public.admin (id, email, nama)
  values (new_id, normalized_email, normalized_nama)
  on conflict (id) do update
    set email = excluded.email,
        nama = excluded.nama;

  return new_id;
end;
$$;

revoke all on function public._cipta_akaun_admin(text, text, text) from public;

create or replace function public.daftar_admin(
  p_email text,
  p_password text,
  p_nama text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Hanya admin boleh daftar user lain';
  end if;
  return public._cipta_akaun_admin(p_email, p_password, p_nama);
end;
$$;

revoke all on function public.daftar_admin(text, text, text) from public;
grant execute on function public.daftar_admin(text, text, text) to authenticated;

drop policy if exists "murid_select" on public.murid;
drop policy if exists "murid_insert" on public.murid;
drop policy if exists "murid_update" on public.murid;
drop policy if exists "murid_delete" on public.murid;

create policy "murid_select" on public.murid for select using (true);
create policy "murid_insert" on public.murid for insert to authenticated with check (public.is_admin());
create policy "murid_update" on public.murid for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "murid_delete" on public.murid for delete to authenticated using (public.is_admin());

drop policy if exists "admin_select_own" on public.admin;
drop policy if exists "admin_insert_own" on public.admin;
drop policy if exists "admin_select" on public.admin;

create policy "admin_select" on public.admin
  for select to authenticated using (public.is_admin());

-- Cipta admin pertama tanpa emel (elak Auth rate limit), kemudian log masuk di /login:
-- select public._cipta_akaun_admin('emel-admin', 'kata-laluan', 'nama');
`
