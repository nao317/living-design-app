import ui from "../ui.module.css";
import { Files, Mail, PencilLine, Users } from "lucide-react";
import { Link } from "react-router";
import type { Route } from "./+types/company-dashboard";
import { PageHeader } from "../components/molecules";
import { DashboardLayout } from "../components/templates/dashboard-layout";
import { requireAuthorization } from "../features/auth/authorization.client";
import { getActiveCompanyId, setActiveCompanyId } from "../features/auth/company-selection.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";
import { StorageImage } from "../features/media/storage-image";
import { getSupabaseBrowserClient } from "../lib/supabase.client";

type CompanyOption = { id: string; name: string };
type CompanyOverview = { id: string; name: string; description: string; cover_image_path: string | null; logo_path: string | null };
export function loader() { return { company: null as CompanyOverview | null, companies: [] as CompanyOption[], activeCompanyId: "" }; }
export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  const context = await requireAuthorization(request, { role: "COMPANY" });
  const activeCompanyId = getActiveCompanyId(context) ?? "";
  const supabase = getSupabaseBrowserClient();
  const [company, companies, serverData] = await Promise.all([
    supabase.from("companies").select("id, name, description, cover_image_path, logo_path").eq("id", activeCompanyId).maybeSingle(),
    supabase.from("companies").select("id, name").in("id", context.memberships.map(({ companyId }) => companyId)).order("name"),
    serverLoader(),
  ]);
  if (company.error) throw company.error;
  if (companies.error) throw companies.error;
  return { ...serverData, company: company.data as CompanyOverview | null, companies: (companies.data ?? []) as CompanyOption[], activeCompanyId };
}
clientLoader.hydrate = true as const;
export function HydrateFallback() { return <ProtectedRouteFallback />; }

const sections = [
  ["/company/cases", "施工事例", "施工事例の追加、編集、公開状態を管理します。", Files],
  ["/company/messages", "お問い合わせ", "利用者から届いた相談を確認します。", Mail],
  ["/company/members", "所属ユーザー", "企業に所属するユーザーを確認します。", Users],
  ["/company/profile/edit", "企業情報", "公開プロフィールと連絡先を更新します。", PencilLine],
] as const;

export default function CompanyDashboardRoute({ loaderData }: Route.ComponentProps) {
  return <DashboardLayout type="company">
    <PageHeader eyebrow="COMPANY" title={loaderData.company?.name ?? "企業管理"} description={loaderData.company?.description || "企業情報と施工事例、お問い合わせを機能ごとに管理できます。"} actions={loaderData.companies.length > 1 ? <label className={ui["company-switcher"]}>操作する企業<select value={loaderData.activeCompanyId} onChange={(event) => { if (setActiveCompanyId(loaderData.companies.map(({ id }) => id), event.currentTarget.value)) window.location.reload(); }}>{loaderData.companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}</select></label> : null} />
    {loaderData.company ? <div className={ui["company-overview-image"]}>{loaderData.company.cover_image_path || loaderData.company.logo_path ? <StorageImage width={1120} height={260} src="" storagePath={loaderData.company.cover_image_path ?? loaderData.company.logo_path ?? undefined} bucket="company-assets" alt="" /> : <div className={ui["image-empty"]}>企業画像未登録</div>}</div> : null}
    <div className={ui["dashboard-link-grid"]}>{sections.map(([href, title, description, Icon]) => <Link className={ui["dashboard-link-card"]} to={href} key={href}><Icon aria-hidden="true" size={22} /><span><strong>{title}</strong><small>{description}</small></span></Link>)}</div>
  </DashboardLayout>;
}
export function meta() { return [{ title: "企業管理 | 飯塚のリノベ" }]; }
