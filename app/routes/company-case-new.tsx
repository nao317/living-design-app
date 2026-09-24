import type { Route } from "./+types/company-case-new";
import { data, Form } from "react-router";
import { z } from "zod";
import { Button } from "../components/atoms";
import { Field } from "../components/molecules";
import { DashboardLayout } from "../components/templates";
import { requireAuthorization, getAuthorizationContext } from "../features/auth/authorization.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";
import { isImageFile, removeImages, uploadImage } from "../features/media/image-storage.client";
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
  await requireAuthorization(request, { role: "COMPANY" });
  const formData = await request.formData();
  const result = caseSchema.safeParse(Object.fromEntries(formData));
  if (!result.success || parsePrice(result.data.priceMin) === undefined || parsePrice(result.data.priceMax) === undefined) {
    return data({ error: "入力内容を確認してください。" }, { status: 400 });
  }

  if (isSupabaseConfigured()) {
    const authorization = await getAuthorizationContext();
    const companyId = authorization?.memberships[0]?.companyId;
    if (!companyId) return data({ error: "所属企業が見つかりません。" }, { status: 400 });

    const supabase = getSupabaseBrowserClient();
    const { data: createdCaseId, error } = await supabase.rpc("create_construction_case", {
      target_company_id: companyId,
      case_title: result.data.title,
      case_summary: result.data.summary,
      case_area: result.data.area,
      case_period: result.data.period,
      target_price_min: parsePrice(result.data.priceMin),
      target_price_max: parsePrice(result.data.priceMax),
    });
    if (error || typeof createdCaseId !== "string") {
      return data({ error: "施工事例を登録できませんでした。企業アカウントの所属企業と権限を確認してください。" }, { status: error?.code === "42501" ? 403 : 400 });
    }

    const files = formData.getAll("images").filter(isImageFile);
    const uploadedPaths: string[] = [];
    for (const file of files) {
      const uploaded = await uploadImage("case-images", `${companyId}/${createdCaseId}`, file, 10 * 1024 * 1024);
      if (uploaded.error || !uploaded.path) {
        await removeImages("case-images", uploadedPaths);
        await supabase.from("construction_cases").delete().eq("id", createdCaseId);
        return data({ error: `施工事例の画像をアップロードできませんでした。${uploaded.error ?? ""}` }, { status: 400 });
      }
      uploadedPaths.push(uploaded.path);
    }
    if (uploadedPaths.length) {
      const { error: imageError } = await supabase.from("case_images").insert(uploadedPaths.map((storagePath, index) => ({
        case_id: createdCaseId,
        storage_path: storagePath,
        display_order: index,
      })));
      if (imageError) {
        await removeImages("case-images", uploadedPaths);
        await supabase.from("construction_cases").delete().eq("id", createdCaseId);
        return data({ error: `施工事例の画像を保存できませんでした。${imageError.message}` }, { status: imageError.code === "42501" ? 403 : 400 });
      }
    }
  }

  return data({ saved: true });
}

export default function CompanyCaseNewRoute({ actionData }: Route.ComponentProps) {
  return (
    <DashboardLayout type="company">
      <header className="page-heading"><h1>施工事例の追加</h1><p>自社の施工事例を登録します。</p></header>
      {actionData && "saved" in actionData && actionData.saved ? <p className="success-message" role="status">施工事例を登録しました。</p> : null}
      {actionData && "error" in actionData ? <p className="form-error" role="alert">{actionData.error}</p> : null}
      <Form method="post" encType="multipart/form-data" className="edit-form">
        <section className="form-card">
          <div className="form-grid">
            <Field label="タイトル"><input name="title" required maxLength={160} /></Field>
            <Field label="施工地域"><input name="area" maxLength={120} /></Field>
            <Field label="施工期間"><input name="period" maxLength={120} /></Field>
            <Field label="費用下限"><input name="priceMin" type="number" min="0" inputMode="numeric" /></Field>
            <Field label="費用上限"><input name="priceMax" type="number" min="0" inputMode="numeric" /></Field>
          </div>
          <Field label="概要"><textarea name="summary" rows={5} maxLength={2000} /></Field>
          <Field label="施工写真"><input name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple /></Field>
          <div className="form-actions"><Button type="submit">登録する</Button></div>
        </section>
      </Form>
    </DashboardLayout>
  );
}
