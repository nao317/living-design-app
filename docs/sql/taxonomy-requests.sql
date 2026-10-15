-- Run after the existing Supabase setup. Keep this migration with the app because /supabase is ignored.
begin;

alter table public.categories add column if not exists is_active boolean not null default true;
alter table public.styles add column if not exists is_active boolean not null default true;

create table if not exists public.taxonomy_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  requested_by uuid not null references auth.users(id),
  kind text not null check (kind in ('CATEGORY', 'STYLE')),
  operation text not null check (operation in ('CREATE', 'EDIT', 'DELETE')),
  target_id uuid,
  proposed_name text,
  reason text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN')),
  reviewed_by uuid references auth.users(id),
  review_reason text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint taxonomy_request_shape check (
    (operation = 'CREATE' and target_id is null and proposed_name is not null)
    or (operation = 'EDIT' and target_id is not null and proposed_name is not null)
    or (operation = 'DELETE' and target_id is not null and proposed_name is null)
  ),
  constraint taxonomy_request_name_length check (proposed_name is null or length(btrim(proposed_name)) between 1 and 100),
  constraint taxonomy_request_reason_length check (length(btrim(reason)) between 1 and 1000)
);

create unique index if not exists taxonomy_requests_pending_target
  on public.taxonomy_requests(kind, target_id) where status = 'PENDING' and target_id is not null;
create unique index if not exists taxonomy_requests_pending_create
  on public.taxonomy_requests(kind, lower(proposed_name)) where status = 'PENDING' and operation = 'CREATE';
create index if not exists taxonomy_requests_company_created
  on public.taxonomy_requests(company_id, created_at desc);

alter table public.taxonomy_requests enable row level security;
drop policy if exists taxonomy_requests_select on public.taxonomy_requests;
create policy taxonomy_requests_select on public.taxonomy_requests for select to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.account_role = 'ADMIN')
  or exists (select 1 from public.company_members m where m.user_id = auth.uid() and m.company_id = taxonomy_requests.company_id)
);
revoke insert, update, delete on public.taxonomy_requests from anon, authenticated;
grant select on public.taxonomy_requests to authenticated;

create or replace function public.submit_taxonomy_request(
  target_company_id uuid, request_kind text, request_operation text,
  request_target_id uuid, request_name text, request_reason text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  result_id uuid;
  clean_name text := nullif(btrim(request_name), '');
  clean_reason text := nullif(btrim(request_reason), '');
  existing_name text;
  duplicate_exists boolean;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.account_role = 'COMPANY'
  ) or not exists (
    select 1 from public.company_members m where m.user_id = auth.uid() and m.company_id = target_company_id
  ) then raise exception 'permission denied' using errcode = '42501'; end if;

  if request_kind not in ('CATEGORY', 'STYLE') or request_operation not in ('CREATE', 'EDIT', 'DELETE')
    or clean_reason is null or length(clean_reason) > 1000
    or (request_operation = 'CREATE' and (request_target_id is not null or clean_name is null))
    or (request_operation = 'EDIT' and (request_target_id is null or clean_name is null))
    or (request_operation = 'DELETE' and (request_target_id is null or clean_name is not null))
    or (clean_name is not null and length(clean_name) > 100)
  then raise exception 'invalid request' using errcode = '22023'; end if;

  if request_operation <> 'CREATE' then
    if request_kind = 'CATEGORY' then
      select name into existing_name from public.categories where id = request_target_id and is_active;
    else
      select name into existing_name from public.styles where id = request_target_id and is_active;
    end if;
    if existing_name is null then raise exception 'target not found' using errcode = '22023'; end if;
    if request_operation = 'EDIT' and lower(existing_name) = lower(clean_name) then
      raise exception 'name has not changed' using errcode = '22023';
    end if;
  end if;

  if request_operation <> 'DELETE' then
    if request_kind = 'CATEGORY' then
      select exists(select 1 from public.categories where lower(name) = lower(clean_name) and id is distinct from request_target_id) into duplicate_exists;
    else
      select exists(select 1 from public.styles where lower(name) = lower(clean_name) and id is distinct from request_target_id) into duplicate_exists;
    end if;
    if duplicate_exists then raise exception 'name already exists' using errcode = '23505'; end if;
  end if;

  insert into public.taxonomy_requests(company_id, requested_by, kind, operation, target_id, proposed_name, reason)
  values (target_company_id, auth.uid(), request_kind, request_operation, request_target_id, clean_name, clean_reason)
  returning id into result_id;
  return result_id;
