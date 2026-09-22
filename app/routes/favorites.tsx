import { CaseList } from "../components/organisms";
import { Pagination } from "../components/molecules";
import { DashboardLayout } from "../components/templates";
import { cases } from "../data/mock";

export function loader() {
  return { items: cases };
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
