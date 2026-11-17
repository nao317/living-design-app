import ui from "../ui.module.css";
import { CaseList } from "../components/organisms";
import { Pagination } from "../components/molecules";
import { DashboardLayout } from "../components/templates/dashboard-layout";
import type { Route } from "./+types/favorites";
import { getAuthorizationContext } from "../features/auth/authorization.client";
import { PublicRouteFallback } from "../components/templates/public-route-fallback";
import { PublicLayout } from "../components/templates/public-layout";
import { readGuestFavorites, transferGuestFavorites } from "../features/favorites/guest-favorites.client";
import { fetchFavoriteCasesPage, fetchSavedCases } from "../features/cases/public-data.client";
import type { CaseStudy } from "../features/cases/types";
import { Link } from "react-router";
import { parsePage } from "../features/pagination/pagination";

const pageSize = 10;

export function loader() {
  return { items: [] as CaseStudy[], total: 0, page: 1, guest: true, transferError: false };
}

export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  const authorization = await getAuthorizationContext();
  if (!authorization) {
    const items = await fetchSavedCases(readGuestFavorites());
    return { ...(await serverLoader()), items, total: items.length, page: 1, guest: true };
  }
  if (authorization.accountRole !== "GENERAL") throw new Response("権限がありません", { status: 404 });
  const transferError = await transferGuestFavorites(authorization.userId).then(() => false, () => true);
  const params = new URL(request.url).searchParams;
  const favorites = await fetchFavoriteCasesPage(parsePage(params), pageSize);
  return {
    ...(await serverLoader()),
    ...favorites, guest: false, transferError,
  };
}

clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return <PublicRouteFallback label="保存した事例を読み込んでいます…" />;
}

export default function FavoritesRoute({ loaderData }: { loaderData: ReturnType<typeof loader> }) {
  const Layout = loaderData.guest ? PublicLayout : DashboardLayout;
  return (
    <Layout><div className={loaderData.guest ? ui["public-page"] + " " + ui["saved-page"] : undefined}>
      <header className={ui["page-heading"]}><h1>お気に入り</h1></header>
      {loaderData.transferError ? <p className={ui["form-error"]} role="alert">この端末に保存した事例をアカウントに引き継げませんでした。端末の保存内容は残っています。<button type="button" className={ui["text-button"]} onClick={() => window.location.reload()}>引き継ぎを再試行</button></p> : null}
      {loaderData.guest ? <p className={ui["form-hint"]}>このブラウザーに保存した事例です。<Link to="/login?redirectTo=%2Fmypage%2Ffavorites">ログイン</Link>すると、アカウントに引き継いで別の端末でも確認できます。</p> : null}
      {loaderData.items.length ? <CaseList items={loaderData.items} /> : <div className={ui["empty-state"]}><h2>お気に入りはまだありません</h2><p>気になる施工事例を保存して、あとから比較できます。</p><Link to="/search" className={ui["button"] + " " + ui["button--primary"]}>施工事例を探す</Link></div>}
      {!loaderData.guest ? <Pagination totalItems={loaderData.total} currentPage={loaderData.page} pageSize={pageSize} /> : null}
    </div></Layout>
  );
}

export function meta() { return [{ title: "お気に入り | 飯塚のリノベ" }]; }
