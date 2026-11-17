import ui from "../ui.module.css";
import type { Route } from "./+types/company-profile-edit";
import { Camera, Plus, Trash2 } from "lucide-react";
import { data } from "react-router";
import { z } from "zod";
import { Field } from "../components/molecules";
import { ManagedForm, SubmitButton } from "../features/forms/managed-form";
import { validationErrors } from "../features/forms/validation";
import { DashboardLayout } from "../components/templates/dashboard-layout";
import { requireAuthorization } from "../features/auth/authorization.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";
import { getActiveCompanyId } from "../features/auth/company-selection.client";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../lib/supabase.client";
import type { CompanyProfile } from "../features/cases/types";
import { getSignedImageUrl, isImageFile, MAX_IMAGE_BYTES, removeImages, uploadImage } from "../features/media/image-storage.client";
import { StorageImage } from "../features/media/storage-image";

const profileSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().or(z.literal("")),
  founded: z.string().trim().transform(value => value.normalize("NFKC"))
    .refine(value => /^(?:[1-9][0-9]{3}年?)?$/.test(value), "設立年は西暦4桁で入力してください（例：2018）。月日は入力しないでください。")
    .transform(value => value ? Number(value.replace(/年$/, "")) : null),
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
  const context = await requireAuthorization(request, { role: "COMPANY" });
  const companyId = getActiveCompanyId(context);
  const membership = context.memberships.find((item) => item.companyId === companyId);
  if (!companyId || (membership?.role !== "OWNER" && membership?.role !== "ADMIN")) throw new Response("権限がありません", { status: 404 });
  const formData = await request.formData();
  const result = profileSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) return data({ error: "入力内容を確認してください。", fieldErrors: validationErrors(result.error) }, { status: 400 });

  if (isSupabaseConfigured()) {
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
      const uploaded = await uploadImage("company-assets", directory, file, MAX_IMAGE_BYTES);
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
        founded_year: result.data.founded,
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

  return data({ saved: true });
}

export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  const context = await requireAuthorization(request, { role: "COMPANY" });
  const companyId = getActiveCompanyId(context);
  const membership = context.memberships.find((item) => item.companyId === companyId);
  if (!companyId || (membership?.role !== "OWNER" && membership?.role !== "ADMIN")) throw new Response("権限がありません", { status: 404 });
  const serverData = await serverLoader();
  if (!isSupabaseConfigured()) return serverData;

  const supabase = getSupabaseBrowserClient();
  const { data: record, error } = await supabase.from("companies")
    .select("name, email, founded_year, phone, website_url, address, business_hours, description, logo_path, cover_image_path")
    .eq("id", companyId)
    .maybeSingle();
  if (error) throw error;
  if (!record) return serverData;
  const [coverImage, logoImage] = await Promise.all([
    getSignedImageUrl("company-assets", record.cover_image_path, "card"),
    getSignedImageUrl("company-assets", record.logo_path, "thumbnail"),
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
      founded: record.founded_year ? String(record.founded_year) : "",
      phone: record.phone,
      website: record.website_url ?? "",
      address: record.address,
      businessHours: record.business_hours,
      description: record.description,
      image: logoImage ?? "",
      imagePath: record.logo_path ?? undefined,
      coverImage: coverImage ?? undefined,
      logoImage: logoImage ?? undefined,
      coverImagePath: record.cover_image_path ?? undefined,
      logoImagePath: record.logo_path ?? undefined,
    },
  };
}

clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return <ProtectedRouteFallback />;
}

export default function CompanyProfileEditRoute({ loaderData, actionData }: Route.ComponentProps) {
  if (!loaderData.company) return <DashboardLayout type="company"><div className={ui["empty-state"]}><h1>企業情報が見つかりません</h1></div></DashboardLayout>;

  return (
    <DashboardLayout type="company">
      <header className={ui["page-heading"]}><h1>企業情報の編集</h1></header>
      {actionData && "saved" in actionData && actionData.saved ? <p className={ui["success-message"]} role="status">企業情報を保存しました。</p> : null}
      {actionData && "error" in actionData ? <p className={ui["form-error"]} role="alert">{actionData.error}</p> : null}
      <ManagedForm protect method="post" encType="multipart/form-data" className={ui["edit-form"]}>
        <section className={ui["company-media-fields"]}>
          <label className={ui["media-placeholder"] + " " + ui["media-upload"]}>
            {loaderData.company.coverImage ? <StorageImage width={600} height={225} src={loaderData.company.coverImage} storagePath={loaderData.company.coverImagePath} bucket="company-assets" alt="企業のメイン画像" /> : <><Plus aria-hidden="true" /><span>メイン画像を追加</span></>}
            <span>保存画像は1MB以内</span>
            <input type="file" name="coverImage" accept="image/jpeg,image/png,image/webp" />
          </label>
          <label className={ui["media-placeholder"] + " " + ui["media-upload"]}>
            {loaderData.company.logoImage ? <StorageImage width={200} height={200} src={loaderData.company.logoImage} storagePath={loaderData.company.logoImagePath} bucket="company-assets" alt="企業ロゴ" /> : <><Camera aria-hidden="true" /><span>ロゴ画像を追加</span></>}
            <span>保存画像は1MB以内</span>
            <input type="file" name="logoImage" accept="image/jpeg,image/png,image/webp" />
          </label>
          <label className={ui["media-remove"]}><input type="checkbox" name="removeCover" /> <Trash2 aria-hidden="true" size={14} />メイン画像を削除</label>
          <label className={ui["media-remove"]}><input type="checkbox" name="removeLogo" /> <Trash2 aria-hidden="true" size={14} />ロゴ画像を削除</label>
        </section>
        <section className={ui["form-card"]}>
          <h2>企業情報</h2>
          <div className={ui["form-grid"]}>
            <Field label="企業名"><input name="name" autoComplete="organization" required maxLength={120} defaultValue={loaderData.company.name} /></Field>
            <Field label="問い合わせ先メールアドレス"><input name="email" type="email" autoComplete="email" spellCheck={false} defaultValue={loaderData.company.email} /></Field>
            <Field label="設立年" hint="西暦4桁（例：2018）。月日は入力不要です。"><input name="founded" inputMode="numeric" pattern="[0-9０-９]{4}年?" defaultValue={loaderData.company.founded} /></Field>
            <Field label="電話番号"><input name="phone" type="tel" autoComplete="tel" defaultValue={loaderData.company.phone} /></Field>
            <Field label="ホームページ"><input name="website" type="url" autoComplete="url" defaultValue={loaderData.company.website} /></Field>
            <Field label="所在地"><input name="address" autoComplete="street-address" defaultValue={loaderData.company.address} /></Field>
            <Field label="営業時間"><input name="businessHours" defaultValue={loaderData.company.businessHours} /></Field>
          </div>
          <Field label="企業紹介"><textarea name="description" rows={3} defaultValue={loaderData.company.description} /></Field>
          <div className={ui["form-actions"]}><SubmitButton>更新する</SubmitButton></div>
        </section>
      </ManagedForm>
    </DashboardLayout>
  );
}

export function meta() { return [{ title: "企業情報の編集 | 飯塚のリノベ" }]; }
