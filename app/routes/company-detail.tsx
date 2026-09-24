import type { Route } from "./+types/company-detail";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router";
import { Tag } from "../components/atoms";
import { PublicLayout } from "../components/templates";
import { fetchCompanyById } from "../features/cases/public-data.client";
import type { CompanyProfile } from "../features/cases/types";

export function loader() {
  return { company: null as CompanyProfile | null, cases: [] };
}

export async function clientLoader({ params, serverLoader }: Route.ClientLoaderArgs) {
  const result = params.companyId ? await fetchCompanyById(params.companyId) : null;
  if (!result) throw new Response("企業が見つかりません", { status: 404 });
  return { ...(await serverLoader()), ...result };
}

clientLoader.hydrate = true as const;

export default function CompanyDetailRoute({ loaderData }: Route.ComponentProps) {
  if (!loaderData.company) return <PublicLayout><div className="public-page empty-state"><h1>企業が見つかりません</h1></div></PublicLayout>;

  return (
    <PublicLayout>
      <article className="public-page company-detail-page">
        <section className="company-detail-hero">
          <div>
            <h1>{loaderData.company.name}</h1>
            <p>{loaderData.company.description}</p>
            <div>{loaderData.company.features.map((feature) => <Tag key={feature}>{feature}</Tag>)}</div>
          </div>
          {loaderData.company.image ? <img src={loaderData.company.image} alt={loaderData.company.name} /> : <div className="image-empty">企業画像未登録</div>}
        </section>
        <div className="company-detail-body">
          <section className="company-works">
            <h2>施工事例</h2>
            {loaderData.cases.map((item) => <Link key={item.id} to={"/cases/" + item.id}><img src={item.image} alt={item.title} /><span>{item.title}</span></Link>)}
          </section>
          <section className="company-information">
            <h2>会社情報</h2>
            <dl>
              <div><dt>会社名</dt><dd>{loaderData.company.name}</dd></div>
              <div><dt>所在地</dt><dd>{loaderData.company.address}</dd></div>
              <div><dt>営業時間</dt><dd>{loaderData.company.businessHours}</dd></div>
              <div><dt>電話番号</dt><dd>{loaderData.company.phone}</dd></div>
              <div><dt>設立</dt><dd>{loaderData.company.founded}</dd></div>
            </dl>
            <a className="button button--secondary" href={loaderData.company.website}>ホームページ <ExternalLink size={14} /></a>
            <Link className="button button--primary" to={"/contact?companyId=" + loaderData.company.id}>問い合わせる</Link>
          </section>
        </div>
      </article>
    </PublicLayout>
  );
}
