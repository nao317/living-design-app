import type { Route } from "./+types/contact";
import { data, Form, Link, useNavigation } from "react-router";
import { z } from "zod";
import { Button } from "../components/atoms";
import { Field } from "../components/molecules";
import { PublicLayout } from "../components/templates";
import { fetchPublishedCompanyContacts } from "../features/cases/public-data.client";
import { sendContactEmail } from "../features/contact/email.server";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.email(),
  companyId: z.uuid(),
  caseId: z.string().trim().optional(),
  subject: z.enum(["renovation", "company", "account", "other"]),
  message: z.string().trim().min(10).max(2000),
});

type PublicCompany = { id: string; name: string; email: string };

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  return {
    companies: [] as Array<{ id: string; name: string; hasEmail: boolean }>,
    selectedCompanyId: url.searchParams.get("companyId") ?? "",
    caseId: url.searchParams.get("caseId") ?? "",
  };
}

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  const serverData = await serverLoader();
  return {
    ...serverData,
    companies: await fetchPublishedCompanyContacts(),
  };
}

clientLoader.hydrate = true as const;

async function findCompany(companyId: string): Promise<PublicCompany | null> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  const endpoint = new URL(`${supabaseUrl}/rest/v1/companies`);
  endpoint.searchParams.set("select", "id,name,email");
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
  account: "会員登録・アカウントについて",
  other: "その他",
} as const;

export async function action({ request }: Route.ActionArgs) {
  const result = contactSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!result.success) {
    return data(
      { sent: false, error: "入力内容を確認してください。企業の選択とお問い合わせ内容は必須です。" },
      { status: 400 },
    );
  }

  const company = await findCompany(result.data.companyId);
  if (!company?.email) {
    return data({ sent: false, error: "選択した企業の問い合わせ先メールアドレスが登録されていません。" }, { status: 400 });
  }

  const emailError = await sendContactEmail({
    to: company.email,
    companyName: company.name,
    senderName: result.data.name,
    senderEmail: result.data.email,
    subject: subjectLabels[result.data.subject],
    message: result.data.message,
    caseId: result.data.caseId,
  });
  if (emailError) return data({ sent: false, error: emailError }, { status: 500 });
  return data({ sent: true, error: "" });
}

export default function ContactRoute({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";

  return (
    <PublicLayout>
      <div className="public-page contact-page">
        <header className="contact-heading">
          <h1>お問い合わせ</h1>
          <p>施工のご相談、掲載企業、会員登録についてなど、お気軽にお問い合わせください。</p>
        </header>

        <section className="contact-panel" aria-label="お問い合わせフォーム">
          {actionData?.sent ? (
            <div className="form-success" role="status">
              お問い合わせを受け付けました。選択した企業へ送信しました。
            </div>
          ) : (
            <Form method="post" className="contact-form">
              {actionData?.error ? <p className="form-error" role="alert">{actionData.error}</p> : null}
              <Field label="お問い合わせ先企業">
                <select name="companyId" defaultValue={loaderData.selectedCompanyId} required>
                  <option value="">企業を選択してください</option>
                  {loaderData.companies.map((company) => <option key={company.id} value={company.id} disabled={!company.hasEmail}>{company.name}{company.hasEmail ? "" : "（メール未登録）"}</option>)}
                </select>
              </Field>
              {loaderData.caseId ? <input type="hidden" name="caseId" value={loaderData.caseId} /> : null}
              <Field label="お名前">
                <input name="name" autoComplete="name" required maxLength={80} />
              </Field>
              <Field label="メールアドレス">
                <input type="email" name="email" autoComplete="email" required />
              </Field>
              <Field label="お問い合わせ種別">
                <select name="subject" defaultValue="renovation" required>
                  <option value="renovation">リノベーション・施工について</option>
                  <option value="company">掲載企業について</option>
                  <option value="account">会員登録・アカウントについて</option>
                  <option value="other">その他</option>
                </select>
              </Field>
              <Field label="お問い合わせ内容" hint="10文字以上、2,000文字以内で入力してください。">
                <textarea name="message" required minLength={10} maxLength={2000} />
              </Field>
              <Button type="submit" disabled={submitting || loaderData.companies.length === 0}>
                {submitting ? "送信中…" : "送信する"}
              </Button>
              {loaderData.companies.length === 0 ? <p className="form-error" role="alert">問い合わせ可能な企業が登録されていません。</p> : null}
            </Form>
          )}
        </section>

        <section className="contact-guidance">
          <h2>企業へ直接相談したい方</h2>
          <p>
            <Link to="/companies">企業を探す</Link>
            から企業を選ぶと、問い合わせ先を指定できます。
          </p>
        </section>
      </div>
    </PublicLayout>
  );
}
