-- Living Design / Supabase initial schema
-- Run this file once in Supabase Dashboard > SQL Editor.
-- Authentication providers and redirect URLs are configured separately; see docs/supabase-setup.md.

begin;

create extension if not exists pgcrypto;

do $$ begin
  create type public.company_status as enum ('DRAFT', 'PUBLISHED', 'SUSPENDED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.case_status as enum ('DRAFT', 'PUBLISHED', 'ARCHIVED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.company_member_role as enum ('OWNER', 'ADMIN', 'EDITOR');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  address text not null default '',
  phone text not null default '',
  founded_year smallint check (founded_year between 1800 and 2200),
  business_hours text not null default '',
  website_url text,
  logo_path text,
  cover_image_path text,
  status public.company_status not null default 'DRAFT',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.company_member_role not null default 'EDITOR',
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create table if not exists public.company_service_areas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  prefecture text not null,
  city text not null,
  created_at timestamptz not null default now(),
  unique (company_id, prefecture, city)
);

create table if not exists public.construction_cases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  summary text not null default '',
  area text not null default '',
  price_min integer check (price_min is null or price_min >= 0),
  price_max integer check (price_max is null or price_max >= 0),
  construction_period text not null default '',
  status public.case_status not null default 'DRAFT',
  created_by uuid not null references public.profiles(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (price_min is null or price_max is null or price_min <= price_max)
);

create table if not exists public.case_images (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.construction_cases(id) on delete cascade,
  storage_path text not null unique,
  alt_text text not null default '',
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null unique,
  display_order integer not null default 0
);

create table if not exists public.styles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null unique,
  display_order integer not null default 0
);

create table if not exists public.case_categories (
  case_id uuid not null references public.construction_cases(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  primary key (case_id, category_id)
);

create table if not exists public.case_styles (
  case_id uuid not null references public.construction_cases(id) on delete cascade,
  style_id uuid not null references public.styles(id) on delete restrict,
  primary key (case_id, style_id)
);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid not null references public.construction_cases(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, case_id)
);

create index if not exists companies_status_idx on public.companies (status);
create index if not exists company_members_user_id_idx on public.company_members (user_id);
create index if not exists company_service_areas_location_idx on public.company_service_areas (prefecture, city);
create index if not exists construction_cases_company_status_idx on public.construction_cases (company_id, status);
create index if not exists construction_cases_published_at_idx
  on public.construction_cases (published_at desc) where status = 'PUBLISHED';
create index if not exists case_images_case_order_idx on public.case_images (case_id, display_order);
create index if not exists favorites_case_id_idx on public.favorites (case_id);

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

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at before update on public.companies
for each row execute function public.set_updated_at();

drop trigger if exists construction_cases_set_updated_at on public.construction_cases;
create trigger construction_cases_set_updated_at before update on public.construction_cases
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'ユーザー'
    ),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.handle_new_company()
returns trigger
language plpgsql
security definer
set search_path = ''
as $
begin
  insert into public.company_members (company_id, user_id, role)
  values (new.id, new.created_by, 'OWNER')
  on conflict (company_id, user_id) do nothing;
  return new;
end;
$;

drop trigger if exists on_company_created on public.companies;
create trigger on_company_created after insert on public.companies
for each row execute function public.handle_new_company();

create or replace function public.is_company_member(target_company_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.company_members
    where company_id = target_company_id and user_id = auth.uid()
  );
$$;

create or replace function public.has_company_role(
  target_company_id uuid,
  allowed_roles public.company_member_role[]
)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.company_members
    where company_id = target_company_id
      and user_id = auth.uid()
      and role = any(allowed_roles)
  );
$$;

create or replace function public.shares_company_with(target_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.company_members mine
    join public.company_members theirs on theirs.company_id = mine.company_id
    where mine.user_id = auth.uid() and theirs.user_id = target_user_id
  );
$$;

create or replace function public.can_view_company(target_company_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.companies
    where id = target_company_id
      and (status = 'PUBLISHED' or public.is_company_member(id))
  );
$$;

create or replace function public.can_view_case(target_case_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.construction_cases cc
    join public.companies c on c.id = cc.company_id
    where cc.id = target_case_id
      and (
        (cc.status = 'PUBLISHED' and c.status = 'PUBLISHED')
        or public.is_company_member(cc.company_id)
      )
  );
$$;

create or replace function public.can_manage_case(target_case_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.construction_cases
    where id = target_case_id
      and public.has_company_role(
        company_id,
        array['OWNER', 'ADMIN', 'EDITOR']::public.company_member_role[]
      )
  );
$$;

create or replace function public.try_uuid(value text)
returns uuid language plpgsql immutable set search_path = ''
as $$
begin
  return value::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

revoke all on function public.is_company_member(uuid) from public;
revoke all on function public.has_company_role(uuid, public.company_member_role[]) from public;
revoke all on function public.shares_company_with(uuid) from public;
revoke all on function public.can_view_company(uuid) from public;
revoke all on function public.can_view_case(uuid) from public;
revoke all on function public.can_manage_case(uuid) from public;
revoke all on function public.try_uuid(text) from public;

