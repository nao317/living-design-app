import type { Route } from "./+types/case-detail";
import { ArrowLeft, Building2 } from "lucide-react";
import { Link, useLocation } from "react-router";
import { Tag } from "../components/atoms";
import { FavoriteButton } from "../components/molecules";
import { PublicLayout } from "../components/templates";
import { fetchCaseById } from "../features/cases/public-data.client";
import type { CaseStudy } from "../features/cases/types";
import { StorageImage } from "../features/media/storage-image";
import { CaseGallery } from "../features/media/case-gallery";

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

export default function CaseDetailRoute({ loaderData }: Route.ComponentProps) {
  const location = useLocation();
  const requestedReturnTo: unknown = location.state?.searchReturnTo;
  const returnTo = typeof requestedReturnTo === "string" && (requestedReturnTo === "/search" || requestedReturnTo.startsWith("/search?")) ? requestedReturnTo : "/search";
  if (!loaderData.item) return <PublicLayout><div className="public-page empty-state"><h1>施工事例が見つかりません</h1></div></PublicLayout>;
  const { item } = loaderData;
  const gallery = item.images ?? [];
  return (
    <PublicLayout>
      <article className="public-page case-detail-page">
        <Link to={returnTo} className="back-link"><ArrowLeft size={16} aria-hidden="true" />検索結果へ戻る</Link>
        {item.status && item.status !== "PUBLISHED" ? <p className="case-visibility-notice" role="status">この事例は{item.status === "DRAFT" ? "下書き" : "非公開"}です。検索結果には表示されません。<Link to={`/company/cases/${item.id}/edit`}>編集画面で公開する</Link></p> : null}
        <CaseGallery images={gallery} paths={item.imagesPaths} title={item.title} />
        <div className="case-detail-layout">
          <section className="case-detail-main">
            <div className="case-detail-title">
              <div>{item.categories.map((category) => <Tag key={category}>{category}</Tag>)}<h1>{item.title}</h1></div>
              <FavoriteButton caseId={item.id} />
            </div>
            <p>{item.summary}</p>
            <dl className="case-specs">
              <div><dt>費用目安</dt><dd>{item.price}</dd></div>
              <div><dt>施工期間</dt><dd>{item.period || "要相談"}</dd></div>
              <div><dt>施工エリア</dt><dd>{item.area}</dd></div>
            </dl>
          </section>
          <aside className="case-company">
            <h2><Building2 size={18} />{item.company}</h2>
            {item.companyImage ? <StorageImage src={item.companyImage} storagePath={item.companyImagePath} bucket="company-assets" alt={item.company} /> : <div className="image-empty">企業画像未登録</div>}
            <Link className="button button--secondary" to={"/companies/" + item.companyId}>企業情報を見る</Link>
            <Link className="button button--primary" to={`/contact?companyId=${item.companyId}&caseId=${item.id}`}>企業に問い合わせる</Link>
          </aside>
        </div>
      </article>
    </PublicLayout>
  );
}
