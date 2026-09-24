import type { Route } from "./+types/company-case-edit";
import { ImagePlus, Plus } from "lucide-react";
import { data, Form, useLocation } from "react-router";
import { z } from "zod";
import { Button, Tag } from "../components/atoms";
import { Field } from "../components/molecules";
import { DashboardLayout } from "../components/templates";
import { cases, images } from "../data/mock";
import { requireAuthorization } from "../features/auth/authorization.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../lib/supabase.client";

const caseSchema = z.object({
  title: z.string().trim().min(1).max(160),
  area: z.string().trim().max(120),
  period: z.string().trim().max(120),
  summary: z.string().trim().max(2000),
});

export function loader({ params }: Route.LoaderArgs) {
  return { item: cases.find((entry) => entry.id === params.caseId) ?? cases[0] };
}

export async function clientAction({ request, params }: Route.ClientActionArgs) {
  await requireAuthorization(request, { roles: ["COMPANY", "ADMIN"] });
  const result = caseSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!result.success) return data({ error: "入力内容を確認してください。" }, { status: 400 });
  if (isSupabaseConfigured() && params.caseId) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("construction_cases").update({
      title: result.data.title,
      area: result.data.area,
      construction_period: result.data.period,
      summary: result.data.summary,
    }).eq("id", params.caseId);
    if (error) return data({ error: "施工事例を保存できませんでした。" }, { status: 400 });
  }
  return data({ saved: true });
}

export async function clientLoader({ request, params, serverLoader }: Route.ClientLoaderArgs) {
  await requireAuthorization(request, { roles: ["COMPANY", "ADMIN"] });
  const serverData = await serverLoader();
  if (!isSupabaseConfigured() || !params.caseId) return serverData;

  const supabase = getSupabaseBrowserClient();
  const { data: item, error } = await supabase.from("construction_cases")
    .select("title, summary, area, construction_period")
    .eq("id", params.caseId)
    .maybeSingle();
  if (error) throw error;
  if (!item) return serverData;
  return { ...serverData, item: { ...serverData.item, title: item.title, summary: item.summary, area: item.area, period: item.construction_period } };
}

clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return <ProtectedRouteFallback />;
}

export default function CompanyCaseEditRoute({ loaderData, actionData }: Route.ComponentProps) {
  const isAdmin = useLocation().pathname.startsWith("/admin/");
  return (
    <DashboardLayout type={isAdmin ? "admin" : "company"}>
      <header className="page-heading"><h1>施工事例の編集</h1></header>
      {actionData && "saved" in actionData && actionData.saved ? <p className="success-message" role="status">施工事例を保存しました。</p> : null}
      {actionData && "error" in actionData ? <p className="form-error" role="alert">{actionData.error}</p> : null}
      <Form method="post" className="edit-form">
        <section className="case-photo-editor">
          <img src={images.kitchen} alt="施工事例" />
          <img src={images.living} alt="施工事例" />
          <button type="button"><ImagePlus /><span>写真を追加</span></button>
        </section>
        <section className="form-card">
          <div className="form-grid">
            <Field label="タイトル"><input name="title" defaultValue={loaderData.item.title} required /></Field>
            <Field label="施工地域"><input name="area" defaultValue={loaderData.item.area} /></Field>
            <Field label="施工期間"><input name="period" defaultValue={loaderData.item.period} /></Field>
          </div>
          <Field label="概要"><textarea name="summary" rows={4} defaultValue={loaderData.item.summary} /></Field>
          <div className="feature-editor"><span>カテゴリ</span>{loaderData.item.categories.map((category) => <Tag key={category}>{category}</Tag>)}<button type="button"><Plus size={14} />カテゴリを追加</button></div>
          <div className="form-actions"><Button type="submit">更新する</Button></div>
        </section>
      </Form>
    </DashboardLayout>
  );
}
