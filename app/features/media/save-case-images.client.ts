import { getSupabaseBrowserClient } from "../../lib/supabase.client";
import { MAX_IMAGE_BYTES, removeImages, uploadImage } from "./image-storage.client";
import { validateCaseImageChanges, type CaseImageChanges } from "./case-image-form";

export type StoredCaseImage = { id: string; storage_path: string; display_order: number };

export async function saveCaseImages(caseId: string, companyId: string, existing: StoredCaseImage[], changes: CaseImageChanges) {
  if (!changes.cover && !changes.files.length && !changes.removedIds.length && !changes.existing.length) return null;
  const countError = validateCaseImageChanges(existing.map(image => image.id), changes);
  if (countError) return countError;
  const supabase = getSupabaseBrowserClient();
  const cover = existing[0] && !changes.removedIds.includes(existing[0].id) ? existing[0] : undefined;
  const newPaths: string[] = [];
  const updates: Array<{ id?: string; storage_path: string; display_order: number; taken_on: string | null; description: string }> = [];
  const startOrder = Math.max(0, ...existing.map(image => image.display_order)) + 1;
  const files = [...(changes.cover ? [changes.cover] : []), ...changes.files];
  for (const [index, file] of files.entries()) {
    const uploaded = await uploadImage("case-images", `${companyId}/${caseId}`, file, MAX_IMAGE_BYTES);
    if (uploaded.error || !uploaded.path) {
      await removeImages("case-images", newPaths);
      return uploaded.error ?? "写真をアップロードできませんでした。";
    }
    newPaths.push(uploaded.path);
    const isCover = Boolean(changes.cover && index === 0);
    const photo = changes.added[index - (changes.cover ? 1 : 0)];
    updates.push({
      id: isCover ? cover?.id : undefined,
      storage_path: uploaded.path,
      display_order: isCover ? (cover?.display_order ?? 0) : startOrder + index,
      taken_on: isCover ? null : photo.date || null,
      description: isCover ? "" : photo.description,
    });
  }
  for (const photo of changes.existing) {
    const image = existing.find(image => image.id === photo.id);
    if (!image || (changes.cover && image.id === cover?.id)) continue;
    updates.push({ ...image, taken_on: photo.date || null, description: photo.description });
  }
  const removed = existing.filter(image => changes.removedIds.includes(image.id));
  // Commit the image records together; failed metadata writes must not leave uploaded rows behind.
  const { error } = await supabase.rpc("save_case_images", {
    target_case_id: caseId,
    image_updates: updates,
    remove_image_ids: removed.map(image => image.id),
  });
  if (error) {
    await removeImages("case-images", newPaths);
    return "写真を保存できませんでした。時間をおいて再度お試しください。";
  }
  const obsoletePaths = [...removed.map(image => image.storage_path), ...(changes.cover && cover ? [cover.storage_path] : [])];
  // Records are already committed. A storage cleanup failure must not invite a duplicate upload.
  if (obsoletePaths.length) await removeImages("case-images", obsoletePaths);
  return null;
}
