import type { Route } from "./+types/search";
import { SearchBar, Pagination } from "../components/molecules";
import { CaseList, Filters } from "../components/organisms";
import { PublicLayout } from "../components/templates";
import { searchParamsSchema } from "../features/search/schema";
import { fetchPublishedCases } from "../features/cases/public-data.client";
import type { CaseStudy } from "../features/cases/types";

export function meta() {
  return [{ title: "検索結果 | 飯塚のリノベ" }];
}

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const filters = searchParamsSchema.parse(Object.fromEntries(url.searchParams));
  return { items: [] as CaseStudy[], filters, total: 0 };
}

export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  const serverData = await serverLoader();
  const items = await fetchPublishedCases();
  const filters = searchParamsSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const filtered = filters.q
    ? items.filter((item) => [item.title, item.company, item.area, ...item.categories].join(" ").includes(filters.q))
    : items;
  return { ...serverData, items: filtered, filters, total: filtered.length };
}

clientLoader.hydrate = true as const;

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
