import type { Route } from "./+types/company-case-new";
import { data, Form } from "react-router";
import { z } from "zod";
import { Button } from "../components/atoms";
import { Field } from "../components/molecules";
import { DashboardLayout } from "../components/templates";
import { requireAuthorization, getAuthorizationContext } from "../features/auth/authorization.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../lib/supabase.client";

const caseSchema = z.object({
  title: z.string().trim().min(1, "タイトルを入力してください。").max(160),
  summary: z.string().trim().max(2000),
  area: z.string().trim().max(120),
  period: z.string().trim().max(120),
  priceMin: z.string().trim(),
  priceMax: z.string().trim(),
});

function parsePrice(value: string) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

export function loader() {
  return null;
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  await requireAuthorization(request, { role: "COMPANY" });
  return null;
}

clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return <ProtectedRouteFallback />;
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const context = await requireAuthorization(request, { role: "COMPANY" });
  const result = caseSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!result.success || parsePrice(result.data.priceMin) === undefined || parsePrice(result.data.priceMax) === undefined) {
    return data({ error: "入力内容を確認してください。" }, { status: 400 });
  }

  if (isSupabaseConfigured()) {
    const authorization = await getAuthorizationContext();
    const companyId = authorization?.memberships[0]?.companyId;
    if (!companyId) return data({ error: "所属企業が見つかりません。" }, { status: 400 });

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("construction_cases").insert({
      company_id: companyId,
      created_by: context.userId,
      title: result.data.title,
      summary: result.data.summary,
      area: result.data.area,
      construction_period: result.data.period,
      price_min: parsePrice(result.data.priceMin),
      price_max: parsePrice(result.data.priceMax),
      status: "DRAFT",
    });
    if (error) return data({ error: "施工事例を登録できませんでした。" }, { status: 400 });
  }

  return data({ saved: true });
}

export default function CompanyCaseNewRoute({ actionData }: Route.ComponentProps) {
  return (
    <DashboardLayout type="company">
      <header className="page-heading"><h1>施工事例の追加</h1><p>自社の施工事例を登録します。</p></header>
      {actionData && "saved" in actionData && actionData.saved ? <p className="success-message" role="status">施工事例を登録しました。</p> : null}
      {actionData && "error" in actionData ? <p className="form-error" role="alert">{actionData.error}</p> : null}
      <Form method="post" className="edit-form">
        <section className="form-card">
          <div className="form-grid">
            <Field label="タイトル"><input name="title" required maxLength={160} /></Field>
            <Field label="施工地域"><input name="area" maxLength={120} /></Field>
            <Field label="施工期間"><input name="period" maxLength={120} /></Field>
            <Field label="費用下限"><input name="priceMin" type="number" min="0" inputMode="numeric" /></Field>
            <Field label="費用上限"><input name="priceMax" type="number" min="0" inputMode="numeric" /></Field>
          </div>
          <Field label="概要"><textarea name="summary" rows={5} maxLength={2000} /></Field>
          <div className="form-actions"><Button type="submit">登録する</Button></div>
        </section>
      </Form>
    </DashboardLayout>
  );
}