grant execute on function public.is_company_member(uuid) to anon, authenticated;
grant execute on function public.has_company_role(uuid, public.company_member_role[]) to authenticated;
grant execute on function public.shares_company_with(uuid) to authenticated;
grant execute on function public.can_view_company(uuid) to anon, authenticated;
grant execute on function public.can_view_case(uuid) to anon, authenticated;
grant execute on function public.can_manage_case(uuid) to authenticated;
grant execute on function public.try_uuid(text) to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.company_service_areas enable row level security;
alter table public.construction_cases enable row level security;
alter table public.case_images enable row level security;
alter table public.categories enable row level security;
alter table public.styles enable row level security;
alter table public.case_categories enable row level security;
alter table public.case_styles enable row level security;
alter table public.favorites enable row level security;

drop policy if exists "profiles_select_related" on public.profiles;
create policy "profiles_select_related" on public.profiles for select
using (id = auth.uid() or public.shares_company_with(id));

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles for insert
with check (id = auth.uid());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update
using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "companies_select_visible" on public.companies;
create policy "companies_select_visible" on public.companies for select
using (status = 'PUBLISHED' or public.is_company_member(id));

drop policy if exists "companies_insert_authenticated" on public.companies;
create policy "companies_insert_authenticated" on public.companies for insert to authenticated
with check (created_by = auth.uid());

drop policy if exists "companies_update_admin" on public.companies;
create policy "companies_update_admin" on public.companies for update to authenticated
using (public.has_company_role(id, array['OWNER', 'ADMIN']::public.company_member_role[]))
with check (public.has_company_role(id, array['OWNER', 'ADMIN']::public.company_member_role[]));

drop policy if exists "companies_delete_owner" on public.companies;
create policy "companies_delete_owner" on public.companies for delete to authenticated
using (public.has_company_role(id, array['OWNER']::public.company_member_role[]));

drop policy if exists "company_members_select_company" on public.company_members;
create policy "company_members_select_company" on public.company_members for select to authenticated
using (user_id = auth.uid() or public.is_company_member(company_id));

drop policy if exists "company_members_insert_admin" on public.company_members;
create policy "company_members_insert_admin" on public.company_members for insert to authenticated
with check (public.has_company_role(company_id, array['OWNER', 'ADMIN']::public.company_member_role[]));

drop policy if exists "company_members_update_admin" on public.company_members;
create policy "company_members_update_admin" on public.company_members for update to authenticated
using (public.has_company_role(company_id, array['OWNER', 'ADMIN']::public.company_member_role[]))
with check (public.has_company_role(company_id, array['OWNER', 'ADMIN']::public.company_member_role[]));

drop policy if exists "company_members_delete_admin" on public.company_members;
create policy "company_members_delete_admin" on public.company_members for delete to authenticated
using (public.has_company_role(company_id, array['OWNER', 'ADMIN']::public.company_member_role[]));

drop policy if exists "service_areas_select_visible" on public.company_service_areas;
create policy "service_areas_select_visible" on public.company_service_areas for select
using (public.can_view_company(company_id));

drop policy if exists "service_areas_manage_company" on public.company_service_areas;
create policy "service_areas_manage_company" on public.company_service_areas for all to authenticated
using (public.has_company_role(company_id, array['OWNER', 'ADMIN', 'EDITOR']::public.company_member_role[]))
with check (public.has_company_role(company_id, array['OWNER', 'ADMIN', 'EDITOR']::public.company_member_role[]));

drop policy if exists "cases_select_visible" on public.construction_cases;
create policy "cases_select_visible" on public.construction_cases for select
using (public.can_view_case(id));

drop policy if exists "cases_insert_company" on public.construction_cases;
create policy "cases_insert_company" on public.construction_cases for insert to authenticated
with check (
  created_by = auth.uid()
  and public.has_company_role(company_id, array['OWNER', 'ADMIN', 'EDITOR']::public.company_member_role[])
);

drop policy if exists "cases_update_company" on public.construction_cases;
create policy "cases_update_company" on public.construction_cases for update to authenticated
using (public.can_manage_case(id))
with check (public.has_company_role(company_id, array['OWNER', 'ADMIN', 'EDITOR']::public.company_member_role[]));

drop policy if exists "cases_delete_company" on public.construction_cases;
create policy "cases_delete_company" on public.construction_cases for delete to authenticated
using (public.can_manage_case(id));

drop policy if exists "case_images_select_visible" on public.case_images;
create policy "case_images_select_visible" on public.case_images for select
using (public.can_view_case(case_id));

drop policy if exists "case_images_manage_case" on public.case_images;
create policy "case_images_manage_case" on public.case_images for all to authenticated
using (public.can_manage_case(case_id)) with check (public.can_manage_case(case_id));

drop policy if exists "categories_select_all" on public.categories;
create policy "categories_select_all" on public.categories for select using (true);

