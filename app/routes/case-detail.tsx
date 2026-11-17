import ui from "../ui.module.css";
import type { Route } from "./+types/case-detail";
import { ArrowLeft, Banknote, Building2, Clock3, MapPin, MessageSquare } from "lucide-react";
import { Link, useLocation } from "react-router";
import { Tag } from "../components/atoms";
import { FavoriteButton } from "../components/molecules";
import { PublicLayout } from "../components/templates/public-layout";
import { fetchCaseById } from "../features/cases/public-data.client";
import type { CaseStudy } from "../features/cases/types";
import { StorageImage } from "../features/media/storage-image";
import { CaseGallery } from "../features/media/case-gallery";
import { PublicRouteFallback } from "../components/templates/public-route-fallback";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `${loaderData?.item?.title ?? "施工事例"} | 飯塚のリノベ` }];
}

export function loader() {
  return { item: null as CaseStudy | null };
}

export async function clientLoader({ params, serverLoader }: Route.ClientLoaderArgs) {
  const item = params.caseId ? await fetchCaseById(params.caseId) : null;
  if (!item) throw new Response("施工事例が見つかりません", { status: 404 });
  return { ...(await serverLoader()), item };
}

clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return <PublicRouteFallback label="施工事例を読み込んでいます…" />;
}

export default function CaseDetailRoute({ loaderData }: Route.ComponentProps) {
  const location = useLocation();
  const requestedReturnTo: unknown = new URLSearchParams(location.search).get("returnTo") ?? location.state?.searchReturnTo;
  const returnTo = typeof requestedReturnTo === "string" && (requestedReturnTo === "/search" || requestedReturnTo.startsWith("/search?")) ? requestedReturnTo : "/search";
  if (!loaderData.item) return <PublicLayout><div className={ui["public-page"] + " " + ui["empty-state"]}><h1>施工事例が見つかりません</h1></div></PublicLayout>;
  const { item } = loaderData;
  const gallery = item.images ?? [];
  return (
    <PublicLayout>
      <article className={ui["public-page"] + " " + ui["case-detail-page"]}>
        <Link to={returnTo} className={ui["back-link"]}><ArrowLeft size={16} aria-hidden="true" />検索結果へ戻る</Link>
        {item.status && item.status !== "PUBLISHED" ? <p className={ui["case-visibility-notice"]} role="status">この事例は{item.status === "DRAFT" ? "下書き" : "非公開"}です。検索結果には表示されません。<Link to={`/company/cases/${item.id}/edit`}>編集画面で公開する</Link></p> : null}
        <div className={ui["case-detail-title"]}>
          <div>{item.categories.map((category) => <Tag key={category}>{category}</Tag>)}<h1>{item.title}</h1></div>
          <FavoriteButton caseId={item.id} />
        </div>
        <CaseGallery images={gallery} paths={item.imagesPaths} title={item.title} details={item.photoDetails} />
        <div className={ui["case-detail-layout"]}>
          <section className={ui["case-detail-main"]}>
            {item.summary ? <section className={ui["case-description"]}><h2>工事の内容</h2><p>{item.summary}</p></section> : null}
            <dl className={ui["case-specs"]}>
              <div><dt><Banknote size={17} aria-hidden="true" />費用<span className={ui["sr-only"]}>目安</span></dt><dd>{item.price}</dd></div>
              <div><dt><Clock3 size={17} aria-hidden="true" />期間</dt><dd>{item.period || "要相談"}</dd></div>
              <div><dt><MapPin size={17} aria-hidden="true" />地域</dt><dd>{item.area || "要相談"}</dd></div>
            </dl>
            <p className={ui["form-hint"]}>工事の範囲や住まいの状態によって費用は変わります。含まれる工事と見積もりは施工会社にご確認ください。</p>
          </section>
          <aside className={ui["case-company"]}>
            <h2><Building2 aria-hidden="true" size={18} />{item.company}</h2>
            {item.companyImage ? <StorageImage width={240} height={130} src={item.companyImage} storagePath={item.companyImagePath} bucket="company-assets" alt={item.company} /> : null}
            <Link className={ui["button"] + " " + ui["button--secondary"]} to={"/companies/" + item.companyId}>企業情報を見る</Link>
            <Link className={ui["button"] + " " + ui["button--primary"]} to={`/contact?companyId=${item.companyId}&caseId=${item.id}`} aria-label="この事例について相談する"><MessageSquare size={17} aria-hidden="true" />相談する</Link>
          </aside>
        </div>
      </article>
    </PublicLayout>
  );
}
