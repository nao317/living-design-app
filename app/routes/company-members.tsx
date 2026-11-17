import type { Route } from "./+types/company-members";
import { Avatar, StatusBadge } from "../components/atoms";
import { EmptyState, PageHeader, Pagination } from "../components/molecules";
import { DataTable } from "../components/organisms";
import { DashboardLayout } from "../components/templates/dashboard-layout";
import { requireAuthorization } from "../features/auth/authorization.client";
import { getActiveCompanyId } from "../features/auth/company-selection.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";
import { loadPage, parsePage } from "../features/pagination/pagination";
import { getSupabaseBrowserClient } from "../lib/supabase.client";

type Membership = { user_id: string; role: "OWNER" | "ADMIN" | "EDITOR" };
type Member = Membership & { name: string };
const pageSize = 10;
const labels = { OWNER: "所有者", ADMIN: "管理者", EDITOR: "担当者" } as const;
export function loader() { return { items: [] as Member[], total: 0, page: 1 }; }
export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  const context = await requireAuthorization(request, { role: "COMPANY" });
  const companyId = getActiveCompanyId(context);
  const page = parsePage(new URL(request.url).searchParams);
  if (!companyId) return { ...(await serverLoader()), items: [], total: 0, page: 1 };
  const supabase = getSupabaseBrowserClient();
  const memberships = await loadPage<Membership>(page, pageSize, (from, to) => supabase.from("company_members").select("user_id, role", { count: "exact" }).eq("company_id", companyId).range(from, to));
  const ids = memberships.items.map((item) => item.user_id);
  const profiles = ids.length ? await supabase.from("profiles").select("id, display_name").in("id", ids) : { data: [], error: null };
  if (profiles.error) throw profiles.error;
  const names = new Map((profiles.data ?? []).map((profile) => [profile.id, profile.display_name]));
  return { ...(await serverLoader()), items: memberships.items.map((item) => ({ ...item, name: names.get(item.user_id) || "ユーザー" })), total: memberships.total, page: memberships.page };
}
clientLoader.hydrate = true as const;
export function HydrateFallback() { return <ProtectedRouteFallback />; }
export default function CompanyMembersRoute({ loaderData }: Route.ComponentProps) {
  return <DashboardLayout type="company"><PageHeader title="所属ユーザー" description="この企業の情報と施工事例を管理できるユーザーです。" />
    {loaderData.items.length ? <DataTable caption="所属ユーザー一覧" headers={["ユーザー", "権限"]}>{loaderData.items.map((member) => <tr key={member.user_id}><td><Avatar name={member.name} /> <strong>{member.name}</strong></td><td><StatusBadge tone={member.role === "OWNER" ? "success" : "neutral"}>{labels[member.role]}</StatusBadge></td></tr>)}</DataTable> : <EmptyState title="所属ユーザーはいません" />}
    <Pagination totalItems={loaderData.total} currentPage={loaderData.page} pageSize={pageSize} />
  </DashboardLayout>;
}
export function meta() { return [{ title: "所属ユーザー | 企業管理 | 飯塚のリノベ" }]; }
