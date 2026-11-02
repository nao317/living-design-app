import { useState } from "react";
import { Form, Link } from "react-router";
import type { SearchOption } from "../../features/cases/public-data.client";
import type { SearchParams } from "../../features/search/schema";
import { Button } from "../atoms";

type FilterOptions = {
  categories?: SearchOption[];
  styles?: SearchOption[];
};

type FilterFormProps = FilterOptions & {
  filters?: SearchParams;
  presentation: "home" | "results";
  onSubmitted?: () => void;
};

function FilterForm({ filters, categories = [], styles = [], presentation, onSubmitted }: FilterFormProps) {
  const home = presentation === "home";
  return (
    <Form key={filters ? JSON.stringify(filters) : "home"} method="get" action="/search" onSubmit={onSubmitted} className={home ? "filters filters--home" : "filters"}>
      <h2>絞り込み検索</h2>
      <label>キーワード<input name="q" autoComplete="off" defaultValue={filters?.q ?? ""} maxLength={100} placeholder="例：キッチン…" /></label>
      <label>施工地域<input name="area" autoComplete="off" defaultValue={filters?.area ?? ""} maxLength={120} placeholder="例：飯塚市…" /></label>
      <label>リノベーション箇所
        <select name="category" autoComplete="off" defaultValue={filters?.category ?? ""}>
          <option value="">指定なし</option>
          {categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
        </select>
      </label>
      <fieldset className="budget-field"><legend>予算（円）</legend>
        <span className="range-fields"><input name="priceMin" type="number" min="0" max="2147483647" inputMode="numeric" autoComplete="off" defaultValue={filters?.priceMin ?? ""} aria-label="予算下限（円）" placeholder="例：100,000…" /><span className="range-separator" aria-hidden="true">〜</span><input name="priceMax" type="number" min="0" max="2147483647" inputMode="numeric" autoComplete="off" defaultValue={filters?.priceMax ?? ""} aria-label="予算上限（円）" placeholder="例：500,000…" /></span>
      </fieldset>
      <label>施工期間
        <select name="period" autoComplete="off" defaultValue={filters?.period ?? ""}>
          <option value="">指定なし</option>
          <option value="1">1か月以内</option>
          <option value="3">3か月以内</option>
        </select>
      </label>
      <label>こだわり条件
        <select name="style" autoComplete="off" defaultValue={filters?.style ?? ""}>
          <option value="">指定なし</option>
          {styles.map((style) => <option key={style.slug} value={style.slug}>{style.name}</option>)}
        </select>
      </label>
      <label>並び順
        <select name="sort" autoComplete="off" defaultValue={filters?.sort ?? "newest"}>
          <option value="newest">新しい順</option>
          <option value="oldest">古い順</option>
          <option value="price_asc">費用が低い順</option>
          <option value="price_desc">費用が高い順</option>
        </select>
      </label>
      <Button type="submit">検索する</Button>
      <Link className="filter-clear" to="/search" onClick={onSubmitted}>条件をクリア</Link>
    </Form>
  );
}

export function HomeFilters({ categories, styles }: FilterOptions) {
  return <section className="filter-panel filter-panel--home"><div className="filter-panel__content"><FilterForm presentation="home" categories={categories} styles={styles} /></div></section>;
}

export function SearchFilters({ filters, categories, styles }: FilterOptions & { filters: SearchParams }) {
  const [open, setOpen] = useState(false);
  const count = [filters.q, filters.area, filters.category, filters.style, filters.priceMin !== undefined, filters.priceMax !== undefined, filters.period].filter(Boolean).length;
  const close = () => setOpen(false);
  return (
    <section className={`filter-panel${open ? " is-open" : ""}`}>
      <button type="button" className="filter-toggle button button--secondary" aria-expanded={open} aria-controls="search-filters" onClick={() => setOpen((current) => !current)}>
        {open ? `検索条件${count ? `（${count}件指定）` : ""}を閉じる` : count ? `検索条件（${count}件指定）` : "検索条件を指定"}
      </button>
      <div id="search-filters" className="filter-panel__content">
        <FilterForm presentation="results" filters={filters} categories={categories} styles={styles} onSubmitted={close} />
      </div>
    </section>
  );
}
