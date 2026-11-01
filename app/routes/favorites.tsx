import { CaseList } from "../components/organisms";
import { Pagination } from "../components/molecules";
import { DashboardLayout } from "../components/templates";
import type { Route } from "./+types/favorites";
import { requireAuthorization } from "../features/auth/authorization.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";
import { fetchFavoriteCases } from "../features/cases/public-data.client";
import type { CaseStudy } from "../features/cases/types";
import { Link } from "react-router";

const pageSize = 10;

export function loader() {
  return { items: [] as CaseStudy[], total: 0, page: 1 };
}

export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  await requireAuthorization(request, { role: "GENERAL" });
  const allItems = await fetchFavoriteCases();
  const requestedPage = Number(new URL(request.url).searchParams.get("page") ?? "1");
  const totalPages = Math.max(1, Math.ceil(allItems.length / pageSize));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, totalPages) : 1;
  return {
    ...(await serverLoader()),
    items: allItems.slice((page - 1) * pageSize, page * pageSize),
    total: allItems.length,
    page,
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
