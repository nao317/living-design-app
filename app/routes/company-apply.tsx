import type { Route } from "./+types/company-apply";
import { data, Form } from "react-router";
import { z } from "zod";
import { Button } from "../components/atoms";
import { Field } from "../components/molecules";
import { DashboardLayout } from "../components/templates";
import { requireAuthorization } from "../features/auth/authorization.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";
import { getSupabaseBrowserClient } from "../lib/supabase.client";

const applicationSchema = z.object({
  companyName: z.string().trim().min(1, "企業名を入力してください。").max(120),
  description: z.string().trim().max(2000),
  address: z.string().trim().max(200),
  phone: z.string().trim().max(40),
  websiteUrl: z.url().or(z.literal("")),
});

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  await requireAuthorization(request, { role: "GENERAL" });
  return null;
}

clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return <ProtectedRouteFallback />;
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const context = await requireAuthorization(request, { role: "GENERAL" });
  const values = Object.fromEntries(await request.formData());
  const result = applicationSchema.safeParse(values);

  if (!result.success) {
    return data({ error: result.error.issues[0]?.message ?? "入力内容を確認してください。" }, { status: 400 });
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("company_applications").insert({
    applicant_id: context.userId,
    company_name: result.data.companyName,
    description: result.data.description,
    address: result.data.address,
    phone: result.data.phone,
    website_url: result.data.websiteUrl || null,
  });

  if (error) {
    return { error: error.code === "23505" ? "申請済みの企業申請があります。" : "申請を送信できませんでした。" };
  }

  return { submitted: true };
}

export default function CompanyApplyRoute({ actionData }: Route.ComponentProps) {
  return (
    <DashboardLayout>
      <header className="page-heading">
        <h1>企業アカウントを申請</h1>
        <p>管理者の承認後、施工事例の投稿と自社情報の編集ができるようになります。</p>
      </header>
      {actionData && "submitted" in actionData && actionData.submitted ? <p className="success-message" role="status">企業申請を受け付けました。</p> : null}
      {actionData && "error" in actionData ? <p className="form-error" role="alert">{actionData.error}</p> : null}
      {!(actionData && "submitted" in actionData && actionData.submitted) ? (
        <Form method="post" className="edit-form">
          <section className="form-card">
            <div className="form-grid">
              <Field label="企業名"><input name="companyName" required maxLength={120} /></Field>
              <Field label="所在地"><input name="address" maxLength={200} /></Field>
              <Field label="電話番号"><input name="phone" maxLength={40} /></Field>
              <Field label="ホームページ"><input name="websiteUrl" type="url" /></Field>
            </div>
            <Field label="企業紹介"><textarea name="description" rows={5} maxLength={2000} /></Field>
            <div className="form-actions"><Button type="submit">申請する</Button></div>
          </section>
        </Form>
      ) : null}
    </DashboardLayout>
  );
}
