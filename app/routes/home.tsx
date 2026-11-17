import ui from "../ui.module.css";
import { ArrowRight, Building2 } from "lucide-react";
import { Link } from "react-router";
import { HomeFilters } from "../components/organisms/filters";
import { CaseGrid } from "../components/organisms";
import { PublicLayout } from "../components/templates/public-layout";
import { PublicRouteFallback } from "../components/templates/public-route-fallback";
import { fetchPublishedCases, fetchSearchOptions, type SearchOption } from "../features/cases/public-data.client";
import type { CaseStudy } from "../features/cases/types";
import type { Route } from "./+types/home";

export function loader() {
  return { categories: [] as SearchOption[], styles: [] as SearchOption[], cases: [] as CaseStudy[], loadError: false };
}
export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  const [serverData, options, cases] = await Promise.all([serverLoader(), fetchSearchOptions().catch(() => ({ categories: [], styles: [] })), fetchPublishedCases(6).then(items => ({ items, error: false }), () => ({ items: [] as CaseStudy[], error: true }))]);
  return { ...serverData, ...options, cases: cases.items, loadError: cases.error };
}
clientLoader.hydrate = true as const;
export function HydrateFallback() { return <PublicRouteFallback label="施工事例を読み込んでいます…" />; }
export function meta() {
  return [{ title: "飯塚のリノベ" }, { name: "description", content: "飯塚エリアのリフォーム・リノベーション施工事例を、写真と費用から探せます。" }];
}
export default function HomeRoute({ loaderData }: Route.ComponentProps) {
  return <PublicLayout>
    <div className={ui["public-page"] + " " + ui["home-page"]}>
      <header className={ui["page-heading"]}>
        <h1>施工事例</h1>
      </header>
      <section className={ui["home-cases"]} aria-labelledby="home-cases-title">
        <div className={ui["section-header"]}><h2 id="home-cases-title">新着</h2><Link to="/search" aria-label="すべての事例を見る">すべて見る<ArrowRight size={16} aria-hidden="true" /></Link></div>
        {loaderData.cases.length ? <CaseGrid items={loaderData.cases} /> : <p className={ui["home-notice"]} role={loaderData.loadError ? "alert" : undefined}>{loaderData.loadError ? "施工事例を読み込めませんでした。施工事例の一覧からもう一度お試しください。" : "施工事例はまだ公開されていません。掲載されると、ここから写真や費用を確認できます。"}</p>}
      </section>
      <section className={ui["home-search"]} aria-labelledby="home-search-title">
        <h2 id="home-search-title">直したい場所や予算から探す</h2>
        <HomeFilters categories={loaderData.categories} styles={loaderData.styles} />
      </section>
      <section className={ui["home-company-link"]}>
        <h2>施工会社から探す</h2>
        <Link className={ui.button + " " + ui["button--secondary"]} to="/companies"><Building2 size={18} aria-hidden="true" />施工会社を見る</Link>
      </section>
    </div>
  </PublicLayout>;
}
