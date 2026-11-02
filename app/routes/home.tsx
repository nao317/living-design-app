import { Link } from "react-router";
import { HomeFilters } from "../components/organisms/filters";
import { PublicLayout } from "../components/templates/public-layout";
import { PublicRouteFallback } from "../components/templates/public-route-fallback";
import { media } from "../data/media";
import { fetchSearchOptions, type SearchOption } from "../features/cases/public-data.client";
import type { Route } from "./+types/home";

export function loader() {
  return { categories: [] as SearchOption[], styles: [] as SearchOption[] };
}

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  const serverDataPromise = serverLoader();
  try {
    const [serverData, options] = await Promise.all([serverDataPromise, fetchSearchOptions()]);
    return { ...serverData, ...options };
  } catch (error) {
    console.error("Failed to load search options", error);
    return serverDataPromise;
  }
}

clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return <PublicRouteFallback label="検索条件を読み込んでいます…" />;
}

export function meta() {
  return [
    { title: "飯塚のリノベ" },
    { name: "description", content: "飯塚エリアのリフォーム・リノベーション施工事例を検索できます。" },
  ];
}

export default function HomeRoute({ loaderData }: Route.ComponentProps) {
  return (
    <PublicLayout>
      <div className="public-page home-page">
        <section className="home-hero">
          <img className="home-hero__image" src={media.house} alt="" width={1200} height={675} fetchPriority="high" />
          <div>
            <h1>飯塚で理想のリフォーム＆<br />リノベーション</h1>
          </div>
        </section>
        <HomeFilters categories={loaderData.categories} styles={loaderData.styles} />
        <section className="home-guide" aria-labelledby="home-guide-title">
          <div className="home-section-heading"><p>はじめての方へ</p><h2 id="home-guide-title">希望に合う事例と企業を見つける3ステップ</h2></div>
          <ol>
            <li><span>1</span><strong>条件から探す</strong><p>場所や予算、こだわりから施工事例を絞り込みます。</p></li>
            <li><span>2</span><strong>事例と企業を比べる</strong><p>気になる事例を保存し、施工企業の情報を確認します。</p></li>
            <li><span>3</span><strong>企業へ相談する</strong><p>問い合わせ先を選び、施工や見積もりについて相談します。</p></li>
          </ol>
          <div className="home-guide__actions"><Link className="button button--primary" to="/search">施工事例を探す</Link><Link className="button button--secondary" to="/companies">企業を探す</Link></div>
        </section>
      </div>
    </PublicLayout>
  );
}
