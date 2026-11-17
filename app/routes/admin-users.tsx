import ui from "../ui.module.css";
import { data } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/admin-users";
import { PageHeader, Pagination } from "../components/molecules";
import { DataTable, dataTableStyles } from "../components/organisms";
import { DashboardLayout } from "../components/templates/dashboard-layout";
import { requireAuthorization } from "../features/auth/authorization.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";
import { InlineActionForm, PendingActionButton } from "../features/forms/inline-action-form";
import { loadPage, parsePage } from "../features/pagination/pagination";
import { getSupabaseBrowserClient } from "../lib/supabase.client";

type AdminUser = { id: string; display_name: string; account_role: "GENERAL" | "COMPANY" | "ADMIN" };
type AdminCompany = { id: string; name: string };
const roleSchema = z.enum(["GENERAL", "COMPANY", "ADMIN"]);
const pageSize = 10;
export function loader() { return { users: [] as AdminUser[], total: 0, page: 1, companies: [] as AdminCompany[] }; }
export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  await requireAuthorization(request, { role: "ADMIN" });
  const supabase = getSupabaseBrowserClient();
  const page = parsePage(new URL(request.url).searchParams);
  const [users, companies, serverData] = await Promise.all([
    loadPage<AdminUser>(page, pageSize, (from, to) => supabase.from("profiles").select("id, display_name, account_role", { count: "exact" }).order("created_at", { ascending: false }).range(from, to)),
    supabase.from("companies").select("id, name").order("name"), serverLoader(),
  ]);
  if (companies.error) throw companies.error;
  return { ...serverData, users: users.items, total: users.total, page: users.page, companies: (companies.data ?? []) as AdminCompany[] };
}
clientLoader.hydrate = true as const;
export function HydrateFallback() { return <ProtectedRouteFallback />; }
export async function clientAction({ request }: Route.ClientActionArgs) {
  await requireAuthorization(request, { role: "ADMIN" });
  const formData = await request.formData();
  const role = roleSchema.safeParse(formData.get("accountRole"));
  const userId = formData.get("userId");
  const companyId = formData.get("companyId");
  if (!role.success || typeof userId !== "string" || !userId) return data({ error: "アカウント情報を確認してください。" }, { status: 400 });
  const { error } = await getSupabaseBrowserClient().rpc("set_account_role", { target_user_id: userId, target_role: role.data, target_company_id: typeof companyId === "string" && companyId ? companyId : null });
  return error ? { error: "アカウントロールを更新できませんでした。" } : { saved: true };
}
export default function AdminUsersRoute({ loaderData, actionData }: Route.ComponentProps) {
  return <DashboardLayout type="admin"><PageHeader eyebrow="管理" title="ユーザー" description="アカウント権限と企業所属を変更します。" />
    {actionData && "error" in actionData ? <p className={ui["form-error"]} role="alert">{actionData.error}</p> : null}
    <DataTable caption="ユーザー一覧" headers={["ユーザー", "ID", "権限・所属"]}>{loaderData.users.map((user) => <tr key={user.id}><td><strong>{user.display_name || "名前未登録"}</strong></td><td>{user.id}</td><td><InlineActionForm className={ui["table-action-form"]} successMessage="保存しました。">{({ pending }) => <><input type="hidden" name="userId" value={user.id} /><select name="accountRole" defaultValue={user.account_role} aria-label={`${user.display_name}の権限`}><option value="GENERAL">一般</option><option value="COMPANY">企業</option><option value="ADMIN">管理者</option></select><select name="companyId" defaultValue="" aria-label={`${user.display_name}の所属企業`}><option value="">所属企業なし</option>{loaderData.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select><span className={dataTableStyles.actions}><PendingActionButton pending={pending} pendingLabel="保存中…">保存</PendingActionButton></span></>}</InlineActionForm></td></tr>)}</DataTable>
    <Pagination totalItems={loaderData.total} currentPage={loaderData.page} pageSize={pageSize} />
  </DashboardLayout>;
}
export function meta() { return [{ title: "ユーザー管理 | 飯塚のリノベ" }]; }
