import type { Route } from "./+types/company-case-edit";
import { ImagePlus } from "lucide-react";
import { data, Form, useLocation } from "react-router";
import { z } from "zod";
import { Button } from "../components/atoms";
import { Field } from "../components/molecules";
import { DashboardLayout } from "../components/templates";
import type { CaseStudy } from "../features/cases/types";
import { requireAuthorization } from "../features/auth/authorization.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";
import { getSignedImageUrl, isImageFile, removeImages, uploadImage } from "../features/media/image-storage.client";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../lib/supabase.client";

const caseSchema = z.object({
  title: z.string().trim().min(1).max(160),
  area: z.string().trim().max(120),
  period: z.string().trim().max(120),
  summary: z.string().trim().max(2000),
});

type CaseImageView = { id: string; storagePath: string; url: string };

export function loader({ params }: Route.LoaderArgs) {
  return {
    item: null as CaseStudy | null,
    caseId: params.caseId ?? "",
    caseImages: [] as CaseImageView[],
    categories: [] as Array<{ id: string; name: string }>,
    styles: [] as Array<{ id: string; name: string }>,
    selectedCategoryIds: [] as string[],
    selectedStyleIds: [] as string[],
  };
}

export async function clientAction({ request, params }: Route.ClientActionArgs) {
  await requireAuthorization(request, { roles: ["COMPANY", "ADMIN"] });
  const formData = await request.formData();
  const result = caseSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) return data({ error: "入力内容を確認してください。" }, { status: 400 });
  if (isSupabaseConfigured() && params.caseId) {
    const supabase = getSupabaseBrowserClient();
    const { data: currentCase, error: currentCaseError } = await supabase.from("construction_cases")
      .select("company_id")
      .eq("id", params.caseId)
      .maybeSingle();
    if (currentCaseError || !currentCase) return data({ error: "施工事例が見つかりません。" }, { status: 404 });

    const { error } = await supabase.from("construction_cases").update({
      title: result.data.title,
      area: result.data.area,
      construction_period: result.data.period,
      summary: result.data.summary,
    }).eq("id", params.caseId);
    if (error) return data({ error: "施工事例を保存できませんでした。" }, { status: 400 });

    const categoryIds = formData.getAll("categoryIds").filter((value): value is string => typeof value === "string" && value.length > 0);
    const styleIds = formData.getAll("styleIds").filter((value): value is string => typeof value === "string" && value.length > 0);
    const { error: deleteCategoriesError } = await supabase.from("case_categories").delete().eq("case_id", params.caseId);
    if (deleteCategoriesError) return data({ error: "施工箇所を更新できませんでした。" }, { status: 400 });
    if (categoryIds.length) {
      const { error: categoryError } = await supabase.from("case_categories").insert(categoryIds.map((categoryId) => ({ case_id: params.caseId, category_id: categoryId })));
      if (categoryError) return data({ error: "施工箇所を更新できませんでした。" }, { status: 400 });
    }
    const { error: deleteStylesError } = await supabase.from("case_styles").delete().eq("case_id", params.caseId);
    if (deleteStylesError) return data({ error: "こだわり条件を更新できませんでした。" }, { status: 400 });
    if (styleIds.length) {
      const { error: styleError } = await supabase.from("case_styles").insert(styleIds.map((styleId) => ({ case_id: params.caseId, style_id: styleId })));
      if (styleError) return data({ error: "こだわり条件を更新できませんでした。" }, { status: 400 });
    }

    const removeIds = formData.getAll("removeImageIds").filter((value): value is string => typeof value === "string");
    if (removeIds.length) {
      const { data: imageRows, error: imageRowsError } = await supabase.from("case_images")
        .select("id, storage_path")
        .eq("case_id", params.caseId)
        .in("id", removeIds);
      if (imageRowsError) return data({ error: "削除する画像を取得できませんでした。" }, { status: 400 });
      const paths = (imageRows ?? []).map((row) => row.storage_path);
      const storageError = await removeImages("case-images", paths);
      if (storageError) return data({ error: "画像ファイルを削除できませんでした。" }, { status: 400 });
      const { error: deleteRowsError } = await supabase.from("case_images")
        .delete()
        .eq("case_id", params.caseId)
        .in("id", removeIds);
      if (deleteRowsError) return data({ error: "画像情報を削除できませんでした。" }, { status: 400 });
    }

    const files = formData.getAll("images").filter(isImageFile);
    const uploadedPaths: string[] = [];
    for (const file of files) {
      const uploaded = await uploadImage("case-images", `${currentCase.company_id}/${params.caseId}`, file, 10 * 1024 * 1024);
      if (uploaded.error || !uploaded.path) {
        await removeImages("case-images", uploadedPaths);
        return data({ error: uploaded.error ?? "施工事例の画像をアップロードできませんでした。" }, { status: 400 });
      }
      uploadedPaths.push(uploaded.path);
    }
    if (uploadedPaths.length) {
      const { data: lastImage } = await supabase.from("case_images")
        .select("display_order")
        .eq("case_id", params.caseId)
        .order("display_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const startOrder = (lastImage?.display_order ?? -1) + 1;
      const { error: imageError } = await supabase.from("case_images").insert(uploadedPaths.map((storagePath, index) => ({
        case_id: params.caseId,
        storage_path: storagePath,
        display_order: startOrder + index,
      })));
      if (imageError) {
        await removeImages("case-images", uploadedPaths);
        return data({ error: "施工事例の画像を保存できませんでした。" }, { status: 400 });
      }
    }
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
  if (!item) throw new Response("施工事例が見つかりません", { status: 404 });
  const { data: imageRows, error: imageError } = await supabase.from("case_images")
    .select("id, storage_path")
    .eq("case_id", params.caseId)
    .order("display_order");
  if (imageError) throw imageError;
  const caseImages = (await Promise.all((imageRows ?? []).map(async (image) => ({
    id: image.id,
    storagePath: image.storage_path,
    url: await getSignedImageUrl("case-images", image.storage_path),
  })))).filter((image): image is CaseImageView => Boolean(image.url));
  const [{ data: categories, error: categoriesError }, { data: styles, error: stylesError }, { data: selectedCategories, error: selectedCategoriesError }, { data: selectedStyles, error: selectedStylesError }] = await Promise.all([
    supabase.from("categories").select("id, name").order("display_order"),
    supabase.from("styles").select("id, name").order("display_order"),
    supabase.from("case_categories").select("category_id").eq("case_id", params.caseId),
    supabase.from("case_styles").select("style_id").eq("case_id", params.caseId),
  ]);
  if (categoriesError) throw categoriesError;
  if (stylesError) throw stylesError;
  if (selectedCategoriesError) throw selectedCategoriesError;
  if (selectedStylesError) throw selectedStylesError;
  return {
    ...serverData,
    caseImages,
    categories: categories ?? [],
    styles: styles ?? [],
    selectedCategoryIds: (selectedCategories ?? []).map((row) => row.category_id),
    selectedStyleIds: (selectedStyles ?? []).map((row) => row.style_id),
    item: {
      id: params.caseId,
      title: item.title,
      summary: item.summary,
      area: item.area,
      period: item.construction_period,
      company: "",
      companyId: "",
      image: caseImages[0]?.url ?? "",
      images: caseImages.map((image) => image.url),
      price: "",
      categories: [],
    },
  };
}

clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return <ProtectedRouteFallback />;
}

