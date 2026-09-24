import { CaseList } from "../components/organisms";
import { Pagination } from "../components/molecules";
import { DashboardLayout } from "../components/templates";
import type { Route } from "./+types/favorites";
import { requireAuthorization } from "../features/auth/authorization.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";
import { fetchFavoriteCases } from "../features/cases/public-data.client";
import type { CaseStudy } from "../features/cases/types";

export function loader() {
  return { items: [] as CaseStudy[] };
}

export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  await requireAuthorization(request, { role: "GENERAL" });
  return { ...(await serverLoader()), items: await fetchFavoriteCases() };
}

clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return <ProtectedRouteFallback />;
}

export default function FavoritesRoute({ loaderData }: { loaderData: ReturnType<typeof loader> }) {
  return (
    <DashboardLayout>
      <header className="page-heading"><h1>お気に入り</h1></header>
      <CaseList items={loaderData.items} />
      <Pagination />
    </DashboardLayout>
  );
}
