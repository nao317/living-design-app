import { Link } from "react-router";
import { SearchBar } from "../components/molecules";
import { CaseGrid } from "../components/organisms";
import { DashboardLayout } from "../components/templates";
import { cases } from "../data/mock";
import type { Route } from "./+types/mypage";
import { requireAuthorization } from "../features/auth/authorization.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";

export function loader() {
  return { newCases: cases, favoriteCases: cases.slice(0, 3) };
}

export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  await requireAuthorization(request, { role: "GENERAL" });
  return serverLoader();
}

clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return <ProtectedRouteFallback />;
}

export default function MyPageRoute({ loaderData }: { loaderData: ReturnType<typeof loader> }) {
  return (
    <DashboardLayout>
      <section className="dashboard-search">
        <h1>飯塚でリノベーションを探す</h1>
        <SearchBar />
        <Link className="button button--secondary" to="/company/apply">企業アカウントを申請</Link>
      </section>
      <section className="dashboard-section">
        <div className="section-header"><h2>新着の施工事例</h2><Link to="/search">一覧を見る</Link></div>
        <CaseGrid items={loaderData.newCases} />
      </section>
      <section className="dashboard-section">
        <div className="section-header"><h2>お気に入りの施工事例</h2><Link to="/mypage/favorites">一覧を見る</Link></div>
        <CaseGrid items={loaderData.favoriteCases} />
      </section>
    </DashboardLayout>
  );
}
