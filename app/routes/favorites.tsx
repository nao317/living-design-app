import { CaseList } from "../components/organisms";
import { Pagination } from "../components/molecules";
import { DashboardLayout } from "../components/templates/dashboard-layout";
import type { Route } from "./+types/favorites";
import { requireAuthorization } from "../features/auth/authorization.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";
import { fetchFavoriteCasesPage } from "../features/cases/public-data.client";
import type { CaseStudy } from "../features/cases/types";
import { Link } from "react-router";
import { parsePage } from "../features/pagination/pagination";

const pageSize = 10;

export function loader() {
  return { items: [] as CaseStudy[], total: 0, page: 1 };
}

export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  await requireAuthorization(request, { role: "GENERAL" });
  const params = new URL(request.url).searchParams;
  const favorites = await fetchFavoriteCasesPage(parsePage(params), pageSize);
  return {
    ...(await serverLoader()),
    ...favorites,
  };
}

clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return <ProtectedRouteFallback />;
}

export default function FavoritesRoute({ loaderData }: { loaderData: ReturnType<typeof loader> }) {
  return (
    <DashboardLayout>
      <header className="page-heading"><h1>お気に入り</h1></header>
      {loaderData.items.length ? <CaseList items={loaderData.items} /> : <div className="empty-state"><h2>お気に入りはまだありません</h2><p>気になる施工事例を保存して、あとから比較できます。</p><Link to="/search" className="button button--primary">施工事例を探す</Link></div>}
      <Pagination totalItems={loaderData.total} currentPage={loaderData.page} pageSize={pageSize} />
    </DashboardLayout>
  );
}

export function meta() { return [{ title: "お気に入り | 飯塚のリノベ" }]; }
