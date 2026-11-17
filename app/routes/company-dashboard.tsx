import ui from "../ui.module.css";
import { Link } from "react-router";
import { ArrowUpRight, PencilLine, Plus } from "lucide-react";
import type { Route } from "./+types/company-dashboard";
import { PageHeader } from "../components/molecules";
import { DashboardLayout } from "../components/templates/dashboard-layout";
import { requireAuthorization } from "../features/auth/authorization.client";
import { getActiveCompanyId, setActiveCompanyId } from "../features/auth/company-selection.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";
import { getSupabaseBrowserClient } from "../lib/supabase.client";

type CompanyOption = { id: string; name: string };
type Message = { id: string; sender_name: string; subject: string; created_at: string };
type Draft = { id: string; title: string };
export function loader() { return { company: null as CompanyOption | null, companies: [] as CompanyOption[], activeCompanyId: "", messages: [] as Message[], messageCount: 0, drafts: [] as Draft[], draftCount: 0 }; }
export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  const context = await requireAuthorization(request, { role: "COMPANY" });
  const activeCompanyId = getActiveCompanyId(context) ?? "";
  const supabase = getSupabaseBrowserClient();
  const [companies, messages, drafts, serverData] = await Promise.all([
    supabase.from("companies").select("id, name").in("id", context.memberships.map(({ companyId }) => companyId)).order("name"),
    supabase.from("contact_messages").select("id, sender_name, subject, created_at", { count: "exact" }).eq("company_id", activeCompanyId).eq("status", "NEW").order("created_at", { ascending: false }).limit(5),
    supabase.from("construction_cases").select("id, title", { count: "exact" }).eq("company_id", activeCompanyId).eq("status", "DRAFT").order("created_at", { ascending: false }).limit(5),
    serverLoader(),
  ]);
  for (const result of [companies, messages, drafts]) if (result.error) throw result.error;
  const options = companies.data as CompanyOption[];
  return { ...serverData, company: options.find(company => company.id === activeCompanyId) ?? null, companies: options, activeCompanyId, messages: messages.data as Message[], messageCount: messages.count ?? 0, drafts: drafts.data as Draft[], draftCount: drafts.count ?? 0 };
}
clientLoader.hydrate = true as const;
export function HydrateFallback() { return <ProtectedRouteFallback />; }
const date = new Intl.DateTimeFormat("ja-JP", { month: "short", day: "numeric" });
export default function CompanyDashboardRoute({ loaderData }: Route.ComponentProps) {
  return <DashboardLayout type="company">
    <PageHeader title={loaderData.company?.name ?? "企業管理"} actions={<><Link className={ui.button + " " + ui["button--primary"]} to="/company/cases/new"><Plus size={18} aria-hidden="true" />施工事例を追加</Link>{loaderData.companies.length > 1 ? <label className={ui["company-switcher"]}>操作する企業<select value={loaderData.activeCompanyId} onChange={event => { if (setActiveCompanyId(loaderData.companies.map(({ id }) => id), event.currentTarget.value)) window.location.reload(); }}>{loaderData.companies.map(company => <option value={company.id} key={company.id}>{company.name}</option>)}</select></label> : null}</>} />
    <section className={ui["work-section"]}>
      <div className={ui["section-header"]}><h2>未読のお問い合わせ <span>{loaderData.messageCount}件</span></h2><Link to="/company/messages?status=NEW">未読を確認</Link></div>
      {loaderData.messages.length ? <ul className={ui["work-list"]}>{loaderData.messages.map(message => <li key={message.id}><Link to={`/company/messages?status=NEW#message-${message.id}`}><span><strong>{message.sender_name}さん</strong><small>{message.subject}</small></span><time dateTime={message.created_at}>{date.format(new Date(message.created_at))}</time></Link></li>)}</ul> : <p className={ui["work-empty"]}>未読のお問い合わせはありません。</p>}
    </section>
    <section className={ui["work-section"]}>
      <div className={ui["section-header"]}><h2>編集中の施工事例 <span>{loaderData.draftCount}件</span></h2><Link to="/company/cases">事例一覧へ</Link></div>
      {loaderData.drafts.length ? <ul className={ui["work-list"]}>{loaderData.drafts.map(item => <li key={item.id}><Link to={`/company/cases/${item.id}/edit`}><strong>{item.title}</strong><span className={ui["row-action"]} title="編集を続ける"><PencilLine size={17} aria-hidden="true" /><span className={ui["sr-only"]}>編集を続ける</span></span></Link></li>)}</ul> : <p className={ui["work-empty"]}>編集中の事例はありません。新しい施工事例は「施工事例を追加」から登録できます。</p>}
    </section>
    <nav className={ui["management-links"]} aria-label="企業情報の管理"><Link to="/company/profile/edit">企業情報を編集</Link><Link to="/company/members">所属ユーザーを確認</Link>{loaderData.company ? <Link to={`/companies/${loaderData.company.id}`}><ArrowUpRight size={16} aria-hidden="true" />公開ページ<span className={ui["sr-only"]}>を見る</span></Link> : null}</nav>
  </DashboardLayout>;
}
export function meta() { return [{ title: "企業管理 | 飯塚のリノベ" }]; }
