import type { Route } from "./+types/case-detail";
import { ArrowLeft, Building2 } from "lucide-react";
import { Link } from "react-router";
import { Tag } from "../components/atoms";
import { FavoriteButton } from "../components/molecules";
import { PublicLayout } from "../components/templates";
import { cases, images } from "../data/mock";

export function loader({ params }: Route.LoaderArgs) {
  const item = cases.find((entry) => entry.id === params.caseId);
  if (!item) throw new Response("施工事例が見つかりません", { status: 404 });
  return { item };
}

export default function CaseDetailRoute({ loaderData }: Route.ComponentProps) {
  const { item } = loaderData;
  return (
    <PublicLayout>
      <article className="public-page case-detail-page">
        <Link to="/search" className="back-link"><ArrowLeft size={16} />検索結果へ戻る</Link>
        <div className="before-after">
          <figure><figcaption>AFTER</figcaption><img src={item.image} alt="施工後" /></figure>
          <figure><figcaption>BEFORE</figcaption><img src={images.kitchenBefore} alt="施工前" /></figure>
        </div>
        <div className="case-detail-layout">
          <aside className="detail-thumbnails">
            <img src={images.living} alt="施工箇所" />
            <img src={images.house} alt="建物外観" />
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
            <img src={images.office} alt={item.company} />
            <Link className="button button--secondary" to={"/companies/" + item.companyId}>企業情報を見る</Link>
            <Link className="button button--primary" to={"/contact?caseId=" + item.id}>企業に問い合わせる</Link>
          </aside>
        </div>
      </article>
    </PublicLayout>
  );
}