drop policy if exists "styles_select_all" on public.styles;
create policy "styles_select_all" on public.styles for select using (true);

drop policy if exists "case_categories_select_visible" on public.case_categories;
create policy "case_categories_select_visible" on public.case_categories for select
using (public.can_view_case(case_id));

drop policy if exists "case_categories_manage_case" on public.case_categories;
create policy "case_categories_manage_case" on public.case_categories for all to authenticated
using (public.can_manage_case(case_id)) with check (public.can_manage_case(case_id));

drop policy if exists "case_styles_select_visible" on public.case_styles;
create policy "case_styles_select_visible" on public.case_styles for select
using (public.can_view_case(case_id));

drop policy if exists "case_styles_manage_case" on public.case_styles;
create policy "case_styles_manage_case" on public.case_styles for all to authenticated
using (public.can_manage_case(case_id)) with check (public.can_manage_case(case_id));

drop policy if exists "favorites_select_self" on public.favorites;
create policy "favorites_select_self" on public.favorites for select to authenticated
using (user_id = auth.uid());

drop policy if exists "favorites_insert_self" on public.favorites;
create policy "favorites_insert_self" on public.favorites for insert to authenticated
with check (user_id = auth.uid() and public.can_view_case(case_id));

drop policy if exists "favorites_delete_self" on public.favorites;
create policy "favorites_delete_self" on public.favorites for delete to authenticated
using (user_id = auth.uid());

insert into public.categories (slug, name, display_order)
values
  ('kitchen', 'キッチン', 10),
  ('living', 'リビング', 20),
  ('bath', '水回り', 30),
  ('interior', '内装', 40),
  ('detached-house', '戸建て', 50)
on conflict (slug) do update set name = excluded.name, display_order = excluded.display_order;

insert into public.styles (slug, name, display_order)
values
  ('storage', '収納', 10),
  ('insulation', '断熱', 20),
  ('barrier-free', 'バリアフリー', 30),
  ('natural', '自然素材', 40)
on conflict (slug) do update set name = excluded.name, display_order = excluded.display_order;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('company-assets', 'company-assets', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('case-images', 'case-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "company_assets_select_visible" on storage.objects;
create policy "company_assets_select_visible" on storage.objects for select
using (
  bucket_id = 'company-assets'
  and public.can_view_company(public.try_uuid((storage.foldername(name))[1]))
);

drop policy if exists "company_assets_insert_company" on storage.objects;
create policy "company_assets_insert_company" on storage.objects for insert to authenticated
with check (
  bucket_id = 'company-assets'
  and public.has_company_role(
    public.try_uuid((storage.foldername(name))[1]),
    array['OWNER', 'ADMIN', 'EDITOR']::public.company_member_role[]
  )
);

drop policy if exists "company_assets_update_company" on storage.objects;
create policy "company_assets_update_company" on storage.objects for update to authenticated
using (
  bucket_id = 'company-assets'
  and public.has_company_role(
    public.try_uuid((storage.foldername(name))[1]),
    array['OWNER', 'ADMIN', 'EDITOR']::public.company_member_role[]
  )
)
with check (
  bucket_id = 'company-assets'
  and public.has_company_role(
    public.try_uuid((storage.foldername(name))[1]),
    array['OWNER', 'ADMIN', 'EDITOR']::public.company_member_role[]
  )
);

drop policy if exists "company_assets_delete_company" on storage.objects;
create policy "company_assets_delete_company" on storage.objects for delete to authenticated
using (
  bucket_id = 'company-assets'
  and public.has_company_role(
    public.try_uuid((storage.foldername(name))[1]),
    array['OWNER', 'ADMIN', 'EDITOR']::public.company_member_role[]
  )
);

drop policy if exists "case_images_storage_select_visible" on storage.objects;
create policy "case_images_storage_select_visible" on storage.objects for select
using (
  bucket_id = 'case-images'
  and public.can_view_case(public.try_uuid((storage.foldername(name))[2]))
);

drop policy if exists "case_images_storage_insert_company" on storage.objects;
create policy "case_images_storage_insert_company" on storage.objects for insert to authenticated
with check (
  bucket_id = 'case-images'
  and public.has_company_role(
    public.try_uuid((storage.foldername(name))[1]),
    array['OWNER', 'ADMIN', 'EDITOR']::public.company_member_role[]
  )
);

drop policy if exists "case_images_storage_update_company" on storage.objects;
create policy "case_images_storage_update_company" on storage.objects for update to authenticated
using (
  bucket_id = 'case-images'
  and public.can_manage_case(public.try_uuid((storage.foldername(name))[2]))
)
with check (
  bucket_id = 'case-images'
  and public.can_manage_case(public.try_uuid((storage.foldername(name))[2]))
);

drop policy if exists "case_images_storage_delete_company" on storage.objects;
create policy "case_images_storage_delete_company" on storage.objects for delete to authenticated
using (
  bucket_id = 'case-images'
  and public.can_manage_case(public.try_uuid((storage.foldername(name))[2]))
);

commit;
