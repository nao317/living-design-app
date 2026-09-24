import type { Route } from "./+types/companies";
import { Link } from "react-router";
import { CompanySearchBar, Pagination } from "../components/molecules";
import { PublicLayout } from "../components/templates";
import { fetchPublishedCompanies } from "../features/cases/public-data.client";
import type { CompanySummary } from "../features/cases/types";

const pageSize = 12;

export function loader({ request }: Route.LoaderArgs) {
  return { items: [] as CompanySummary[], total: 0, page: 1, query: new URL(request.url).searchParams.get("q")?.trim() ?? "" };
}

export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  const companies = await fetchPublishedCompanies();
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim() ?? "";
  const filtered = query
    ? companies.filter((company) => [company.name, company.address, company.description].join(" ").includes(query))
    : companies;
  const requestedPage = Number(params.get("page") ?? "1");
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, totalPages) : 1;
  return {
    ...(await serverLoader()),
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
    page,
    query,
  };
}

clientLoader.hydrate = true as const;

export default function CompaniesRoute({ loaderData }: Route.ComponentProps) {
  return (
    <PublicLayout>
      <div className="public-page companies-page">
        <header className="page-heading"><h1>企業を探す</h1><p>{loaderData.total}件の登録企業</p></header>
        <CompanySearchBar defaultValue={loaderData.query} />
        {loaderData.items.length ? (
          <>
            <div className="company-directory">
              {loaderData.items.map((company) => (
                <article className="company-directory__item" key={company.id}>
                  {company.image ? <img src={company.image} alt="" /> : <div className="image-empty">企業画像未登録</div>}
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
