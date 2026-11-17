import ui from "../ui.module.css";
import { data, Link } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/company-messages";
import { StatusBadge } from "../components/atoms";
import { EmptyState, PageHeader, Pagination } from "../components/molecules";
import { DashboardLayout } from "../components/templates/dashboard-layout";
import { requireAuthorization } from "../features/auth/authorization.client";
import { getActiveCompanyId } from "../features/auth/company-selection.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";
import { InlineActionForm, PendingActionButton } from "../features/forms/inline-action-form";
import { loadPage, parsePage } from "../features/pagination/pagination";
import { getSupabaseBrowserClient } from "../lib/supabase.client";

type Message = { id: string; sender_name: string; sender_email: string; subject: string; message: string; case_id: string | null; status: "NEW" | "READ" | "ARCHIVED"; created_at: string };
const pageSize = 10;
export function loader() { return { items: [] as Message[], total: 0, page: 1, unreadOnly: false }; }
export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  const context = await requireAuthorization(request, { role: "COMPANY" });
  const companyId = getActiveCompanyId(context);
  const params = new URL(request.url).searchParams;
  const page = parsePage(params);
  const unreadOnly = params.get("status") === "NEW";
  if (!companyId) return { ...(await serverLoader()), items: [], total: 0, page: 1 };
  const result = await loadPage<Message>(page, pageSize, (from, to) => {
    let query = getSupabaseBrowserClient().from("contact_messages").select("id, sender_name, sender_email, subject, message, case_id, status, created_at", { count: "exact" }).eq("company_id", companyId);
    if (unreadOnly) query = query.eq("status", "NEW");
    return query.order("created_at", { ascending: false }).range(from, to);
  });
  return { ...(await serverLoader()), items: result.items, total: result.total, page: result.page, unreadOnly };
}
clientLoader.hydrate = true as const;
export function HydrateFallback() { return <ProtectedRouteFallback />; }
export async function clientAction({ request }: Route.ClientActionArgs) {
  await requireAuthorization(request, { role: "COMPANY" });
  const messageId = z.uuid().safeParse((await request.formData()).get("messageId"));
  if (!messageId.success) return data({ error: "お問い合わせを更新できませんでした。" }, { status: 400 });
  const { error } = await getSupabaseBrowserClient().rpc("mark_contact_message_read", { target_message_id: messageId.data });
  return error ? data({ error: "お問い合わせを更新できませんでした。" }, { status: 400 }) : { saved: true };
}
export default function CompanyMessagesRoute({ loaderData, actionData }: Route.ComponentProps) {
  return <DashboardLayout type="company"><PageHeader title="お問い合わせ" description="利用者から届いた相談内容を新しい順に表示します。" />
    {actionData && "error" in actionData ? <p className={ui["form-error"]} role="alert">{actionData.error}</p> : null}
    <nav className={ui["message-tabs"]} aria-label="お問い合わせの表示"><Link to="/company/messages" aria-current={!loaderData.unreadOnly ? "page" : undefined}>すべて</Link><Link to="/company/messages?status=NEW" aria-current={loaderData.unreadOnly ? "page" : undefined}>未読のみ</Link></nav>
    {loaderData.items.length ? <div className={ui["contact-message-list"]}>{loaderData.items.map((message) => <article id={`message-${message.id}`} className={`${ui["contact-message"]} ${message.status === "NEW" ? ui["contact-message--unread"] : ""}`} key={message.id}><div className={ui["contact-message__header"]}><div><strong>{message.subject}</strong><span>{new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(message.created_at))}</span></div>{message.status === "NEW" ? <InlineActionForm>{({ pending }) => <><input type="hidden" name="messageId" value={message.id} /><PendingActionButton pending={pending} pendingLabel="更新中…" variant="ghost">既読にする</PendingActionButton></>}</InlineActionForm> : <StatusBadge>既読</StatusBadge>}</div><dl className={ui["contact-message__sender"]}><div><dt>お名前</dt><dd>{message.sender_name}</dd></div><div><dt>メール</dt><dd><a href={`mailto:${message.sender_email}`}>{message.sender_email}</a></dd></div></dl><p>{message.message}</p>{message.case_id ? <Link to={`/cases/${message.case_id}`}>関連する施工事例を見る</Link> : null}</article>)}</div> : <EmptyState title={loaderData.unreadOnly ? "未読のお問い合わせはありません" : "お問い合わせはまだありません"} description={loaderData.unreadOnly ? undefined : "新しいお問い合わせが届くと、ここに表示されます。"} />}
    <Pagination totalItems={loaderData.total} currentPage={loaderData.page} pageSize={pageSize} />
  </DashboardLayout>;
}
export function meta() { return [{ title: "お問い合わせ | 企業管理 | 飯塚のリノベ" }]; }
