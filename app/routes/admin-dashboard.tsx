import ui from "../ui.module.css";
import { Link } from "react-router";
import type { Route } from "./+types/admin-dashboard";
import { PageHeader } from "../components/molecules";
import { DashboardLayout } from "../components/templates/dashboard-layout";
import { requireAuthorization } from "../features/auth/authorization.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";
import { getSupabaseBrowserClient } from "../lib/supabase.client";

type PendingApplication = { id: string; company_name: string; created_at: string };
type PendingTag = { id: string; proposed_name: string; created_at: string };
export function loader() { return { applications: [] as PendingApplication[], applicationCount: 0, tags: [] as PendingTag[], tagCount: 0 }; }
export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  await requireAuthorization(request, { role: "ADMIN" });
  const supabase = getSupabaseBrowserClient();
  const [serverData, applications, tags] = await Promise.all([
    serverLoader(),
    supabase.from("company_applications").select("id, company_name, created_at", { count: "exact" }).eq("status", "PENDING").order("created_at", { ascending: false }).limit(5),
    supabase.from("taxonomy_requests").select("id, proposed_name, created_at", { count: "exact" }).eq("status", "PENDING").order("created_at", { ascending: false }).limit(5),
  ]);
  if (applications.error) throw applications.error;
  if (tags.error) throw tags.error;
  return { ...serverData, applications: applications.data as PendingApplication[], applicationCount: applications.count ?? 0, tags: tags.data as PendingTag[], tagCount: tags.count ?? 0 };
}
clientLoader.hydrate = true as const;
export function HydrateFallback() { return <ProtectedRouteFallback />; }
const date = new Intl.DateTimeFormat("ja-JP", { month: "short", day: "numeric" });
export default function AdminDashboardRoute({ loaderData }: Route.ComponentProps) {
  return <DashboardLayout type="admin">
    <PageHeader title="審査待ちの申請" />
    <section className={ui["work-section"]}>
      <div className={ui["section-header"]}><h2>企業アカウント申請 <span>{loaderData.applicationCount}件</span></h2><Link to="/admin/applications">申請一覧へ</Link></div>
      {loaderData.applications.length ? <ul className={ui["work-list"]}>{loaderData.applications.map(item => <li key={item.id}><Link to="/admin/applications"><strong>{item.company_name}</strong><time dateTime={item.created_at}>{date.format(new Date(item.created_at))} 申請</time></Link></li>)}</ul> : <p className={ui["work-empty"]}>審査待ちの企業申請はありません。</p>}
    </section>
    <section className={ui["work-section"]}>
      <div className={ui["section-header"]}><h2>検索項目の申請 <span>{loaderData.tagCount}件</span></h2><Link to="/admin/tags">申請一覧へ</Link></div>
      {loaderData.tags.length ? <ul className={ui["work-list"]}>{loaderData.tags.map(item => <li key={item.id}><Link to="/admin/tags"><strong>{item.proposed_name}</strong><time dateTime={item.created_at}>{date.format(new Date(item.created_at))} 申請</time></Link></li>)}</ul> : <p className={ui["work-empty"]}>審査待ちの検索項目はありません。</p>}
    </section>
    <nav className={ui["management-links"]} aria-label="その他の管理"><Link to="/admin/users">ユーザーを管理</Link><Link to="/admin/cases">施工事例を管理</Link></nav>
  </DashboardLayout>;
}
export function meta() { return [{ title: "審査待ちの申請 | 飯塚のリノベ" }]; }
