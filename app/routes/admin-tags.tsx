import type { Route } from "./+types/admin-tags";
import { data, Form } from "react-router";
import { z } from "zod";
import { Button } from "../components/atoms";
import { DashboardLayout } from "../components/templates";
import { requireAuthorization } from "../features/auth/authorization.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";
import { kindLabel, operationLabel, statusLabel, type TaxonomyOption, type TaxonomyRequest } from "../features/taxonomy/types";
import { getSupabaseBrowserClient } from "../lib/supabase.client";

type CompanyName = { id: string; name: string };

export function loader() {
  return { requests: [] as TaxonomyRequest[], companies: [] as CompanyName[], categories: [] as TaxonomyOption[], styles: [] as TaxonomyOption[] };
}

export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  await requireAuthorization(request, { role: "ADMIN" });
  const supabase = getSupabaseBrowserClient();
  const [requests, companies, categories, styles] = await Promise.all([
    supabase.from("taxonomy_requests").select("id, company_id, requested_by, kind, operation, target_id, proposed_name, reason, status, review_reason, created_at, reviewed_at").order("created_at", { ascending: false }),
    supabase.from("companies").select("id, name"),
    supabase.from("categories").select("id, name"),
    supabase.from("styles").select("id, name"),
  ]);
  for (const result of [requests, companies, categories, styles]) if (result.error) throw result.error;
  return { ...(await serverLoader()), requests: (requests.data ?? []) as TaxonomyRequest[], companies: companies.data ?? [], categories: categories.data ?? [], styles: styles.data ?? [] };
}

clientLoader.hydrate = true as const;
export function HydrateFallback() { return <ProtectedRouteFallback />; }

export async function clientAction({ request }: Route.ClientActionArgs) {
  await requireAuthorization(request, { role: "ADMIN" });
  const formData = await request.formData();
  const requestId = z.uuid().safeParse(formData.get("requestId"));
  const decision = z.enum(["APPROVED", "REJECTED"]).safeParse(formData.get("decision"));
  const reason = z.string().trim().max(1000).safeParse(formData.get("reviewReason"));
  if (!requestId.success || !decision.success || !reason.success || (decision.data === "REJECTED" && !reason.data)) {
    return data({ error: "審査内容を確認してください。却下には理由が必要です。" }, { status: 400 });
  }
  const { error } = await getSupabaseBrowserClient().rpc("review_taxonomy_request", {
    target_request_id: requestId.data, decision: decision.data, decision_reason: reason.data || null,
  });
  return error ? data({ error: error.code === "23505" ? "同じ名前の項目が既にあります。" : "審査結果を保存できませんでした。対象項目の状態を確認してください。" }, { status: 400 }) : { saved: true };
}

export default function AdminTagsRoute({ loaderData, actionData }: Route.ComponentProps) {
  const companyNames = new Map(loaderData.companies.map((item) => [item.id, item.name]));
  const itemNames = new Map([...loaderData.categories, ...loaderData.styles].map((item) => [item.id, item.name]));
  const pending = loaderData.requests.filter((item) => item.status === "PENDING");
  const reviewed = loaderData.requests.filter((item) => item.status !== "PENDING");
  const describe = (item: TaxonomyRequest) => `${kindLabel[item.kind]}・${operationLabel[item.operation]}：${item.proposed_name ?? itemNames.get(item.target_id ?? "") ?? "対象項目"}`;

  return <DashboardLayout type="admin">
    <header className="page-heading"><h1>検索項目の申請審査</h1><p>企業からの追加・名称変更・削除申請を確認します。削除の承認後も既存事例との関連は保持されます。</p></header>
    {actionData && "saved" in actionData && actionData.saved ? <p className="success-message" role="status">審査結果を保存しました。</p> : null}
    {actionData && "error" in actionData ? <p className="form-error" role="alert">{actionData.error}</p> : null}
    <section className="dashboard-section"><h2>審査中（{pending.length}件）</h2>
      {pending.length === 0 ? <p>審査中の申請はありません。</p> : <div className="member-list taxonomy-list">{pending.map((item) => <div key={item.id}>
        <strong>{describe(item)}</strong><span>申請企業：{companyNames.get(item.company_id) ?? item.company_id}</span>
        {item.target_id ? <span>現在の項目：{itemNames.get(item.target_id) ?? "対象項目が見つかりません"}</span> : null}
        <span>申請理由：{item.reason}</span><small>{new Date(item.created_at).toLocaleString("ja-JP")}</small>
        <Form method="post" className="inline-form"><input type="hidden" name="requestId" value={item.id} />
          <input name="reviewReason" maxLength={1000} placeholder="審査理由（却下時は必須）" aria-label={`${describe(item)}の審査理由`} />
          <Button type="submit" name="decision" value="APPROVED">承認</Button>
          <Button type="submit" name="decision" value="REJECTED" variant="secondary">却下</Button>
        </Form>
      </div>)}</div>}
    </section>
    <section className="dashboard-section"><h2>審査履歴</h2>
      {reviewed.length === 0 ? <p>履歴はありません。</p> : <div className="member-list taxonomy-list">{reviewed.map((item) => <div key={item.id}>
        <strong>{describe(item)}</strong><span>{companyNames.get(item.company_id) ?? item.company_id}</span>
        <small>{statusLabel[item.status]} · {new Date(item.reviewed_at ?? item.created_at).toLocaleString("ja-JP")}</small>
        {item.review_reason ? <span>審査理由：{item.review_reason}</span> : null}
      </div>)}</div>}
    </section>
  </DashboardLayout>;
}
