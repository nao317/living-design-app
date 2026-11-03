import type { Route } from "./+types/company-tags";
import { data } from "react-router";
import { z } from "zod";
import { Field, Pagination } from "../components/molecules";
import { DashboardLayout } from "../components/templates/dashboard-layout";
import { requireAuthorization } from "../features/auth/authorization.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";
import { kindLabel, operationLabel, statusLabel, type TaxonomyOption, type TaxonomyRequest } from "../features/taxonomy/types";
import { getSupabaseBrowserClient } from "../lib/supabase.client";
import { InlineActionForm, PendingActionButton } from "../features/forms/inline-action-form";
import { loadPage, parsePage } from "../features/pagination/pagination";

const pageSize = 10;

const requestSchema = z.object({
  kind: z.enum(["CATEGORY", "STYLE"]),
  operation: z.enum(["CREATE", "EDIT", "DELETE"]),
  targetId: z.union([z.uuid(), z.literal("")]).default(""),
  name: z.string().trim().max(100).default(""),
  reason: z.string().trim().min(1).max(1000),
});

export function loader() {
  return { categories: [] as TaxonomyOption[], styles: [] as TaxonomyOption[], requests: [] as TaxonomyRequest[], requestsTotal: 0, requestsPage: 1 };
}

export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  const context = await requireAuthorization(request, { role: "COMPANY" });
  const companyId = context.memberships[0].companyId;
  const supabase = getSupabaseBrowserClient();
  const params = new URL(request.url).searchParams;
  const [categories, styles, requests, serverData] = await Promise.all([
    supabase.from("categories").select("id, name").eq("is_active", true).order("display_order"),
    supabase.from("styles").select("id, name").eq("is_active", true).order("display_order"),
    loadPage<TaxonomyRequest>(parsePage(params), pageSize, (from, to) => supabase.from("taxonomy_requests")
      .select("id, company_id, requested_by, kind, operation, target_id, proposed_name, reason, status, review_reason, created_at, reviewed_at", { count: "exact" })
      .eq("company_id", companyId).order("created_at", { ascending: false }).range(from, to)),
    serverLoader(),
  ]);
  for (const result of [categories, styles]) if (result.error) throw result.error;
  return { ...serverData, categories: categories.data ?? [], styles: styles.data ?? [], requests: requests.items, requestsTotal: requests.total, requestsPage: requests.page };
}

clientLoader.hydrate = true as const;

export function HydrateFallback() { return <ProtectedRouteFallback />; }

export async function clientAction({ request }: Route.ClientActionArgs) {
  const context = await requireAuthorization(request, { role: "COMPANY" });
  const companyId = context.memberships[0].companyId;
  const formData = await request.formData();
  const supabase = getSupabaseBrowserClient();

  if (formData.get("intent") === "withdraw") {
    const requestId = z.uuid().safeParse(formData.get("requestId"));
    if (!requestId.success) return data({ error: "申請を指定してください。" }, { status: 400 });
    const { error } = await supabase.rpc("withdraw_taxonomy_request", { target_request_id: requestId.data });
    return error ? data({ error: "申請を取り下げられませんでした。" }, { status: 400 }) : { saved: true };
  }

  if (formData.get("intent") !== "request") return data({ error: "操作を指定してください。" }, { status: 400 });
  const parsed = requestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return data({ error: "申請内容を確認してください。" }, { status: 400 });
  const { kind, operation, targetId, name, reason } = parsed.data;
  if ((operation === "CREATE" && (targetId || !name)) || (operation === "EDIT" && (!targetId || !name)) || (operation === "DELETE" && (!targetId || name))) {
    return data({ error: "申請内容を確認してください。" }, { status: 400 });
  }
  const { error } = await supabase.rpc("submit_taxonomy_request", {
    target_company_id: companyId, request_kind: kind, request_operation: operation,
    request_target_id: targetId || null, request_name: name || null, request_reason: reason,
  });
  return error ? data({ error: error.code === "23505" ? "同じ項目の申請が審査中です。" : "申請を送信できませんでした。項目と入力内容を確認してください。" }, { status: 400 }) : { saved: true };
}

