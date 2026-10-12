import { getSupabaseBrowserClient } from "../../lib/supabase.client";

export const imageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export const imagePresets = {
  thumbnail: { width: 480, quality: 75, resize: "contain" },
  card: { width: 800, quality: 78, resize: "contain" },
  detail: { width: 1600, quality: 82, resize: "contain" },
} as const;

export type ImagePreset = keyof typeof imagePresets;
let imageTransformUnavailable = false;

export function markImageTransformUnavailable() {
  imageTransformUnavailable = true;
}

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

async function prepareImageFile(file: File): Promise<File> {
  if (file.size < 500_000 || typeof document === "undefined") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

export async function uploadImage(bucket: string, directory: string, file: File, maxBytes: number) {
  if (!imageMimeTypes.includes(file.type as (typeof imageMimeTypes)[number])) return { error: "JPG、PNG、WebP形式の画像を選択してください。", path: null };
  const preparedFile = await prepareImageFile(file);
  const validationError = validateImageFile(preparedFile, maxBytes);
  if (validationError) return { error: validationError, path: null };

  const path = `${directory}/${crypto.randomUUID()}.${extensionFor(preparedFile)}`;
  const { error } = await getSupabaseBrowserClient().storage.from(bucket).upload(path, preparedFile, {
    cacheControl: "3600",
    contentType: preparedFile.type,
    upsert: false,
  });
  return { error: error?.message ?? null, path: error ? null : path };
}

export async function getSignedImageUrl(bucket: string, path: string | null | undefined, preset?: ImagePreset) {
  if (!path) return null;
  const storage = getSupabaseBrowserClient().storage.from(bucket);
  const options = preset && !imageTransformUnavailable ? { transform: imagePresets[preset] } : undefined;
  const { data, error } = await storage.createSignedUrl(path, 3600, options);
  if (error && options) {
    const fallback = await storage.createSignedUrl(path, 3600);
    if (!fallback.error) imageTransformUnavailable = true;
    return fallback.error ? null : fallback.data.signedUrl;
  }
  return error ? null : data.signedUrl;
}

export async function removeImages(bucket: string, paths: string[]) {
  if (!paths.length) return null;
  const { error } = await getSupabaseBrowserClient().storage.from(bucket).remove(paths);
  return error?.message ?? null;
}
