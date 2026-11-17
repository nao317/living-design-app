import ui from "../ui.module.css";
import type { Route } from "./+types/companies";
import { Link } from "react-router";
import { CompanySearchBar, Pagination } from "../components/molecules";
import { PublicLayout } from "../components/templates/public-layout";
import { PublicRouteFallback } from "../components/templates/public-route-fallback";
import { fetchPublishedCompanies } from "../features/cases/public-data.client";
import type { CompanySummary } from "../features/cases/types";
import { StorageImage } from "../features/media/storage-image";
import { parsePage } from "../features/pagination/pagination";

const pageSize = 12;

export function meta() { return [{ title: "企業を探す | 飯塚のリノベ" }]; }

export function loader({ request }: Route.LoaderArgs) {
  return { items: [] as CompanySummary[], total: 0, page: 1, query: new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "" };
}

export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim().slice(0, 100) ?? "";
  const [companies, serverData] = await Promise.all([
    fetchPublishedCompanies(query, parsePage(params), pageSize),
    serverLoader(),
  ]);
  return {
    ...serverData,
    ...companies,
    query,
  };
}

clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return <PublicRouteFallback label="企業情報を読み込んでいます…" />;
}

export default function CompaniesRoute({ loaderData }: Route.ComponentProps) {
  return (
    <PublicLayout>
      <div className={ui["public-page"] + " " + ui["companies-page"]}>
        <header className={ui["page-heading"]}><h1>企業を探す</h1><p>{loaderData.total}件の登録企業</p></header>
        <CompanySearchBar defaultValue={loaderData.query} />
        {loaderData.items.length ? (
          <>
            <div className={ui["company-directory"]}>
              {loaderData.items.map((company) => (
                <article className={`${ui["company-directory__item"]} ${!company.imagePath ? ui["company-directory__item--text"] : ""}`} key={company.id}>
                  {company.imagePath ? <StorageImage width={150} height={150} src={company.image} storagePath={company.imagePath} bucket="company-assets" preset="card" alt="" /> : null}
                  <div>
                    <h2>{company.name}</h2>
                    {company.description ? <p>{company.description}</p> : null}
                    <p className={ui["company-directory__address"]}>{company.address || "所在地の掲載なし"}</p>
                    <Link className={ui["button"] + " " + ui["button--secondary"]} to={`/companies/${company.id}`}>企業情報を見る</Link>
                  </div>
                </article>
              ))}
            </div>
            <Pagination totalItems={loaderData.total} currentPage={loaderData.page} pageSize={pageSize} showSinglePage />
          </>
        ) : (
          <div className={ui["empty-state"]}>{loaderData.query ? <><h2>条件に合う企業がありません</h2><p>別のキーワードで検索するか、<Link to="/companies">条件をクリア</Link>してください。</p></> : <><h2>登録されている企業がありません</h2><p>公開企業が登録されると、ここに表示されます。</p></>}</div>
        )}
      </div>
    </PublicLayout>
  );
}
