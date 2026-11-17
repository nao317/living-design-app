import ui from "../../ui.module.css";
import { useState } from "react";
import { Form, Link, useSearchParams } from "react-router";
import type { SearchOption } from "../../features/cases/public-data.client";
import type { SearchParams } from "../../features/search/schema";
import { Button } from "../atoms";

type FilterOptions = { categories?: SearchOption[]; styles?: SearchOption[] };
type FilterFormProps = FilterOptions & { filters?: SearchParams; presentation: "home" | "results"; onSubmitted?: () => void };

function FilterForm({ filters, categories = [], styles = [], presentation, onSubmitted }: FilterFormProps) {
  const home = presentation === "home";
  const additional = <>
    <label>キーワード<input name="q" autoComplete="off" defaultValue={filters?.q ?? ""} maxLength={100} placeholder="例：収納を増やしたい…" /></label>
    <label>施工地域<input name="area" autoComplete="off" defaultValue={filters?.area ?? ""} maxLength={120} placeholder="例：飯塚市…" /></label>
    <label>施工期間<select name="period" defaultValue={filters?.period ?? ""}><option value="">指定なし</option><option value="1">1か月以内</option><option value="3">3か月以内</option></select></label>
    {styles.length ? <label>こだわり条件<select name="style" defaultValue={filters?.style ?? ""}><option value="">指定なし</option>{styles.map(style => <option key={style.slug} value={style.slug}>{style.name}</option>)}</select></label> : null}
  </>;
  return <Form key={filters ? JSON.stringify(filters) : "home"} method="get" action="/search" onSubmit={onSubmitted} className={`${ui.filters} ${home ? ui["filters--home"] : ""}`}>
    {!home ? <h2>検索条件</h2> : null}
    <label>リノベーション箇所<select name="category" defaultValue={filters?.category ?? ""}><option value="">すべての箇所</option>{categories.map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></label>
    <fieldset className={ui["budget-field"]}><legend>予算（万円）</legend>
      <span className={ui["range-fields"]}>
        <input name="budgetMin" type="number" min="0" max="214748.3647" step="any" inputMode="decimal" autoComplete="off" defaultValue={filters?.priceMin !== undefined ? filters.priceMin / 10000 : ""} aria-label="予算下限（万円）" placeholder="下限なし" />
        <span aria-hidden="true">〜</span>
        <input name="budgetMax" type="number" min="0" max="214748.3647" step="any" inputMode="decimal" autoComplete="off" defaultValue={filters?.priceMax !== undefined ? filters.priceMax / 10000 : ""} aria-label="予算上限（万円）" placeholder="上限なし" />
      </span>
    </fieldset>
    {home ? <details className={ui["filter-details"]}><summary>詳しい条件を指定する</summary><div>{additional}</div></details> : additional}
    {!home ? <input type="hidden" name="sort" value={filters?.sort ?? "newest"} /> : null}
    <Button className={ui["filter-submit"]} type="submit">事例を検索する</Button>
    {!home ? <Link className={ui["filter-clear"]} to="/search" onClick={onSubmitted}>条件をすべて解除</Link> : null}
  </Form>;
}
export function HomeFilters(options: FilterOptions) { return <FilterForm presentation="home" {...options} />; }
export function SearchFilters({ filters, ...options }: FilterOptions & { filters: SearchParams }) {
  const [open, setOpen] = useState(false);
  const count = [filters.q, filters.area, filters.category, filters.style, filters.priceMin !== undefined || filters.priceMax !== undefined, filters.period].filter(Boolean).length;
  return <section className={`${ui["filter-panel"]} ${open ? ui["is-open"] : ""}`}>
    <button type="button" className={ui["filter-toggle"] + " " + ui.button + " " + ui["button--secondary"]} aria-expanded={open} aria-controls="search-filters" onClick={() => setOpen(current => !current)}>{open ? "検索条件を閉じる" : count ? `検索条件（${count}件指定）` : "検索条件を指定"}</button>
    <div id="search-filters" className={ui["filter-panel__content"]}><FilterForm filters={filters} presentation="results" {...options} onSubmitted={() => setOpen(false)} /></div>
  </section>;
}
export function SearchSort({ value }: { value: SearchParams["sort"] }) {
  const [params] = useSearchParams();
  return <Form method="get" action="/search" className={ui["search-sort"]}>
    {[...params].filter(([key]) => key !== "sort" && key !== "page").map(([key, value], index) => <input type="hidden" key={`${key}-${index}`} name={key} value={value} />)}
    <label>並び順<select name="sort" value={value} onChange={event => event.currentTarget.form?.requestSubmit()}><option value="newest">新しい順</option><option value="oldest">古い順</option><option value="price_asc">費用が低い順</option><option value="price_desc">費用が高い順</option></select></label>
  </Form>;
}
