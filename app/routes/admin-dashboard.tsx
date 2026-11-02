import type { Route } from "./+types/admin-dashboard";
import { data, Link } from "react-router";
import { z } from "zod";
import { DashboardLayout } from "../components/templates/dashboard-layout";
import { requireAuthorization } from "../features/auth/authorization.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";
import { getSupabaseBrowserClient } from "../lib/supabase.client";
import { InlineActionForm, PendingActionButton } from "../features/forms/inline-action-form";

type AdminUser = {
  id: string;
  display_name: string;
  account_role: "GENERAL" | "COMPANY" | "ADMIN";
};

type AdminCompany = { id: string; name: string };

type AdminApplication = {
  id: string;
  applicant_id: string;
  company_name: string;
  description: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
};

type AdminCase = { id: string; title: string; status: string; company_id: string };

const roleSchema = z.enum(["GENERAL", "COMPANY", "ADMIN"]);
const applicationStatusLabel = { PENDING: "審査中", APPROVED: "承認済み", REJECTED: "却下" } as const;
const caseStatusLabel: Record<string, string> = { DRAFT: "下書き", PUBLISHED: "公開", ARCHIVED: "非公開" };

export function loader() {
  return { users: [], companies: [], applications: [], posts: [] as AdminCase[] };
}

export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  await requireAuthorization(request, { role: "ADMIN" });
  const supabase = getSupabaseBrowserClient();
  const [usersResult, companiesResult, applicationsResult, casesResult] = await Promise.all([
    supabase.from("profiles").select("id, display_name, account_role").order("created_at", { ascending: false }),
    supabase.from("companies").select("id, name").order("name"),
    supabase.from("company_applications").select("id, applicant_id, company_name, description, status, created_at").order("created_at", { ascending: false }),
    supabase.from("construction_cases").select("id, title, status, company_id").order("updated_at", { ascending: false }),
  ]);

  for (const result of [usersResult, companiesResult, applicationsResult, casesResult]) {
    if (result.error) throw result.error;
  }

  const serverData = await serverLoader();
  return {
    ...serverData,
    users: (usersResult.data ?? []) as AdminUser[],
    companies: (companiesResult.data ?? []) as AdminCompany[],
    applications: (applicationsResult.data ?? []) as AdminApplication[],
    posts: (casesResult.data ?? []) as AdminCase[],
  };
}

clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return <ProtectedRouteFallback />;
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  await requireAuthorization(request, { role: "ADMIN" });
  const formData = await request.formData();
  const intent = formData.get("intent");
  const supabase = getSupabaseBrowserClient();

  if (intent === "set-role") {
    const role = roleSchema.safeParse(formData.get("accountRole"));
    const userId = formData.get("userId");
    const companyId = formData.get("companyId");
    if (!role.success || typeof userId !== "string" || !userId) {
      return data({ error: "アカウント情報を確認してください。" }, { status: 400 });
    }

    const { error } = await supabase.rpc("set_account_role", {
      target_user_id: userId,
      target_role: role.data,
      target_company_id: typeof companyId === "string" && companyId ? companyId : null,
    });
    return error ? { error: "アカウントロールを更新できませんでした。" } : { saved: true };
  }

  if (intent === "approve-application" || intent === "reject-application") {
    const applicationId = formData.get("applicationId");
    if (typeof applicationId !== "string" || !applicationId) {
      return data({ error: "申請を指定してください。" }, { status: 400 });
    }

    const rpc = intent === "approve-application" ? "approve_company_application" : "reject_company_application";
    const { error } = await supabase.rpc(rpc, { target_application_id: applicationId });
    return error ? { error: "企業申請を処理できませんでした。" } : { saved: true };
  }

  if (intent === "delete-case") {
    const caseId = formData.get("caseId");
    if (typeof caseId !== "string" || !caseId) {
      return data({ error: "施工事例を指定してください。" }, { status: 400 });
    }

    const { error } = await supabase.from("construction_cases").delete().eq("id", caseId);
    return error ? { error: "施工事例を削除できませんでした。" } : { saved: true };
  }

  return data({ error: "操作を指定してください。" }, { status: 400 });
}

