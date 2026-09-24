import type { Route } from "./+types/companies";
import { Link } from "react-router";
import { Pagination } from "../components/molecules";
import { PublicLayout } from "../components/templates";
import { fetchPublishedCompanies } from "../features/cases/public-data.client";
import type { CompanySummary } from "../features/cases/types";

const pageSize = 12;

export function loader() {
  return { items: [] as CompanySummary[], total: 0, page: 1 };
}

export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  const companies = await fetchPublishedCompanies();
  const requestedPage = Number(new URL(request.url).searchParams.get("page") ?? "1");
  const totalPages = Math.max(1, Math.ceil(companies.length / pageSize));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, totalPages) : 1;
  return {
    ...(await serverLoader()),
    items: companies.slice((page - 1) * pageSize, page * pageSize),
    total: companies.length,
    page,
  };
}

clientLoader.hydrate = true as const;

export default function CompaniesRoute({ loaderData }: Route.ComponentProps) {
  return (
    <PublicLayout>
      <div className="public-page companies-page">
        <header className="page-heading"><h1>企業を探す</h1><p>{loaderData.total}件の登録企業</p></header>
        {loaderData.items.length ? (
          <>
            <div className="company-directory">
              {loaderData.items.map((company) => (
                <article className="company-directory__item" key={company.id}>
                  <img src={company.image} alt="" />
                  <div>
                    <h2>{company.name}</h2>
                    <p>{company.description}</p>
                    <p className="company-directory__address">{company.address}</p>
                    <Link className="button button--secondary" to={`/companies/${company.id}`}>企業情報を見る</Link>
                  </div>
                </article>
              ))}
            </div>
            <Pagination totalItems={loaderData.total} currentPage={loaderData.page} pageSize={pageSize} />
          </>
        ) : (
          <div className="empty-state"><h2>登録されている企業がありません</h2><p>公開企業が登録されると、ここに表示されます。</p></div>
        )}
      </div>
    </PublicLayout>
  );
}
