import type { Route } from "./+types/search";
import { SearchBar, Pagination } from "../components/molecules";
import { CaseList, Filters } from "../components/organisms";
import { PublicLayout } from "../components/templates";
import { cases } from "../data/mock";
import { searchParamsSchema } from "../features/search/schema";

export function meta() {
  return [{ title: "検索結果 | 飯塚のリノベ" }];
}

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const filters = searchParamsSchema.parse(Object.fromEntries(url.searchParams));
  const filtered = filters.q
    ? cases.filter((item) => [item.title, item.company, item.area, ...item.categories].join(" ").includes(filters.q))
    : cases;
  return { items: filtered, filters, total: filtered.length };
}

export default function SearchRoute({ loaderData }: Route.ComponentProps) {
  return (
    <PublicLayout>
      <div className="public-page search-page">
        <SearchBar defaultValue={loaderData.filters.q} />
        <div className="search-layout">
          <Filters />
          <section className="search-results" aria-labelledby="result-heading">
            <div className="search-results__header">
              <h1 id="result-heading">検索結果</h1>
              <p>{loaderData.total}件の施工事例が見つかりました</p>
            </div>
            {loaderData.items.length ? (
              <>
                <CaseList items={loaderData.items} />
                <Pagination />
              </>
            ) : (
              <div className="empty-state">
                <h2>該当する施工事例がありません</h2>
                <p>条件を変更して検索してください。</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
