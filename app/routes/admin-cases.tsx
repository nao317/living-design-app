import ui from "../ui.module.css";
import { data, Link } from "react-router";
import type { Route } from "./+types/admin-cases";
import { StatusBadge } from "../components/atoms";
import { EmptyState, PageHeader, Pagination } from "../components/molecules";
import { DataTable, dataTableStyles } from "../components/organisms";
import { DashboardLayout } from "../components/templates/dashboard-layout";
import { requireAuthorization } from "../features/auth/authorization.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";
import { InlineActionForm, PendingActionButton } from "../features/forms/inline-action-form";
import { loadPage, parsePage } from "../features/pagination/pagination";
import { getSupabaseBrowserClient } from "../lib/supabase.client";

type AdminCase = { id: string; title: string; status: string; company_id: string };
const pageSize = 10;
const statusLabel: Record<string, string> = { DRAFT: "下書き", PUBLISHED: "公開", ARCHIVED: "非公開" };
export function loader() { return { items: [] as AdminCase[], total: 0, page: 1 }; }
export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  await requireAuthorization(request, { role: "ADMIN" });
  const page = parsePage(new URL(request.url).searchParams);
  const result = await loadPage<AdminCase>(page, pageSize, (from, to) => getSupabaseBrowserClient().from("construction_cases").select("id, title, status, company_id", { count: "exact" }).order("updated_at", { ascending: false }).range(from, to));
  return { ...(await serverLoader()), items: result.items, total: result.total, page: result.page };
}
clientLoader.hydrate = true as const;
export function HydrateFallback() { return <ProtectedRouteFallback />; }
export async function clientAction({ request }: Route.ClientActionArgs) {
  await requireAuthorization(request, { role: "ADMIN" });
  const caseId = (await request.formData()).get("caseId");
  if (typeof caseId !== "string" || !caseId) return data({ error: "施工事例を指定してください。" }, { status: 400 });
  const { error } = await getSupabaseBrowserClient().from("construction_cases").delete().eq("id", caseId);
  return error ? { error: "施工事例を削除できませんでした。" } : { saved: true };
}
export default function AdminCasesRoute({ loaderData, actionData }: Route.ComponentProps) {
  return <DashboardLayout type="admin"><PageHeader title="施工事例" description="全企業の施工事例と公開状態を管理します。" actions={<Link className={ui.button + " " + ui["button--secondary"]} to="/search">公開一覧を見る</Link>} />
    {actionData && "error" in actionData ? <p className={ui["form-error"]} role="alert">{actionData.error}</p> : null}
    {loaderData.items.length ? <><DataTable caption="施工事例一覧" headers={["タイトル", "状態", "企業ID", "操作"]}>{loaderData.items.map((item) => <tr key={item.id}><td><strong>{item.title}</strong></td><td><StatusBadge tone={item.status === "PUBLISHED" ? "success" : item.status === "DRAFT" ? "warning" : "neutral"}>{statusLabel[item.status] ?? item.status}</StatusBadge></td><td>{item.company_id}</td><td><div className={dataTableStyles.actions}><Link className={ui.button + " " + ui["button--secondary"]} to={`/admin/cases/${item.id}/edit`}>編集</Link><InlineActionForm confirmMessage={`「${item.title}」を削除しますか？この操作は取り消せません。`}>{({ pending }) => <><input type="hidden" name="caseId" value={item.id} /><PendingActionButton pending={pending} pendingLabel="削除中…" variant="danger">削除</PendingActionButton></>}</InlineActionForm></div></td></tr>)}</DataTable><Pagination totalItems={loaderData.total} currentPage={loaderData.page} pageSize={pageSize} /></> : <EmptyState title="施工事例はありません" />}
  </DashboardLayout>;
}
export function meta() { return [{ title: "施工事例管理 | 飯塚のリノベ" }]; }
