import ui from "../ui.module.css";
import type { Route } from "./+types/contact";
import { data, Link } from "react-router";
import { useState } from "react";
import { z } from "zod";
import { ManagedForm, SubmitButton } from "../features/forms/managed-form";
import { validationErrors } from "../features/forms/validation";
import { Field } from "../components/molecules";
import { PublicLayout } from "../components/templates/public-layout";
import { fetchPublishedCompanyContacts, fetchCaseById } from "../features/cases/public-data.client";
import { createContactMessage } from "../features/contact/messages.server";
import type { CaseStudy } from "../features/cases/types";
import { StorageImage } from "../features/media/storage-image";
import { PublicRouteFallback } from "../components/templates/public-route-fallback";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.email(),
  companyId: z.uuid(),
  caseId: z.uuid().optional(),
  subject: z.enum(["renovation", "company", "other"]),
  message: z.string().trim().min(10).max(2000),
});

type PublicCompany = { id: string; name: string };

export function meta() { return [{ title: "お問い合わせ | 飯塚のリノベ" }]; }

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  return {
    selectedCase: null as CaseStudy | null,
    companies: [] as Array<{ id: string; name: string }>,
    selectedCompanyId: url.searchParams.get("companyId") ?? "",
    caseId: url.searchParams.get("caseId") ?? "",
  };
}

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  const [serverData, companies] = await Promise.all([serverLoader(), fetchPublishedCompanyContacts()]);
  const selectedCase = serverData.caseId ? await fetchCaseById(serverData.caseId).catch(() => null) : null;
  return { ...serverData, companies, selectedCase: selectedCase?.companyId === serverData.selectedCompanyId ? selectedCase : null };
}

clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return <PublicRouteFallback label="お問い合わせ先を読み込んでいます…" />;
}

async function findCompany(companyId: string): Promise<PublicCompany | null> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  const endpoint = new URL(`${supabaseUrl}/rest/v1/companies`);
  endpoint.searchParams.set("select", "id,name");
  endpoint.searchParams.set("id", `eq.${companyId}`);
  endpoint.searchParams.set("status", "neq.SUSPENDED");
  const response = await fetch(endpoint, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });
  if (!response.ok) return null;
  const companies = await response.json() as PublicCompany[];
  return companies[0] ?? null;
}

const subjectLabels = {
  renovation: "リノベーション・施工について",
  company: "掲載企業について",
  other: "その他",
} as const;

export async function action({ request }: Route.ActionArgs) {
  const result = contactSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!result.success) {
    return data(
      { sent: false, error: "入力内容を確認してください。", fieldErrors: validationErrors(result.error) },
      { status: 400 },
    );
  }

  const company = await findCompany(result.data.companyId);
  if (!company) {
    return data({ sent: false, error: "選択した企業が見つかりません。", fieldErrors: { companyId: "問い合わせ先の企業を選び直してください。" } }, { status: 400 });
  }

  const messageError = await createContactMessage({
    companyId: result.data.companyId,
    senderName: result.data.name,
    senderEmail: result.data.email,
    subject: subjectLabels[result.data.subject],
    message: result.data.message,
    caseId: result.data.caseId,
  });
  if (messageError) return data({ sent: false, error: messageError }, { status: 500 });
  return data({ sent: true, error: "" });
}

export default function ContactRoute({ loaderData, actionData }: Route.ComponentProps) {
  const [selection, setSelection] = useState({ source: loaderData.selectedCompanyId, value: loaderData.selectedCompanyId });
  const selectedCompanyId = selection.source === loaderData.selectedCompanyId ? selection.value : loaderData.selectedCompanyId;
  const selectedCase = loaderData.selectedCase?.companyId === selectedCompanyId ? loaderData.selectedCase : null;

  return (
    <PublicLayout>
      <div className={ui["public-page"] + " " + ui["contact-page"]}>
        <header className={ui["contact-heading"]}>
          <h1>お問い合わせ</h1>
          <p>施工や見積もりのご相談を、選択した企業へ直接送信します。</p>
        </header>

        <section className={ui["contact-panel"]} aria-label="お問い合わせフォーム">
          {loaderData.companies.length === 0 ? (
            <div className={ui["empty-state"] + " " + ui["empty-state--compact"]}>
              <h2>現在問い合わせできる企業がありません</h2>
              <p>企業の公開後に問い合わせできます。施工事例や企業情報は引き続きご覧いただけます。</p>
              <Link className={ui["button"] + " " + ui["button--secondary"]} to="/companies">企業一覧を見る</Link>
            </div>
          ) : actionData?.sent ? (
            <div className={ui["form-success"]} role="status">
              お問い合わせを送信しました。企業からの返信をお待ちください。
            </div>
          ) : (
            <ManagedForm protect method="post" className={ui["contact-form"]}>
              {actionData?.error ? <p className={ui["form-error"]} role="alert">{actionData.error}</p> : null}
              <Field label="お問い合わせ先企業">
                <select name="companyId" value={selectedCompanyId} onChange={(event) => setSelection({ source: loaderData.selectedCompanyId, value: event.target.value })} required>
                  <option value="">企業を選択してください</option>
                  {loaderData.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                </select>
              </Field>
              {selectedCase ? <div className={ui["contact-case"]}>
                <input type="hidden" name="caseId" value={selectedCase.id} />
                {selectedCase.image ? <StorageImage width={120} height={90} src={selectedCase.image} storagePath={selectedCase.imagePath} bucket="case-images" alt="" /> : null}
                <div><span>この事例について相談</span><Link to={`/cases/${selectedCase.id}`}>{selectedCase.title}</Link><p>費用目安：{selectedCase.price}</p></div>
              </div> : null}
              <Field label="お名前">
                <input name="name" autoComplete="name" required maxLength={80} />
              </Field>
              <Field label="メールアドレス">
                <input type="email" name="email" autoComplete="email" spellCheck={false} required />
              </Field>
              <Field label="お問い合わせ種別">
                <select name="subject" defaultValue="renovation" required>
                  <option value="renovation">リノベーション・施工について</option>
                  <option value="company">掲載企業について</option>
                  <option value="other">その他（選択した企業へのご相談）</option>
                </select>
              </Field>
              <Field label="お問い合わせ内容" hint="直したい場所、現在困っていること、希望時期などをお書きください。まだ決まっていない項目は省略できます（10〜2,000文字）。">
                <textarea name="message" required minLength={10} maxLength={2000} placeholder="例：キッチンの収納が足りず、改修を考えています。まずは工事の範囲や費用を相談したいです。" />
              </Field>
              <SubmitButton pendingLabel="送信中…">送信する</SubmitButton>
              <p className={ui["form-hint"]}>送信内容は選択した企業へ共有され、入力したメールアドレス宛てに返信されます。</p>
            </ManagedForm>
          )}
        </section>



      </div>
    </PublicLayout>
  );
}
