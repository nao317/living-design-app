import type { Route } from "./+types/company-detail";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router";
import { Pagination } from "../components/molecules";
import { Tag } from "../components/atoms";
import { PublicLayout } from "../components/templates/public-layout";
import { fetchCompanyById } from "../features/cases/public-data.client";
import type { CompanyProfile } from "../features/cases/types";
import { StorageImage } from "../features/media/storage-image";
import { PublicRouteFallback } from "../components/templates/public-route-fallback";
import { parsePage } from "../features/pagination/pagination";

const pageSize = 6;

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `${loaderData?.company?.name ?? "企業情報"} | 飯塚のリノベ` }];
}

export function loader() {
  return { company: null as CompanyProfile | null, cases: [], casesTotal: 0, casesPage: 1 };
}

export async function clientLoader({ request, params, serverLoader }: Route.ClientLoaderArgs) {
  const page = parsePage(new URL(request.url).searchParams);
  const result = params.companyId ? await fetchCompanyById(params.companyId, page, pageSize) : null;
  if (!result) throw new Response("企業が見つかりません", { status: 404 });
  return { ...(await serverLoader()), ...result };
}

clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return <PublicRouteFallback label="企業情報を読み込んでいます…" />;
}

export default function CompanyDetailRoute({ loaderData }: Route.ComponentProps) {
  if (!loaderData.company) return <PublicLayout><div className="public-page empty-state"><h1>企業が見つかりません</h1></div></PublicLayout>;

  return (
    <PublicLayout>
      <article className="public-page company-detail-page">
        <section className="company-detail-hero">
          <div>
            <h1>{loaderData.company.name}</h1>
            <p>{loaderData.company.description || "企業紹介は準備中です。"}</p>
            {loaderData.company.features.length ? <div>{loaderData.company.features.map((feature) => <Tag key={feature}>{feature}</Tag>)}</div> : null}
          </div>
          {loaderData.company.image ? <StorageImage width={580} height={220} src={loaderData.company.image} storagePath={loaderData.company.imagePath} bucket="company-assets" alt={loaderData.company.name} loading="eager" fetchPriority="high" /> : <div className="image-empty">企業画像未登録</div>}
        </section>
        <div className="company-detail-body">
          <section className="company-works">
            <h2>施工事例</h2>
            {loaderData.cases.length ? <>{loaderData.cases.map((item) => <Link key={item.id} to={"/cases/" + item.id}><StorageImage width={85} height={60} src={item.image} storagePath={item.imagePath} bucket="case-images" alt={item.title} /><span>{item.title}</span></Link>)}<Pagination totalItems={loaderData.casesTotal} currentPage={loaderData.casesPage} pageSize={pageSize} /></> : <p>公開中の施工事例はまだありません。</p>}
          </section>
          <section className="company-information">
            <h2>会社情報</h2>
            <dl>
              <div><dt>会社名</dt><dd>{loaderData.company.name}</dd></div>
              <div><dt>所在地</dt><dd>{loaderData.company.address || "未登録"}</dd></div>
              <div><dt>営業時間</dt><dd>{loaderData.company.businessHours || "未登録"}</dd></div>
              <div><dt>電話番号</dt><dd>{loaderData.company.phone ? <a href={`tel:${loaderData.company.phone.replace(/[^0-9+]/g, "")}`}>{loaderData.company.phone}</a> : "未登録"}</dd></div>
              <div><dt>設立</dt><dd>{loaderData.company.founded || "未登録"}</dd></div>
            </dl>
            {loaderData.company.website ? <a className="button button--secondary" href={loaderData.company.website}>ホームページ <ExternalLink aria-hidden="true" size={14} /></a> : null}
            <Link className="button button--primary" to={"/contact?companyId=" + loaderData.company.id}>問い合わせる</Link>
          </section>
        </div>
      </article>
    </PublicLayout>
  );
}
