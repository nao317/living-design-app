import ui from "../ui.module.css";
import { data } from "react-router";
import type { Route } from "./+types/admin-applications";
import { StatusBadge } from "../components/atoms";
import { EmptyState, PageHeader, Pagination } from "../components/molecules";
import { DataTable, dataTableStyles } from "../components/organisms";
import { DashboardLayout } from "../components/templates/dashboard-layout";
import { requireAuthorization } from "../features/auth/authorization.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";
import { InlineActionForm, PendingActionButton } from "../features/forms/inline-action-form";
import { loadPage, parsePage } from "../features/pagination/pagination";
import { getSupabaseBrowserClient } from "../lib/supabase.client";

type Application = { id: string; company_name: string; description: string; status: "PENDING" | "APPROVED" | "REJECTED"; created_at: string };
const pageSize = 10;
const labels = { PENDING: "審査中", APPROVED: "承認済み", REJECTED: "却下" } as const;
export function loader() { return { items: [] as Application[], total: 0, page: 1 }; }
export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  await requireAuthorization(request, { role: "ADMIN" });
  const page = parsePage(new URL(request.url).searchParams);
  const result = await loadPage<Application>(page, pageSize, (from, to) => getSupabaseBrowserClient().from("company_applications").select("id, company_name, description, status, created_at", { count: "exact" }).order("created_at", { ascending: false }).range(from, to));
  return { ...(await serverLoader()), items: result.items, total: result.total, page: result.page };
}
clientLoader.hydrate = true as const;
export function HydrateFallback() { return <ProtectedRouteFallback />; }
export async function clientAction({ request }: Route.ClientActionArgs) {
  await requireAuthorization(request, { role: "ADMIN" });
  const formData = await request.formData();
  const intent = formData.get("intent");
  const applicationId = formData.get("applicationId");
  if ((intent !== "approve" && intent !== "reject") || typeof applicationId !== "string" || !applicationId) return data({ error: "申請を指定してください。" }, { status: 400 });
  const { error } = await getSupabaseBrowserClient().rpc(intent === "approve" ? "approve_company_application" : "reject_company_application", { target_application_id: applicationId });
  return error ? { error: "企業申請を処理できませんでした。" } : { saved: true };
}
export default function AdminApplicationsRoute({ loaderData, actionData }: Route.ComponentProps) {
  return <DashboardLayout type="admin"><PageHeader title="企業申請" description="企業アカウントへの切り替え申請を確認し、承認または却下します。" />
    {actionData && "error" in actionData ? <p className={ui["form-error"]} role="alert">{actionData.error}</p> : null}
    {loaderData.items.length ? <><DataTable caption="企業申請一覧" headers={["企業名", "申請内容", "申請日", "状態", "操作"]}>{loaderData.items.map((item) => <tr key={item.id}><td><strong>{item.company_name}</strong></td><td>{item.description || "企業紹介未入力"}</td><td>{new Intl.DateTimeFormat("ja-JP").format(new Date(item.created_at))}</td><td><StatusBadge tone={item.status === "APPROVED" ? "success" : item.status === "REJECTED" ? "danger" : "warning"}>{labels[item.status]}</StatusBadge></td><td><div className={dataTableStyles.actions}>{item.status === "PENDING" ? <><InlineActionForm>{({ pending }) => <><input type="hidden" name="intent" value="approve" /><input type="hidden" name="applicationId" value={item.id} /><PendingActionButton pending={pending} pendingLabel="承認中…">承認</PendingActionButton></>}</InlineActionForm><InlineActionForm confirmMessage={`「${item.company_name}」の申請を却下しますか？`}>{({ pending }) => <><input type="hidden" name="intent" value="reject" /><input type="hidden" name="applicationId" value={item.id} /><PendingActionButton pending={pending} pendingLabel="却下中…" variant="danger">却下</PendingActionButton></>}</InlineActionForm></> : null}</div></td></tr>)}</DataTable><Pagination totalItems={loaderData.total} currentPage={loaderData.page} pageSize={pageSize} /></> : <EmptyState title="企業申請はありません" description="新しい申請が届くと、ここに表示されます。" />}
  </DashboardLayout>;
}
export function meta() { return [{ title: "企業申請 | 飯塚のリノベ" }]; }
