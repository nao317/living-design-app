import { data, Form, Link } from "react-router";
import { z } from "zod";
import { Avatar } from "../components/atoms";
import { CaseGrid } from "../components/organisms";
import { DashboardLayout } from "../components/templates";
import type { Route } from "./+types/company-dashboard";
import { getAuthorizationContext, requireAuthorization } from "../features/auth/authorization.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";
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
  await requireAuthorization(request, { role: "COMPANY" });
  const formData = await request.formData();
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

export default function CompanyDashboardRoute({ loaderData }: { loaderData: ReturnType<typeof loader> }) {
  if (!loaderData.company) return <DashboardLayout type="company"><div className="empty-state"><h1>企業情報が見つかりません</h1></div></DashboardLayout>;

  return (
    <DashboardLayout type="company">
      <header className="company-summary">
        <div>
          <p>{loaderData.company.name}</p>
          <h1>{loaderData.company.description}</h1>
          <Link className="button button--secondary" to="/company/profile/edit">企業情報を編集</Link>
        </div>
        {loaderData.company.image ? <img src={loaderData.company.image} alt={loaderData.company.name} /> : <div className="image-empty">企業画像未登録</div>}
      </header>
      <section className="dashboard-section">
        <div className="section-header"><h2>施工事例</h2><Link to="/company/cases/new">施工事例を追加</Link></div>
        <CaseGrid items={loaderData.cases} />
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
