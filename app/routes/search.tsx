import type { Route } from "./+types/search";
import { SearchBar, Pagination } from "../components/molecules";
import { CaseList, Filters } from "../components/organisms";
import { PublicLayout } from "../components/templates";
import { searchParamsSchema } from "../features/search/schema";
import { fetchPublishedCases } from "../features/cases/public-data.client";
import type { CaseStudy } from "../features/cases/types";

const pageSize = 10;

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
  const normalizedQuery = filters.q.toLocaleLowerCase("ja-JP");
  const filtered = items.filter((item) => {
    const searchableText = [item.title, item.company, item.companyAddress, item.area, ...item.categories, ...(item.styles ?? [])]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("ja-JP");
    const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery);
    const matchesCategory = !filters.category || item.categorySlugs?.includes(filters.category);
    const matchesStyle = !filters.style || item.styleSlugs?.includes(filters.style);
    const hasPrice = item.priceMin !== null && item.priceMin !== undefined || item.priceMax !== null && item.priceMax !== undefined;
    const matchesMinPrice = filters.priceMin === undefined || (hasPrice && (item.priceMax === null || item.priceMax === undefined || item.priceMax >= filters.priceMin));
    const matchesMaxPrice = filters.priceMax === undefined || (hasPrice && (item.priceMin === null || item.priceMin === undefined || item.priceMin <= filters.priceMax));
    const matchesPeriod = !filters.period || (item.periodMonths !== null && item.periodMonths !== undefined && item.periodMonths <= Number(filters.period));
    return matchesQuery && matchesCategory && matchesStyle && matchesMinPrice && matchesMaxPrice && matchesPeriod;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(filters.page, totalPages);
  return { ...serverData, items: filtered.slice((page - 1) * pageSize, page * pageSize), filters: { ...filters, page }, total: filtered.length };
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
                <Pagination totalItems={loaderData.total} currentPage={loaderData.filters.page} pageSize={pageSize} />
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
