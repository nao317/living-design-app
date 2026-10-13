import type { Route } from "./+types/search";
import { Pagination } from "../components/molecules";
import { useNavigation } from "react-router";
import { CaseList, Filters } from "../components/organisms";
import { PublicLayout } from "../components/templates";
import { hasInvalidPriceRange, parseSearchParams } from "../features/search/schema";
import { fetchSearchOptions, searchPublishedCases, type SearchOption } from "../features/cases/public-data.client";
import type { CaseStudy } from "../features/cases/types";

const pageSize = 10;

export function meta() {
  return [{ title: "検索結果 | 飯塚のリノベ" }];
}

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const filters = parseSearchParams(url.searchParams);
  return { items: [] as CaseStudy[], filters, total: 0, categories: [] as SearchOption[], styles: [] as SearchOption[], invalidPriceRange: hasInvalidPriceRange(filters), loadError: false };
}

export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  const serverData = await serverLoader();
  const requestedFilters = parseSearchParams(new URL(request.url).searchParams);
  let options = { categories: serverData.categories, styles: serverData.styles };
  try {
    options = await fetchSearchOptions();
    const filters = {
      ...requestedFilters,
      category: options.categories.some((option) => option.slug === requestedFilters.category) ? requestedFilters.category : "",
      style: options.styles.some((option) => option.slug === requestedFilters.style) ? requestedFilters.style : "",
    };
    if (hasInvalidPriceRange(filters)) {
      return { ...serverData, ...options, filters, invalidPriceRange: true };
    }
    const firstPage = await searchPublishedCases(filters, pageSize);
    const page = "page" in firstPage ? firstPage.page : Math.min(filters.page, Math.max(1, Math.ceil(firstPage.total / pageSize)));
    const results = page === filters.page ? firstPage : await searchPublishedCases({ ...filters, page }, pageSize);
    return { ...serverData, ...options, ...results, filters: { ...filters, page } };
  } catch (error) {
    console.error("Failed to load case search", error);
    return { ...serverData, ...options, filters: requestedFilters, loadError: true };
  }
}

clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return <PublicLayout><div className="public-page search-page"><div className="search-layout">
    <section className="search-results" aria-labelledby="result-heading">
      <div className="search-results__header"><h1 id="result-heading">検索結果</h1><p role="status">施工事例を読み込んでいます…</p></div>
    </section>
  </div></div></PublicLayout>;
}

export default function SearchRoute({ loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();
  return (
    <PublicLayout>
      <div className="public-page search-page">
        <div className="search-layout">
          <Filters filters={loaderData.filters} categories={loaderData.categories} styles={loaderData.styles} />
          <section className="search-results" aria-labelledby="result-heading">
            <div className="search-results__header">
              <h1 id="result-heading">検索結果</h1>
              {loaderData.invalidPriceRange || loaderData.loadError ? null : <p>{loaderData.total}件の施工事例が見つかりました</p>}
              {navigation.state !== "idle" ? <p role="status">検索中…</p> : null}
            </div>
            {loaderData.loadError ? (
              <p className="form-error" role="alert">検索結果を取得できませんでした。時間をおいて再度お試しください。</p>
            ) : loaderData.invalidPriceRange ? (
              <p className="form-error" role="alert">予算の下限は上限以下にしてください。</p>
            ) : loaderData.items.length ? (
              <>
                <CaseList items={loaderData.items} />
                <Pagination totalItems={loaderData.total} currentPage={loaderData.filters.page} pageSize={pageSize} />
              </>
            ) : (
              <div className="empty-state">
                {loaderData.filters.q || loaderData.filters.area || loaderData.filters.category || loaderData.filters.style || loaderData.filters.priceMin !== undefined || loaderData.filters.priceMax !== undefined || loaderData.filters.period ? (
                  <><h2>該当する施工事例がありません</h2><p>条件を変更して検索してください。</p></>
                ) : (
                  <><h2>公開中の施工事例がありません</h2><p>施工事例が公開されるまでお待ちください。</p></>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
