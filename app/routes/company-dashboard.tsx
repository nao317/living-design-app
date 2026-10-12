import { data, Form, Link } from "react-router";
import { z } from "zod";
import { Avatar, Button } from "../components/atoms";
import { CaseCard } from "../components/molecules";
import { DashboardLayout } from "../components/templates";
import type { Route } from "./+types/company-dashboard";
import { getAuthorizationContext, requireAuthorization } from "../features/auth/authorization.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";
import { StorageImage } from "../features/media/storage-image";
import { removeImages } from "../features/media/image-storage.client";
import { fetchManagedCompany } from "../features/cases/public-data.client";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../lib/supabase.client";
import type { CaseStudy, CompanyMember, CompanyProfile, ContactMessage } from "../features/cases/types";

export function loader() {
  return { company: null as CompanyProfile | null, cases: [] as CaseStudy[], members: [] as CompanyMember[], messages: [] as ContactMessage[] };
}

export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  await requireAuthorization(request, { role: "COMPANY" });
  const context = await getAuthorizationContext();
  const companyId = context?.memberships[0]?.companyId;
  const managed = companyId ? await fetchManagedCompany(companyId) : null;
  return { ...(await serverLoader()), ...(managed ?? {}) };
}

clientLoader.hydrate = true as const;

export async function clientAction({ request }: Route.ClientActionArgs) {
  const context = await requireAuthorization(request, { role: "COMPANY" });
  const formData = await request.formData();
  if (formData.get("intent") === "delete-case") {
    const caseId = z.uuid().safeParse(formData.get("caseId"));
    if (!caseId.success || !isSupabaseConfigured()) return data({ error: "削除する施工事例を指定してください。" }, { status: 400 });

    const supabase = getSupabaseBrowserClient();
    const { data: targetCase, error: caseError } = await supabase.from("construction_cases")
      .select("id, company_id, title")
      .eq("id", caseId.data)
      .maybeSingle();
    if (caseError || !targetCase || !context.memberships.some((membership) => membership.companyId === targetCase.company_id)) {
      return data({ error: "この施工事例は削除できません。" }, { status: 403 });
    }

    const { data: imageRows, error: imageError } = await supabase.from("case_images")
      .select("storage_path")
      .eq("case_id", caseId.data);
    if (imageError) return data({ error: "施工写真を確認できませんでした。" }, { status: 400 });
    const storageError = await removeImages("case-images", (imageRows ?? []).map((image) => image.storage_path));
    if (storageError) return data({ error: "施工写真を削除できませんでした。" }, { status: 400 });

    const { data: deletedCase, error: deleteError } = await supabase.from("construction_cases")
      .delete()
      .eq("id", caseId.data)
      .eq("company_id", targetCase.company_id)
      .select("id")
      .maybeSingle();
    if (deleteError || !deletedCase) return data({ error: "施工事例を削除できませんでした。" }, { status: 400 });
    return data({ deleted: true, title: targetCase.title });
  }

  if (formData.get("intent") !== "mark-read") return data({ error: "不正な操作です。" }, { status: 400 });

  const messageId = z.uuid().safeParse(formData.get("messageId"));
  if (!messageId.success || !isSupabaseConfigured()) return data({ error: "お問い合わせを更新できませんでした。" }, { status: 400 });

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("mark_contact_message_read", { target_message_id: messageId.data });
  if (error) return data({ error: "お問い合わせを更新できませんでした。" }, { status: 400 });
  return data({ saved: true });
}

export function HydrateFallback() {
  return <ProtectedRouteFallback />;
}

export default function CompanyDashboardRoute({ loaderData, actionData }: Route.ComponentProps) {
  if (!loaderData.company) return <DashboardLayout type="company"><div className="empty-state"><h1>企業情報が見つかりません</h1></div></DashboardLayout>;

  return (
    <DashboardLayout type="company">
      <header className="company-summary">
        <div>
          <p>{loaderData.company.name}</p>
          <h1>{loaderData.company.description}</h1>
          <Link className="button button--secondary" to="/company/profile/edit">企業情報を編集</Link>
        </div>
        {loaderData.company.image ? <StorageImage src={loaderData.company.image} storagePath={loaderData.company.imagePath} bucket="company-assets" alt={loaderData.company.name} /> : <div className="image-empty">企業画像未登録</div>}
      </header>
      <section className="dashboard-section">
        <div className="section-header"><h2>施工事例</h2><Link to="/company/cases/new">施工事例を追加</Link></div>
        {actionData && "deleted" in actionData && actionData.deleted ? <p className="success-message" role="status">「{actionData.title}」を削除しました。</p> : null}
        {actionData && "error" in actionData ? <p className="form-error" role="alert">{actionData.error}</p> : null}
        {loaderData.cases.length ? <div className="case-grid">
          {loaderData.cases.map((item) => <div className="managed-case" key={item.id}>
            <CaseCard item={item} />
            <div className="managed-case__actions">
              <Link className="button button--secondary" to={`/company/cases/${item.id}/edit`}>編集</Link>
              <Form method="post" onSubmit={(event) => {
                if (!window.confirm(`「${item.title}」を削除しますか？この操作は取り消せません。`)) event.preventDefault();
              }}>
                <input type="hidden" name="intent" value="delete-case" />
                <input type="hidden" name="caseId" value={item.id} />
                <Button type="submit" variant="danger">削除</Button>
              </Form>
            </div>
          </div>)}
        </div> : <div className="empty-state"><p>施工事例はまだありません。</p></div>}
      </section>
      <section className="dashboard-section">
        <div className="section-header">
          <h2>お問い合わせ{loaderData.messages.some((message) => message.status === "NEW") ? `（未読 ${loaderData.messages.filter((message) => message.status === "NEW").length}件）` : ""}</h2>
        </div>
        {loaderData.messages.length ? (
          <div className="contact-message-list">
            {loaderData.messages.map((message) => (
              <article className={`contact-message${message.status === "NEW" ? " contact-message--unread" : ""}`} key={message.id}>
                <div className="contact-message__header">
                  <div>
                    <strong>{message.subject}</strong>
                    <span>{new Date(message.createdAt).toLocaleString("ja-JP")}</span>
                  </div>
                  {message.status === "NEW" ? (
                    <Form method="post">
                      <input type="hidden" name="intent" value="mark-read" />
                      <input type="hidden" name="messageId" value={message.id} />
                      <button className="button button--ghost" type="submit">既読にする</button>
                    </Form>
                  ) : <span className="contact-message__status">既読</span>}
                </div>
                <dl className="contact-message__sender">
                  <div><dt>お名前</dt><dd>{message.senderName}</dd></div>
                  <div><dt>メールアドレス</dt><dd>{message.senderEmail}</dd></div>
                </dl>
                <p>{message.message}</p>
                {message.caseId ? <Link to={`/cases/${message.caseId}`}>関連する施工事例を見る</Link> : null}
              </article>
            ))}
          </div>
        ) : <div className="empty-state"><p>お問い合わせはまだありません。</p></div>}
      </section>
      <section className="dashboard-section">
        <div className="section-header"><h2>所属ユーザー</h2></div>
        <div className="member-list">
          {loaderData.members.map((member) => (
            <div key={member.id}><Avatar name={member.name} /><strong>{member.name}</strong><span>{member.email}</span><small>{member.role}</small></div>
          ))}
        </div>
      </section>
    </DashboardLayout>
  );
}
