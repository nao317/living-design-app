import type { Route } from "./+types/case-detail";
import { ArrowLeft, Building2 } from "lucide-react";
import { Link } from "react-router";
import { Tag } from "../components/atoms";
import { FavoriteButton } from "../components/molecules";
import { PublicLayout } from "../components/templates";
import { fetchCaseById } from "../features/cases/public-data.client";
import type { CaseStudy } from "../features/cases/types";

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
  if (!loaderData.item) return <PublicLayout><div className="public-page empty-state"><h1>施工事例が見つかりません</h1></div></PublicLayout>;
  const { item } = loaderData;
  const gallery = item.images ?? [];
  const beforeImage = gallery[1];
  const afterImage = gallery[0];
  return (
    <PublicLayout>
      <article className="public-page case-detail-page">
        <Link to="/search" className="back-link"><ArrowLeft size={16} />検索結果へ戻る</Link>
        <div className="before-after">
          <figure><figcaption>BEFORE</figcaption>{beforeImage ? <img src={beforeImage} alt="施工前" /> : <div className="image-empty">画像未登録</div>}</figure>
          <figure><figcaption>AFTER</figcaption>{afterImage ? <img src={afterImage} alt="施工後" /> : <div className="image-empty">画像未登録</div>}</figure>
        </div>
        <div className="case-detail-layout">
          <aside className="detail-thumbnails">
            {gallery.slice(2).map((image, index) => <img key={image} src={image} alt={`施工写真${index + 3}`} />)}
          </aside>
          <main className="case-detail-main">
            <div className="case-detail-title">
              <div>{item.categories.map((category) => <Tag key={category}>{category}</Tag>)}<h1>{item.title}</h1></div>
              <FavoriteButton />
            </div>
            <p>{item.summary}</p>
            <dl className="case-specs">
              <div><dt>費用目安</dt><dd>{item.price}</dd></div>
              <div><dt>施工期間</dt><dd>{item.period}</dd></div>
              <div><dt>施工エリア</dt><dd>{item.area}</dd></div>
            </dl>
          </main>
          <aside className="case-company">
            <h2><Building2 size={18} />{item.company}</h2>
            {item.companyImage ? <img src={item.companyImage} alt={item.company} /> : <div className="image-empty">企業画像未登録</div>}
            <Link className="button button--secondary" to={"/companies/" + item.companyId}>企業情報を見る</Link>
            <Link className="button button--primary" to={`/contact?companyId=${item.companyId}&caseId=${item.id}`}>企業に問い合わせる</Link>
          </aside>
        </div>
      </article>
    </PublicLayout>
  );
}
