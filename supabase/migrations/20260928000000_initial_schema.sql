-- FarmaConnect initial remote schema.
-- Apply through the Supabase SQL Editor or Supabase CLI after creating the project.
-- This file contains no test users, passwords, service_role key or other secrets.

create table public.pharmacies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pharmacy_id uuid not null references public.pharmacies(id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence public.products_internal_code_seq
  start with 1
  increment by 1
  minvalue 1
  maxvalue 999999;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  category text not null check (length(trim(category)) > 0),
  price_cents integer not null check (price_cents >= 0),
  description text not null default '',
  manufacturer text not null default '',
  dosage text,
  ean text check (ean is null or ean ~ '^[0-9]{13}$'),
  internal_code text not null
    default ('FC' || lpad(nextval('public.products_internal_code_seq')::text, 6, '0'))
    check (internal_code ~ '^FC[0-9]{6}$'),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter sequence public.products_internal_code_seq
  owned by public.products.internal_code;

create index products_pharmacy_updated_at_idx
  on public.products (pharmacy_id, updated_at, id);
create index products_pharmacy_category_idx
  on public.products (pharmacy_id, category);
create unique index pharmacies_name_unique_ci
  on public.pharmacies (lower(name));
create unique index products_ean_unique
  on public.products (ean) where ean is not null;
create unique index products_internal_code_unique
  on public.products (internal_code);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger pharmacies_set_updated_at
before update on public.pharmacies
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

alter table public.pharmacies enable row level security;
alter table public.profiles enable row level security;
alter table public.products enable row level security;

-- The Android client has no access until authenticated. It needs read-only
-- access for the one pharmacy linked to its authenticated user.
revoke all on table public.pharmacies from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.products from anon, authenticated;
grant select on table public.pharmacies, public.profiles, public.products to authenticated;

create policy "members can read their pharmacy"
on public.pharmacies for select to authenticated
using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.profiles
    where profiles.user_id = (select auth.uid())
      and profiles.pharmacy_id = pharmacies.id
  )
);

create policy "users can read their own profile"
on public.profiles for select to authenticated
using (user_id = (select auth.uid()));

create policy "members can read products from their pharmacy"
on public.products for select to authenticated
using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.profiles
    where profiles.user_id = (select auth.uid())
      and profiles.pharmacy_id = products.pharmacy_id
  )
);

comment on table public.pharmacies is
  'Farmácias isoladas no FarmaConnect.';
comment on table public.profiles is
  'Vínculo de um usuário autenticado a uma única farmácia.';
comment on table public.products is
  'Catálogo central, somente leitura pelo aplicativo; deleted_at representa exclusão lógica.';
