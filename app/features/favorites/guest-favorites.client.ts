import { z } from "zod";
import { getSupabaseBrowserClient } from "../../lib/supabase.client";

const key = "living-design:favorites:v1";
const schema = z.array(z.uuid()).max(200);
export function readGuestFavorites(): string[] {
  try { return schema.parse(JSON.parse(localStorage.getItem(key) ?? "[]")); } catch { return []; }
}
export function saveGuestFavorite(caseId: string, saved: boolean) {
  const ids = readGuestFavorites().filter(id => id !== caseId);
  if (saved) ids.unshift(caseId);
  localStorage.setItem(key, JSON.stringify(ids.slice(0, 200)));
  window.dispatchEvent(new Event("guest-favorites-changed"));
}
const transfers = new Map<string, Promise<void>>();
export async function transferGuestFavorites(userId: string) {
  if (transfers.has(userId)) return transfers.get(userId);
  const ids = readGuestFavorites();
  if (!ids.length) return;
  const transfer = (async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: cases, error: casesError } = await supabase.from("construction_cases").select("id").in("id", ids).eq("status", "PUBLISHED");
    if (casesError) throw casesError;
    // Deleted and unpublished cases must not prevent the remaining saves from transferring.
    const published = new Set((cases ?? []).map(item => item.id as string));
    const rows = ids.filter(id => published.has(id)).map(caseId => ({ user_id: userId, case_id: caseId }));
    if (rows.length) {
      const { error } = await supabase.from("favorites").upsert(rows, { onConflict: "user_id,case_id", ignoreDuplicates: true });
      if (error) throw error;
    }
    const remaining = readGuestFavorites().filter(id => !ids.includes(id));
    localStorage.setItem(key, JSON.stringify(remaining));
    window.dispatchEvent(new Event("guest-favorites-changed"));
  })();
  transfers.set(userId, transfer);
  try { await transfer; } finally { transfers.delete(userId); }
}
