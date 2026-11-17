import ui from "../ui.module.css";
import { Building2 } from "lucide-react";
import { Link } from "react-router";
import { HomeFilters } from "../components/organisms/filters";
import { CaseMarquee } from "../components/organisms/case-marquee";
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
      <section className={ui["home-search"]} aria-labelledby="home-search-title">
        <h1 id="home-search-title">検索</h1>
        <HomeFilters categories={loaderData.categories} styles={loaderData.styles} />
      </section>
      <CaseMarquee items={loaderData.cases}>
        <p className={ui["home-notice"]} role={loaderData.loadError ? "alert" : undefined}>{loaderData.loadError ? "施工事例を読み込めませんでした。施工事例の一覧からもう一度お試しください。" : "施工事例はまだ公開されていません。掲載されると、ここから写真や費用を確認できます。"}</p>
      </CaseMarquee>
      <section className={ui["home-company-link"]}>
        <h2>施工会社から探す</h2>
        <Link className={ui.button + " " + ui["button--secondary"]} to="/companies"><Building2 size={18} aria-hidden="true" />施工会社を見る</Link>
      </section>
    </div>
  </PublicLayout>;
}
