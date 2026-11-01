import { Link } from "react-router";
import { SearchBar } from "../components/molecules";
import { CaseGrid } from "../components/organisms";
import { DashboardLayout } from "../components/templates";
import type { Route } from "./+types/mypage";
import { requireAuthorization } from "../features/auth/authorization.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";
import { fetchFavoriteCases, fetchPublishedCases } from "../features/cases/public-data.client";
import type { CaseStudy } from "../features/cases/types";

export function loader() {
  return { newCases: [] as CaseStudy[], favoriteCases: [] as CaseStudy[] };
}

export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  await requireAuthorization(request, { role: "GENERAL" });
  const [newCases, favoriteCases] = await Promise.all([fetchPublishedCases(), fetchFavoriteCases()]);
  return { ...(await serverLoader()), newCases, favoriteCases };
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
        {loaderData.newCases.length ? <CaseGrid items={loaderData.newCases} /> : <div className="empty-state"><p>公開中の施工事例はまだありません。</p><Link to="/companies">企業を探す</Link></div>}
      </section>
      <section className="dashboard-section">
        <div className="section-header"><h2>お気に入りの施工事例</h2><Link to="/mypage/favorites">一覧を見る</Link></div>
        {loaderData.favoriteCases.length ? <CaseGrid items={loaderData.favoriteCases} /> : <div className="empty-state"><p>お気に入りはまだありません。気になる施工事例を保存できます。</p><Link to="/search">施工事例を探す</Link></div>}
      </section>
    </DashboardLayout>
  );
}

export function meta() { return [{ title: "マイページ | 飯塚のリノベ" }]; }
