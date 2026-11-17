-- Run in the Supabase SQL Editor before deploying this app version.
begin;

alter table public.case_images add column if not exists taken_on date;
alter table public.case_images add column if not exists description text not null default '';

-- SECURITY INVOKER preserves the existing case_images RLS policies.
-- All image rows are committed or rolled back together, including replacement of the cover.
create or replace function public.save_case_images(
  target_case_id uuid,
  image_updates jsonb,
  remove_image_ids uuid[] default '{}'
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  image jsonb;
  changed_id uuid;
  target_company_id uuid;
  deleted_count integer;
begin
  select c.company_id into target_company_id from public.construction_cases c where c.id = target_case_id for update;
  if auth.uid() is null or target_company_id is null or not (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.account_role = 'ADMIN')
    or exists (
      select 1 from public.company_members m
      where m.user_id = auth.uid() and m.company_id = target_company_id
    )
  ) then raise exception 'permission denied' using errcode = '42501'; end if;

  if jsonb_typeof(image_updates) is distinct from 'array' or jsonb_array_length(image_updates) > 10
    then raise exception 'invalid image list' using errcode = '22023'; end if;

  delete from public.case_images where case_id = target_case_id and id = any(remove_image_ids);
  get diagnostics deleted_count = row_count;
  if deleted_count <> cardinality(remove_image_ids)
    then raise exception 'image not found or permission denied' using errcode = '42501'; end if;

  for image in select value from jsonb_array_elements(image_updates) loop
    if length(coalesce(image->>'description', '')) > 2000
      or coalesce(image->>'storage_path', '') = ''
      or image->>'storage_path' not like target_company_id::text || '/' || target_case_id::text || '/%'
      or coalesce((image->>'display_order')::integer, -1) < 0
    then raise exception 'invalid image' using errcode = '22023'; end if;

    if nullif(image->>'id', '') is null then
      insert into public.case_images(case_id, storage_path, display_order, taken_on, description)
      values (target_case_id, image->>'storage_path', (image->>'display_order')::integer,
        nullif(image->>'taken_on', '')::date, coalesce(image->>'description', ''));
    else
      update public.case_images set
        storage_path = image->>'storage_path', display_order = (image->>'display_order')::integer,
        taken_on = nullif(image->>'taken_on', '')::date, description = coalesce(image->>'description', '')
      where id = (image->>'id')::uuid and case_id = target_case_id
      returning id into changed_id;
      if not found then raise exception 'image not found or permission denied' using errcode = '42501'; end if;
    end if;
  end loop;

  if (select count(*) from public.case_images where case_id = target_case_id) > 10
    then raise exception 'too many images' using errcode = '22023'; end if;
end;
$$;

revoke all on function public.save_case_images(uuid, jsonb, uuid[]) from public, anon;
grant execute on function public.save_case_images(uuid, jsonb, uuid[]) to authenticated;

commit;
