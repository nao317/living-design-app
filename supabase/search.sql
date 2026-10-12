-- Apply after setup.sql. Safe to rerun for an existing database.
begin;

create or replace function public.construction_period_months(value text)
returns numeric
language sql immutable
set search_path = ''
as $$
  select case
    when value ~ '[0-9]+[[:space:]]*年' then
      (substring(value from '([0-9]+)[[:space:]]*年'))::numeric * 12
      + coalesce((substring(value from '([0-9]+)[[:space:]]*(ヶ|か|カ)?月'))::numeric, 0)
    when value ~ '[0-9]+[[:space:]]*(ヶ|か|カ)?月' then
      (substring(value from '([0-9]+)[[:space:]]*(ヶ|か|カ)?月'))::numeric
    when value ~ '[0-9]+[[:space:]]*週間' then
      (substring(value from '([0-9]+)[[:space:]]*週間'))::numeric * 7 / 30.44
    when value ~ '[0-9]+[[:space:]]*日' then
      (substring(value from '([0-9]+)[[:space:]]*日'))::numeric / 30.44
    when value ~ '^[[:space:]]*[0-9]+[[:space:]]*$' then trim(value)::numeric
    else null
  end;
$$;

create or replace function public.search_public_cases(
  p_q text default '',
  p_area text default '',
  p_category text default '',
  p_style text default '',
  p_price_min integer default null,
  p_price_max integer default null,
  p_period_months integer default null,
  p_sort text default 'newest',
  p_page integer default 1,
  p_page_size integer default 10
)
returns jsonb
language sql stable
set search_path = ''
as $$
  with matching as materialized (
    select c.id, c.company_id, c.title, c.summary, c.area,
           c.price_min, c.price_max, c.construction_period, c.published_at
    from public.construction_cases c
    join public.companies company on company.id = c.company_id
    where c.status = 'PUBLISHED'
      and company.status = 'PUBLISHED'
      and (trim(p_q) = '' or c.title ilike '%' || trim(p_q) || '%'
        or c.summary ilike '%' || trim(p_q) || '%'
        or c.area ilike '%' || trim(p_q) || '%'
        or company.name ilike '%' || trim(p_q) || '%'
        or company.address ilike '%' || trim(p_q) || '%'
        or exists (
          select 1 from public.case_categories cc
          join public.categories category on category.id = cc.category_id
          where cc.case_id = c.id and category.name ilike '%' || trim(p_q) || '%'
        )
        or exists (
          select 1 from public.case_styles cs
          join public.styles style on style.id = cs.style_id
          where cs.case_id = c.id and style.name ilike '%' || trim(p_q) || '%'
        ))
      and (trim(p_area) = '' or c.area ilike '%' || trim(p_area) || '%')
      and (trim(p_category) = '' or exists (
        select 1 from public.case_categories cc
        join public.categories category on category.id = cc.category_id
        where cc.case_id = c.id and category.slug = p_category
      ))
      and (trim(p_style) = '' or exists (
        select 1 from public.case_styles cs
        join public.styles style on style.id = cs.style_id
        where cs.case_id = c.id and style.slug = p_style
      ))
      and (p_price_min is null or ((c.price_min is not null or c.price_max is not null)
        and (c.price_max is null or c.price_max >= p_price_min)))
      and (p_price_max is null or ((c.price_min is not null or c.price_max is not null)
        and (c.price_min is null or c.price_min <= p_price_max)))
      and (p_period_months is null or public.construction_period_months(c.construction_period) <= p_period_months)
  ), counted as (
    select count(*)::integer as total from matching
  ), paged as (
    select id, company_id, title, summary, area, price_min, price_max, construction_period,
      row_number() over (order by
        case when p_sort = 'oldest' then published_at end asc nulls last,
        case when p_sort = 'price_asc' then coalesce(price_min, price_max) end asc nulls last,
        case when p_sort = 'price_desc' then coalesce(price_min, price_max) end desc nulls last,
        case when p_sort not in ('oldest', 'price_asc', 'price_desc') then published_at end desc nulls last,
        id desc
      ) as position
    from matching
    order by
      case when p_sort = 'oldest' then published_at end asc nulls last,
      case when p_sort = 'price_asc' then coalesce(price_min, price_max) end asc nulls last,
      case when p_sort = 'price_desc' then coalesce(price_min, price_max) end desc nulls last,
      case when p_sort not in ('oldest', 'price_asc', 'price_desc') then published_at end desc nulls last,
      id desc
    limit least(greatest(p_page_size, 1), 100)
    offset (greatest(p_page, 1)::bigint - 1) * least(greatest(p_page_size, 1), 100)
  )
  select jsonb_build_object(
    'total', counted.total,
    'items', coalesce((select jsonb_agg(to_jsonb(paged) - 'position' order by position) from paged), '[]'::jsonb)
  ) from counted;
$$;

revoke all on function public.search_public_cases(text, text, text, text, integer, integer, integer, text, integer, integer) from public;
grant execute on function public.search_public_cases(text, text, text, text, integer, integer, integer, text, integer, integer) to anon, authenticated;
revoke all on function public.construction_period_months(text) from public;
grant execute on function public.construction_period_months(text) to anon, authenticated;

do $$
begin
  if public.construction_period_months('1年') <> 12
    or public.construction_period_months('2週間') >= 1
    or public.construction_period_months('1年6か月') <> 18 then
    raise exception 'Construction period parsing failed';
  end if;
end;
$$;

commit;
