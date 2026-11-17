import { beforeEach, expect, it, vi } from "vitest";
import { readGuestFavorites, saveGuestFavorite, transferGuestFavorites } from "./guest-favorites.client";

const state = vi.hoisted(() => ({ published: [] as { id: string }[], upsert: vi.fn(), error: null as Error | null }));
vi.mock("../../lib/supabase.client", () => ({ getSupabaseBrowserClient: () => ({ from: (table: string) => table === "favorites" ? { upsert: state.upsert } : { select: () => ({ in: () => ({ eq: async () => ({ data: state.published, error: state.error }) }) }) } }) }));
const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); state.published = [{ id: first }]; state.error = null; state.upsert.mockResolvedValue({ error: null }); });
it("保存は重複せず、新しい順に残る", () => {
  saveGuestFavorite(first, true); saveGuestFavorite(second, true); saveGuestFavorite(first, true);
  expect(readGuestFavorites()).toEqual([first, second]);
  saveGuestFavorite(first, false);
  expect(readGuestFavorites()).toEqual([second]);
});
it("破損した保存データを表示やリクエストに使わない", () => {
  localStorage.setItem("living-design:favorites:v1", '{"invalid":true}');
  expect(readGuestFavorites()).toEqual([]);
});
it("公開中の事例だけを引き継ぎ、同時に追加された保存は消さない", async () => {
  saveGuestFavorite(first, true);
  state.upsert.mockImplementation(async () => { saveGuestFavorite(second, true); return { error: null }; });
  await transferGuestFavorites("user");
  expect(state.upsert).toHaveBeenCalledWith([{ user_id: "user", case_id: first }], expect.objectContaining({ ignoreDuplicates: true }));
  expect(readGuestFavorites()).toEqual([second]);
});
it("引き継ぎが失敗したら端末の保存を残し、再試行できる", async () => {
  saveGuestFavorite(first, true);
  state.upsert.mockResolvedValueOnce({ error: new Error("offline") });
  await expect(transferGuestFavorites("user")).rejects.toThrow("offline");
  expect(readGuestFavorites()).toEqual([first]);
  await transferGuestFavorites("user");
  expect(readGuestFavorites()).toEqual([]);
});
it("削除済みの事例があっても残りの引き継ぎを妨げない", async () => {
  saveGuestFavorite(second, true); saveGuestFavorite(first, true);
  await transferGuestFavorites("user");
  expect(state.upsert).toHaveBeenCalledWith([{ user_id: "user", case_id: first }], expect.any(Object));
  expect(readGuestFavorites()).toEqual([]);
});