export default function CompanyCaseEditRoute({ loaderData, actionData }: Route.ComponentProps) {
  const isAdmin = useLocation().pathname.startsWith("/admin/");
  if (!loaderData.item) return <DashboardLayout type={isAdmin ? "admin" : "company"}><div className="empty-state"><h1>施工事例が見つかりません</h1></div></DashboardLayout>;
  return (
    <DashboardLayout type={isAdmin ? "admin" : "company"}>
      <header className="page-heading"><h1>施工事例の編集</h1></header>
      {actionData && "saved" in actionData && actionData.saved ? <p className="success-message" role="status">施工事例を保存しました。</p> : null}
      {actionData && "error" in actionData ? <p className="form-error" role="alert">{actionData.error}</p> : null}
      <Form method="post" encType="multipart/form-data" className="edit-form">
        <section className="case-photo-editor">
          {loaderData.caseImages.map((image) => (
            <div className="case-photo-item" key={image.id}>
              <img src={image.url} alt="施工事例" />
              <label><input type="checkbox" name="removeImageIds" value={image.id} />削除</label>
            </div>
          ))}
          <label className="case-photo-add">
            <ImagePlus /><span>写真を追加</span>
            <input type="file" name="images" accept="image/jpeg,image/png,image/webp" multiple />
          </label>
        </section>
        <section className="form-card">
          <div className="form-grid">
            <Field label="タイトル"><input name="title" defaultValue={loaderData.item.title} required /></Field>
            <Field label="施工地域"><input name="area" defaultValue={loaderData.item.area} /></Field>
            <Field label="施工期間"><input name="period" defaultValue={loaderData.item.period} /></Field>
          </div>
          <Field label="概要"><textarea name="summary" rows={4} defaultValue={loaderData.item.summary} /></Field>
          <fieldset className="choice-list"><legend>リノベーション箇所</legend>{loaderData.categories.map((category) => <label key={category.id}><input type="checkbox" name="categoryIds" value={category.id} defaultChecked={loaderData.selectedCategoryIds.includes(category.id)} />{category.name}</label>)}</fieldset>
          <fieldset className="choice-list"><legend>こだわり条件</legend>{loaderData.styles.map((style) => <label key={style.id}><input type="checkbox" name="styleIds" value={style.id} defaultChecked={loaderData.selectedStyleIds.includes(style.id)} />{style.name}</label>)}</fieldset>
          <div className="form-actions"><Button type="submit">更新する</Button></div>
        </section>
      </Form>
    </DashboardLayout>
  );
}
