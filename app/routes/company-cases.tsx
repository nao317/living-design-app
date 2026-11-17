import ui from "../ui.module.css";
import { data, Link } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/company-cases";
import { StatusBadge } from "../components/atoms";
import { EmptyState, PageHeader, Pagination } from "../components/molecules";
import { DataTable, dataTableStyles } from "../components/organisms";
import { DashboardLayout } from "../components/templates/dashboard-layout";
import { requireAuthorization } from "../features/auth/authorization.client";
import { getActiveCompanyId } from "../features/auth/company-selection.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";
import { InlineActionForm, PendingActionButton } from "../features/forms/inline-action-form";
import { removeImages } from "../features/media/image-storage.client";
import { loadPage, parsePage } from "../features/pagination/pagination";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../lib/supabase.client";

type CompanyCase = { id: string; title: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; area: string; updated_at: string };
const pageSize = 10;
const labels = { DRAFT: "下書き", PUBLISHED: "公開", ARCHIVED: "非公開" } as const;
export function loader() { return { items: [] as CompanyCase[], total: 0, page: 1 }; }
export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  const context = await requireAuthorization(request, { role: "COMPANY" });
  const companyId = getActiveCompanyId(context);
  const page = parsePage(new URL(request.url).searchParams);
  if (!companyId) return { ...(await serverLoader()), items: [], total: 0, page: 1 };
  const result = await loadPage<CompanyCase>(page, pageSize, (from, to) => getSupabaseBrowserClient().from("construction_cases").select("id, title, status, area, updated_at", { count: "exact" }).eq("company_id", companyId).order("updated_at", { ascending: false }).range(from, to));
  return { ...(await serverLoader()), items: result.items, total: result.total, page: result.page };
}
clientLoader.hydrate = true as const;
export function HydrateFallback() { return <ProtectedRouteFallback />; }
export async function clientAction({ request }: Route.ClientActionArgs) {
  const context = await requireAuthorization(request, { role: "COMPANY" });
  const selectedCompanyId = getActiveCompanyId(context);
  const formData = await request.formData();
  const caseId = z.uuid().safeParse(formData.get("caseId"));
  if (!caseId.success || !selectedCompanyId || !isSupabaseConfigured()) return data({ error: "削除する施工事例を指定してください。" }, { status: 400 });
  const supabase = getSupabaseBrowserClient();
  const { data: targetCase, error: caseError } = await supabase.from("construction_cases").select("id, company_id, title").eq("id", caseId.data).maybeSingle();
  if (caseError || !targetCase || targetCase.company_id !== selectedCompanyId) return data({ error: "この施工事例は削除できません。" }, { status: 403 });
  const { data: imageRows, error: imageError } = await supabase.from("case_images").select("storage_path").eq("case_id", caseId.data);
  if (imageError) return data({ error: "施工写真を確認できませんでした。" }, { status: 400 });
  const storageError = await removeImages("case-images", (imageRows ?? []).map((image) => image.storage_path));
  if (storageError) return data({ error: "施工写真を削除できませんでした。" }, { status: 400 });
  const { data: deletedCase, error: deleteError } = await supabase.from("construction_cases").delete().eq("id", caseId.data).eq("company_id", selectedCompanyId).select("id").maybeSingle();
  if (deleteError || !deletedCase) return data({ error: "施工事例を削除できませんでした。" }, { status: 400 });
  return data({ deleted: true, title: targetCase.title });
}
export default function CompanyCasesRoute({ loaderData, actionData }: Route.ComponentProps) {
  return <DashboardLayout type="company"><PageHeader title="施工事例" description="施工事例の公開状態を確認し、追加・編集できます。" actions={<Link className={ui.button + " " + ui["button--primary"]} to="/company/cases/new">施工事例を追加</Link>} />
    {actionData && "deleted" in actionData ? <p className={ui["success-message"]} role="status">「{actionData.title}」を削除しました。</p> : null}
    {actionData && "error" in actionData ? <p className={ui["form-error"]} role="alert">{actionData.error}</p> : null}
    {loaderData.items.length ? <><DataTable caption="施工事例一覧" headers={["タイトル", "地域", "更新日", "状態", "操作"]}>{loaderData.items.map((item) => <tr key={item.id}><td><strong>{item.title}</strong></td><td>{item.area || "未登録"}</td><td>{new Intl.DateTimeFormat("ja-JP").format(new Date(item.updated_at))}</td><td><StatusBadge tone={item.status === "PUBLISHED" ? "success" : item.status === "DRAFT" ? "warning" : "neutral"}>{labels[item.status]}</StatusBadge></td><td><div className={dataTableStyles.actions}><Link className={ui.button + " " + ui["button--secondary"]} to={`/company/cases/${item.id}/edit`}>編集</Link><InlineActionForm confirmMessage={`「${item.title}」を削除しますか？この操作は取り消せません。`}>{({ pending }) => <><input type="hidden" name="caseId" value={item.id} /><PendingActionButton pending={pending} pendingLabel="削除中…" variant="danger">削除</PendingActionButton></>}</InlineActionForm></div></td></tr>)}</DataTable><Pagination totalItems={loaderData.total} currentPage={loaderData.page} pageSize={pageSize} /></> : <EmptyState title="施工事例はまだありません" description="最初の施工事例を登録すると、公開サイトから探せるようになります。" action={<Link className={ui.button + " " + ui["button--primary"]} to="/company/cases/new">施工事例を追加</Link>} />}
  </DashboardLayout>;
}
export function meta() { return [{ title: "施工事例 | 企業管理 | 飯塚のリノベ" }]; }