export default function CompanyTagsRoute({ loaderData, actionData }: Route.ComponentProps) {
  const names = new Map([...loaderData.categories, ...loaderData.styles].map((item) => [item.id, item.name]));
  return <DashboardLayout type="company">
    <header className="page-heading"><h1>検索項目の変更申請</h1><p>項目の追加・名称変更・削除を管理者に申請できます。承認後に検索と事例編集へ反映されます。</p></header>
    {actionData && "saved" in actionData && actionData.saved ? <p className="success-message" role="status">申請を更新しました。</p> : null}
    {actionData && "error" in actionData ? <p className="form-error" role="alert">{actionData.error}</p> : null}
    <section className="dashboard-section"><h2>新しい項目を追加</h2>
      <InlineActionForm className="edit-form" successMessage="申請しました。">{({ pending }) => <><input type="hidden" name="intent" value="request" /><input type="hidden" name="operation" value="CREATE" />
        <div className="form-grid"><Field label="種類"><select name="kind"><option value="CATEGORY">リノベーション箇所</option><option value="STYLE">こだわり条件</option></select></Field>
          <Field label="項目名"><input name="name" required maxLength={100} /></Field></div>
        <Field label="申請理由"><textarea name="reason" required maxLength={1000} rows={3} /></Field>
        <div className="form-actions"><PendingActionButton pending={pending} pendingLabel="申請中…">追加を申請</PendingActionButton></div>
      </>}</InlineActionForm>
    </section>
    {(["CATEGORY", "STYLE"] as const).map((kind) => <section className="dashboard-section" key={kind}>
      <h2>{kindLabel[kind]}の変更</h2>
      {(kind === "CATEGORY" ? loaderData.categories : loaderData.styles).length === 0 ? <p>項目はありません。</p> :
        <div className="member-list taxonomy-list">{(kind === "CATEGORY" ? loaderData.categories : loaderData.styles).map((option) => <div key={option.id}>
          <strong>{option.name}</strong>
          <InlineActionForm className="inline-form" successMessage="申請しました。">{({ pending }) => <><input type="hidden" name="intent" value="request" /><input type="hidden" name="kind" value={kind} /><input type="hidden" name="operation" value="EDIT" /><input type="hidden" name="targetId" value={option.id} />
            <input name="name" defaultValue={option.name} required maxLength={100} aria-label={`${option.name}の新しい名称`} />
            <input name="reason" required maxLength={1000} autoComplete="off" placeholder="例：利用者に伝わりやすい名称に変更…" aria-label={`${option.name}の変更理由`} />
            <PendingActionButton pending={pending} pendingLabel="申請中…" variant="secondary">名称変更を申請</PendingActionButton>
          </>}</InlineActionForm>
          <InlineActionForm className="inline-form" confirmMessage={`「${option.name}」の削除を申請しますか？`} successMessage="申請しました。">{({ pending }) => <><input type="hidden" name="intent" value="request" /><input type="hidden" name="kind" value={kind} /><input type="hidden" name="operation" value="DELETE" /><input type="hidden" name="targetId" value={option.id} />
            <input name="reason" required maxLength={1000} autoComplete="off" placeholder="例：同じ意味の項目があるため…" aria-label={`${option.name}の削除理由`} />
            <PendingActionButton pending={pending} pendingLabel="申請中…" variant="secondary">削除を申請</PendingActionButton>
          </>}</InlineActionForm>
        </div>)}</div>}
    </section>)}
    <section className="dashboard-section"><h2>申請履歴</h2>
      {loaderData.requests.length === 0 ? <p>申請はありません。</p> : <div className="member-list taxonomy-list">{loaderData.requests.map((item) => <div key={item.id}>
        <strong>{kindLabel[item.kind]}・{operationLabel[item.operation]}：{item.proposed_name ?? names.get(item.target_id ?? "") ?? "対象項目"}</strong>
        <span>{item.reason}</span><small>{statusLabel[item.status]} · {new Date(item.created_at).toLocaleString("ja-JP")}</small>
        {item.review_reason ? <span>審査理由：{item.review_reason}</span> : null}
        {item.status === "PENDING" ? <InlineActionForm confirmMessage="この申請を取り下げますか？">{({ pending }) => <><input type="hidden" name="intent" value="withdraw" /><input type="hidden" name="requestId" value={item.id} /><PendingActionButton pending={pending} pendingLabel="取り下げ中…" variant="secondary">取り下げる</PendingActionButton></>}</InlineActionForm> : null}
      </div>)}</div>}
      <Pagination totalItems={loaderData.requestsTotal} currentPage={loaderData.requestsPage} pageSize={pageSize} />
    </section>
  </DashboardLayout>;
}

export function meta() { return [{ title: "検索項目の変更申請 | 飯塚のリノベ" }]; }