end;
$$;

create or replace function public.withdraw_taxonomy_request(target_request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.taxonomy_requests r set status = 'WITHDRAWN'
  where r.id = target_request_id and r.status = 'PENDING' and exists (
    select 1 from public.company_members m where m.company_id = r.company_id and m.user_id = auth.uid()
  );
  if not found then raise exception 'request not found or no longer pending' using errcode = '22023'; end if;
end;
$$;

create or replace function public.review_taxonomy_request(
  target_request_id uuid, decision text, decision_reason text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  requested public.taxonomy_requests%rowtype;
  duplicate_exists boolean;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.account_role = 'ADMIN'
  ) then raise exception 'permission denied' using errcode = '42501'; end if;
  if decision not in ('APPROVED', 'REJECTED') or (decision = 'REJECTED' and nullif(btrim(decision_reason), '') is null)
    or length(coalesce(decision_reason, '')) > 1000
  then raise exception 'invalid decision' using errcode = '22023'; end if;

  select * into requested from public.taxonomy_requests where id = target_request_id for update;
  if not found or requested.status <> 'PENDING' then
    raise exception 'request not found or no longer pending' using errcode = '22023';
  end if;

  if decision = 'APPROVED' then
    if requested.operation <> 'DELETE' then
      if requested.kind = 'CATEGORY' then
        select exists(select 1 from public.categories where lower(name) = lower(requested.proposed_name) and id is distinct from requested.target_id) into duplicate_exists;
      else
        select exists(select 1 from public.styles where lower(name) = lower(requested.proposed_name) and id is distinct from requested.target_id) into duplicate_exists;
      end if;
      if duplicate_exists then raise exception 'name already exists' using errcode = '23505'; end if;
    end if;

    if requested.kind = 'CATEGORY' then
      if requested.operation = 'CREATE' then
        insert into public.categories(slug, name, display_order)
        values (gen_random_uuid()::text, requested.proposed_name, (select coalesce(max(display_order), 0) + 1 from public.categories));
      elsif requested.operation = 'EDIT' then
        update public.categories set name = requested.proposed_name where id = requested.target_id and is_active;
      else
        update public.categories set is_active = false where id = requested.target_id and is_active;
      end if;
    else
      if requested.operation = 'CREATE' then
        insert into public.styles(slug, name, display_order)
        values (gen_random_uuid()::text, requested.proposed_name, (select coalesce(max(display_order), 0) + 1 from public.styles));
      elsif requested.operation = 'EDIT' then
        update public.styles set name = requested.proposed_name where id = requested.target_id and is_active;
      else
        update public.styles set is_active = false where id = requested.target_id and is_active;
      end if;
    end if;
    if requested.operation <> 'CREATE' and not found then
      raise exception 'target no longer active' using errcode = '22023';
    end if;
  end if;

  update public.taxonomy_requests set status = decision, reviewed_by = auth.uid(),
    review_reason = nullif(btrim(decision_reason), ''), reviewed_at = now()
  where id = target_request_id;
end;
$$;

revoke all on function public.submit_taxonomy_request(uuid, text, text, uuid, text, text) from public;
revoke all on function public.withdraw_taxonomy_request(uuid) from public;
revoke all on function public.review_taxonomy_request(uuid, text, text) from public;
grant execute on function public.submit_taxonomy_request(uuid, text, text, uuid, text, text) to authenticated;
grant execute on function public.withdraw_taxonomy_request(uuid) to authenticated;
grant execute on function public.review_taxonomy_request(uuid, text, text) to authenticated;

commit;
