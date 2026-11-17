import { isImageFile, validateCaseImageCount } from "./image-storage.client";

export type PhotoMetadata = { date: string; description: string };
export type CaseImageChanges = {
  cover?: File;
  files: File[];
  removedIds: string[];
  existing: Array<PhotoMetadata & { id: string }>;
  added: PhotoMetadata[];
};

function metadata(formData: FormData, key: string): PhotoMetadata {
  return {
    date: String(formData.get(`imageDate:${key}`) ?? "").trim(),
    description: String(formData.get(`imageDescription:${key}`) ?? "").trim(),
  };
}

export function readCaseImageChanges(formData: FormData): { changes: CaseImageChanges; error?: string } {
  const cover = formData.get("coverImage");
  const files = formData.getAll("images").filter(isImageFile);
  const removedIds = formData.getAll("removeImageIds").filter((id): id is string => typeof id === "string");
  const changes: CaseImageChanges = {
    cover: isImageFile(cover) ? cover : undefined,
    files,
    removedIds,
    existing: formData.getAll("imageIds").filter((id): id is string => typeof id === "string" && !removedIds.includes(id)).map(id => ({ id, ...metadata(formData, id) })),
    added: files.map((_, index) => metadata(formData, `new-${index}`)),
  };
  for (const photo of [...changes.existing, ...changes.added]) {
    if (photo.description.length > 2000) return { changes, error: "写真の説明は2000文字以内で入力してください。" };
    if (photo.date && (!/^\d{4}-\d{2}-\d{2}$/.test(photo.date) || !Number.isFinite(Date.parse(photo.date)) || new Date(photo.date).toISOString().slice(0, 10) !== photo.date)) {
      return { changes, error: "写真の日付を正しく入力してください。" };
    }
  }
  return { changes };
}

export function validateCaseImageChanges(existingIds: string[], changes: CaseImageChanges) {
  const remaining = existingIds.filter(id => !changes.removedIds.includes(id));
  const keepsCover = Boolean(existingIds[0] && remaining.includes(existingIds[0]));
  if (!keepsCover && !changes.cover && (remaining.length || changes.files.length)) return "代表画像を選択してください。";
  return validateCaseImageCount(remaining.length, changes.files.length + (changes.cover && !keepsCover ? 1 : 0));
}