export default function AdminDashboardRoute({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <DashboardLayout type="admin">
      <header className="page-heading">
        <h1>管理者ダッシュボード</h1>
        <p>ユーザー、企業申請、施工事例を管理します。</p>
      </header>
      {actionData && "saved" in actionData && actionData.saved ? <p className="success-message" role="status">更新しました。</p> : null}
      {actionData && "error" in actionData ? <p className="form-error" role="alert">{actionData.error}</p> : null}
      <section className="dashboard-section">
        <div className="section-header"><h2>ユーザー管理</h2></div>
        <div className="member-list">
          {loaderData.users.map((user) => (
            <div key={user.id}>
              <strong>{user.display_name}</strong><span>{user.id}</span>
              <InlineActionForm className="inline-form" successMessage="保存しました。">
                {({ pending }) => <>
                  <input type="hidden" name="intent" value="set-role" /><input type="hidden" name="userId" value={user.id} />
                  <select name="accountRole" defaultValue={user.account_role} aria-label={`${user.display_name}のアカウントロール`}><option value="GENERAL">一般</option><option value="COMPANY">企業</option><option value="ADMIN">管理者</option></select>
                  <select name="companyId" defaultValue="" aria-label={`${user.display_name}の所属企業`}><option value="">所属企業なし</option>{loaderData.companies.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select>
                  <PendingActionButton pending={pending} pendingLabel="保存中…">保存</PendingActionButton>
                </>}
              </InlineActionForm>
            </div>
          ))}
        </div>
      </section>
      <section className="dashboard-section">
        <div className="section-header"><h2>企業申請</h2></div>
        <div className="member-list">
          {loaderData.applications.length === 0 ? <p>申請はありません。</p> : loaderData.applications.map((application) => (
            <div key={application.id}>
              <strong>{application.company_name}</strong><span>{application.description || "企業紹介未入力"}</span><small>{applicationStatusLabel[application.status]}</small>
              {application.status === "PENDING" ? (
                <div className="form-actions">
                  <InlineActionForm>{({ pending }) => <><input type="hidden" name="intent" value="approve-application" /><input type="hidden" name="applicationId" value={application.id} /><PendingActionButton pending={pending} pendingLabel="承認中…">承認</PendingActionButton></>}</InlineActionForm>
                  <InlineActionForm confirmMessage={`「${application.company_name}」の申請を却下しますか？`}>
                    {({ pending }) => <><input type="hidden" name="intent" value="reject-application" /><input type="hidden" name="applicationId" value={application.id} /><PendingActionButton pending={pending} pendingLabel="却下中…" variant="secondary">却下</PendingActionButton></>}
                  </InlineActionForm>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>
      <section className="dashboard-section">
        <div className="section-header"><h2>施工事例管理</h2><Link to="/search">公開一覧を見る</Link></div>
        <div className="member-list">
          {loaderData.posts.map((post) => (
            <div key={post.id}><strong>{post.title}</strong><span>{caseStatusLabel[post.status] ?? post.status}</span><Link to={`/admin/cases/${post.id}/edit`}>編集</Link><InlineActionForm confirmMessage={`「${post.title}」を削除しますか？この操作は取り消せません。`}>{({ pending }) => <><input type="hidden" name="intent" value="delete-case" /><input type="hidden" name="caseId" value={post.id} /><PendingActionButton pending={pending} pendingLabel="削除中…" variant="danger">削除</PendingActionButton></>}</InlineActionForm></div>
          ))}
        </div>
      </section>
    </DashboardLayout>
  );
}

export function meta() { return [{ title: "管理者ダッシュボード | 飯塚のリノベ" }]; }
