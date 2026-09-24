import type { Route } from "./+types/company-profile-edit";
import { Camera, Plus } from "lucide-react";
import { data, Form } from "react-router";
import { z } from "zod";
import { Button, Tag } from "../components/atoms";
import { Field } from "../components/molecules";
import { DashboardLayout } from "../components/templates";
import { requireAuthorization } from "../features/auth/authorization.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";
import { getAuthorizationContext } from "../features/auth/authorization.client";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../lib/supabase.client";
import type { CompanyProfile } from "../features/cases/types";

const profileSchema = z.object({
  name: z.string().trim().min(1).max(120),
  founded: z.string().trim(),
  phone: z.string().trim().max(40),
  website: z.url().or(z.literal("")),
  address: z.string().trim().max(200),
  businessHours: z.string().trim().max(120),
  description: z.string().trim().max(2000),
});

export function loader() {
  return { company: null as CompanyProfile | null };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  await requireAuthorization(request, { role: "COMPANY", companyRoles: ["OWNER", "ADMIN"] });
  const result = profileSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!result.success) return data({ error: "入力内容を確認してください。" }, { status: 400 });

  if (isSupabaseConfigured()) {
    const context = await getAuthorizationContext();
    const companyId = context?.memberships[0]?.companyId;
    if (companyId) {
      const foundedYear = result.data.founded.replace(/[^0-9]/g, "");
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("companies").update({
        name: result.data.name,
        founded_year: foundedYear ? Number(foundedYear) : null,
        phone: result.data.phone,
        website_url: result.data.website || null,
        address: result.data.address,
        business_hours: result.data.businessHours,
        description: result.data.description,
      }).eq("id", companyId);
      if (error) return data({ error: "企業情報を保存できませんでした。" }, { status: 400 });
    }
  }

  return data({ saved: true });
}

export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  await requireAuthorization(request, { role: "COMPANY", companyRoles: ["OWNER", "ADMIN"] });
  const serverData = await serverLoader();
  if (!isSupabaseConfigured()) return serverData;

  const context = await getAuthorizationContext();
  const companyId = context?.memberships[0]?.companyId;
  if (!companyId) return serverData;

  const supabase = getSupabaseBrowserClient();
  const { data: record, error } = await supabase.from("companies")
    .select("name, founded_year, phone, website_url, address, business_hours, description")
    .eq("id", companyId)
    .maybeSingle();
  if (error) throw error;
  if (!record) return serverData;

  return {
    ...serverData,
    company: {
      ...(serverData.company ?? {
        id: companyId,
        image: "",
        features: [],
      }),
      name: record.name,
      founded: record.founded_year ? `${record.founded_year}年` : "",
      phone: record.phone,
      website: record.website_url ?? "",
      address: record.address,
      businessHours: record.business_hours,
      description: record.description,
    },
  };
}

clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return <ProtectedRouteFallback />;
}

export default function CompanyProfileEditRoute({ loaderData, actionData }: Route.ComponentProps) {
  if (!loaderData.company) return <DashboardLayout type="company"><div className="empty-state"><h1>企業情報が見つかりません</h1></div></DashboardLayout>;

  return (
    <DashboardLayout type="company">
      <header className="page-heading"><h1>企業情報の編集</h1></header>
      {actionData && "saved" in actionData && actionData.saved ? <p className="success-message" role="status">企業情報を保存しました。</p> : null}
      {actionData && "error" in actionData ? <p className="form-error" role="alert">{actionData.error}</p> : null}
      <Form method="post" className="edit-form">
        <section className="company-media-fields">
          <button type="button" className="media-placeholder"><Plus /><span>メイン画像を追加</span></button>
          <button type="button" className="media-placeholder"><Camera /><span>ロゴ画像を追加</span></button>
        </section>
        <section className="form-card">
          <h2>企業情報</h2>
          <div className="form-grid">
            <Field label="企業名"><input name="name" defaultValue={loaderData.company.name} /></Field>
            <Field label="設立年"><input name="founded" defaultValue={loaderData.company.founded} /></Field>
            <Field label="電話番号"><input name="phone" defaultValue={loaderData.company.phone} /></Field>
            <Field label="ホームページ"><input name="website" defaultValue={loaderData.company.website} /></Field>
            <Field label="所在地"><input name="address" defaultValue={loaderData.company.address} /></Field>
            <Field label="営業時間"><input name="businessHours" defaultValue={loaderData.company.businessHours} /></Field>
          </div>
          <Field label="企業紹介"><textarea name="description" rows={3} defaultValue={loaderData.company.description} /></Field>
          <div className="feature-editor"><span>アピールポイント</span>{loaderData.company.features.map((feature) => <Tag key={feature}>{feature}</Tag>)}<button type="button"><Plus size={14} />追加</button></div>
          <div className="form-actions"><Button type="submit">更新する</Button></div>
        </section>
      </Form>
    </DashboardLayout>
  );
}
