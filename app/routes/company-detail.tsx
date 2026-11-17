import ui from "../ui.module.css";
import type { Route } from "./+types/company-detail";
import { CalendarDays, Clock3, ExternalLink, MapPin, MessageSquare, Phone } from "lucide-react";
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
  if (!loaderData.company) return <PublicLayout><div className={ui["public-page"] + " " + ui["empty-state"]}><h1>企業が見つかりません</h1></div></PublicLayout>;

  return (
    <PublicLayout>
      <article className={ui["public-page"] + " " + ui["company-detail-page"]}>
        <section className={`${ui["company-detail-hero"]} ${!loaderData.company.image ? ui["company-detail-hero--text"] : ""}`}>
          <div>
            <h1>{loaderData.company.name}</h1>
            {loaderData.company.description ? <p>{loaderData.company.description}</p> : null}
            {loaderData.company.features.length ? <div>{loaderData.company.features.map((feature) => <Tag key={feature}>{feature}</Tag>)}</div> : null}
          </div>
          {loaderData.company.image ? <StorageImage width={580} height={220} src={loaderData.company.image} storagePath={loaderData.company.imagePath} bucket="company-assets" alt={loaderData.company.name} loading="eager" fetchPriority="high" /> : null}
        </section>
        <div className={ui["company-detail-body"]}>
          <section className={ui["company-works"]}>
            <h2>この会社の施工事例</h2>
            {loaderData.cases.length ? <>{loaderData.cases.map((item) => <Link key={item.id} to={"/cases/" + item.id}><StorageImage width={85} height={60} src={item.image} storagePath={item.imagePath} bucket="case-images" alt={item.title} /><span>{item.title}<small className={ui["company-work-price"]}>{item.price}</small></span></Link>)}<Pagination totalItems={loaderData.casesTotal} currentPage={loaderData.casesPage} pageSize={pageSize} showSinglePage /></> : <p>公開中の施工事例はまだありません。</p>}
          </section>
          <section className={ui["company-information"]}>
            <h2>会社情報</h2>
            <dl>
              <div><dt title="所在地"><MapPin size={18} aria-hidden="true" /><span className={ui["sr-only"]}>所在地</span></dt><dd>{loaderData.company.address || "掲載なし"}</dd></div>
              <div><dt title="営業時間"><Clock3 size={18} aria-hidden="true" /><span className={ui["sr-only"]}>営業時間</span></dt><dd>{loaderData.company.businessHours || "掲載なし"}</dd></div>
              <div><dt title="電話番号"><Phone size={18} aria-hidden="true" /><span className={ui["sr-only"]}>電話番号</span></dt><dd>{loaderData.company.phone ? <a href={`tel:${loaderData.company.phone.replace(/[^0-9+]/g, "")}`}>{loaderData.company.phone}</a> : "掲載なし"}</dd></div>
              <div><dt><CalendarDays size={18} aria-hidden="true" /><span>設立</span></dt><dd>{loaderData.company.founded || "掲載なし"}</dd></div>
            </dl>
            <div className={ui["company-information-actions"]}>
              {loaderData.company.website ? <a className={ui["button"] + " " + ui["button--secondary"]} href={loaderData.company.website}>ホームページ <ExternalLink aria-hidden="true" size={14} /></a> : null}
              <Link className={ui["button"] + " " + ui["button--primary"]} to={"/contact?companyId=" + loaderData.company.id}><MessageSquare size={17} aria-hidden="true" />問い合わせ</Link>
            </div>
          </section>
        </div>
      </article>
    </PublicLayout>
  );
}
