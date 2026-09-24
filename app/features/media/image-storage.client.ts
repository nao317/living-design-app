import { getSupabaseBrowserClient } from "../../lib/supabase.client";

export const imageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;

function extensionFor(file: File) {
  const extension = file.type.split("/")[1];
  return extension === "jpeg" ? "jpg" : extension;
}

export function isImageFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

export function validateImageFile(file: File, maxBytes: number) {
  if (!imageMimeTypes.includes(file.type as (typeof imageMimeTypes)[number])) return "JPG、PNG、WebP形式の画像を選択してください。";
  if (file.size > maxBytes) return `画像は${Math.round(maxBytes / 1024 / 1024)}MB以内にしてください。`;
  return null;
}

export async function uploadImage(bucket: string, directory: string, file: File, maxBytes: number) {
  const validationError = validateImageFile(file, maxBytes);
  if (validationError) return { error: validationError, path: null };

  const path = `${directory}/${crypto.randomUUID()}.${extensionFor(file)}`;
  const { error } = await getSupabaseBrowserClient().storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  return { error: error?.message ?? null, path: error ? null : path };
}

export async function getSignedImageUrl(bucket: string, path: string | null | undefined) {
  if (!path) return null;
  const { data, error } = await getSupabaseBrowserClient().storage.from(bucket).createSignedUrl(path, 3600);
  return error ? null : data.signedUrl;
}

export async function removeImages(bucket: string, paths: string[]) {
  if (!paths.length) return null;
  const { error } = await getSupabaseBrowserClient().storage.from(bucket).remove(paths);
  return error?.message ?? null;
}
