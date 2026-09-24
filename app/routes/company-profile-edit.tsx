import type { Route } from "./+types/company-profile-edit";
import { Camera, Plus, Trash2 } from "lucide-react";
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
import { getSignedImageUrl, isImageFile, removeImages, uploadImage } from "../features/media/image-storage.client";

const profileSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().or(z.literal("")),
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
  const formData = await request.formData();
  const result = profileSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) return data({ error: "入力内容を確認してください。" }, { status: 400 });

  if (isSupabaseConfigured()) {
    const context = await getAuthorizationContext();
    const companyId = context?.memberships[0]?.companyId;
    if (companyId) {
    const foundedYear = result.data.founded.replace(/[^0-9]/g, "");
    const supabase = getSupabaseBrowserClient();
    const { data: currentCompany, error: currentCompanyError } = await supabase.from("companies")
      .select("logo_path, cover_image_path")
      .eq("id", companyId)
      .maybeSingle();
    if (currentCompanyError) return data({ error: "現在の企業情報を取得できませんでした。" }, { status: 400 });

    const uploadedPaths: string[] = [];
    const coverFile = formData.get("coverImage");
    const logoFile = formData.get("logoImage");
    let coverPath = currentCompany?.cover_image_path ?? null;
    let logoPath = currentCompany?.logo_path ?? null;

    for (const [file, directory, target] of [
      [coverFile, `${companyId}/cover`, "cover"] as const,
      [logoFile, `${companyId}/logo`, "logo"] as const,
    ]) {
      if (!isImageFile(file)) continue;
      const uploaded = await uploadImage("company-assets", directory, file, 5 * 1024 * 1024);
      if (uploaded.error || !uploaded.path) {
        await removeImages("company-assets", uploadedPaths);
        return data({ error: uploaded.error ?? "画像をアップロードできませんでした。" }, { status: 400 });
      }
      uploadedPaths.push(uploaded.path);
      if (target === "cover") coverPath = uploaded.path;
      if (target === "logo") logoPath = uploaded.path;
    }

    if (formData.get("removeCover") === "on") coverPath = null;
    if (formData.get("removeLogo") === "on") logoPath = null;

    const { error } = await supabase.from("companies").update({
        name: result.data.name,
        email: result.data.email,
        founded_year: foundedYear ? Number(foundedYear) : null,
        phone: result.data.phone,
        website_url: result.data.website || null,
        address: result.data.address,
        business_hours: result.data.businessHours,
        description: result.data.description,
        cover_image_path: coverPath,
        logo_path: logoPath,
      }).eq("id", companyId);
    if (error) {
      await removeImages("company-assets", uploadedPaths);
      return data({ error: "企業情報を保存できませんでした。" }, { status: 400 });
    }

    const oldPaths = [currentCompany?.cover_image_path, currentCompany?.logo_path]
      .filter((path): path is string => Boolean(path))
      .filter((path) => !uploadedPaths.includes(path) && path !== coverPath && path !== logoPath);
    const orphanedUploads = uploadedPaths.filter((path) => path !== coverPath && path !== logoPath);
    const removeError = await removeImages("company-assets", [...oldPaths, ...orphanedUploads]);
    if (removeError) return data({ error: "情報は保存しましたが、古い画像を削除できませんでした。" }, { status: 400 });
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
    .select("name, email, founded_year, phone, website_url, address, business_hours, description, logo_path, cover_image_path")
    .eq("id", companyId)
    .maybeSingle();
  if (error) throw error;
  if (!record) return serverData;
  const [coverImage, logoImage] = await Promise.all([
    getSignedImageUrl("company-assets", record.cover_image_path),
    getSignedImageUrl("company-assets", record.logo_path),
  ]);

  return {
    ...serverData,
    company: {
      ...(serverData.company ?? {
        id: companyId,
        image: "",
        features: [],
      }),
      name: record.name,
      email: record.email,
      founded: record.founded_year ? `${record.founded_year}年` : "",
      phone: record.phone,
      website: record.website_url ?? "",
      address: record.address,
      businessHours: record.business_hours,
      description: record.description,
      image: coverImage ?? logoImage ?? "",
      coverImage: coverImage ?? undefined,
      logoImage: logoImage ?? undefined,
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
      <Form method="post" encType="multipart/form-data" className="edit-form">
        <section className="company-media-fields">
          <label className="media-placeholder media-upload">
            {loaderData.company.coverImage ? <img src={loaderData.company.coverImage} alt="企業のメイン画像" /> : <><Plus /><span>メイン画像を追加</span></>}
            <input type="file" name="coverImage" accept="image/jpeg,image/png,image/webp" />
          </label>
          <label className="media-placeholder media-upload">
            {loaderData.company.logoImage ? <img src={loaderData.company.logoImage} alt="企業ロゴ" /> : <><Camera /><span>ロゴ画像を追加</span></>}
            <input type="file" name="logoImage" accept="image/jpeg,image/png,image/webp" />
          </label>
          <label className="media-remove"><input type="checkbox" name="removeCover" /> <Trash2 size={14} />メイン画像を削除</label>
          <label className="media-remove"><input type="checkbox" name="removeLogo" /> <Trash2 size={14} />ロゴ画像を削除</label>
        </section>
        <section className="form-card">
          <h2>企業情報</h2>
          <div className="form-grid">
            <Field label="企業名"><input name="name" defaultValue={loaderData.company.name} /></Field>
            <Field label="問い合わせ先メールアドレス"><input name="email" type="email" defaultValue={loaderData.company.email} /></Field>
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
