import { Link } from "react-router";
import { SearchBar } from "../components/molecules";
import { CaseGrid } from "../components/organisms";
import { DashboardLayout } from "../components/templates";
import { cases } from "../data/mock";

export function loader() {
  return { newCases: cases, favoriteCases: cases.slice(0, 3) };
}

export default function MyPageRoute({ loaderData }: { loaderData: ReturnType<typeof loader> }) {
  return (
    <DashboardLayout>
      <section className="dashboard-search">
        <h1>飯塚でリノベーションを探す</h1>
        <SearchBar />
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
