import { beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ role: "GENERAL", error: null as null | { message: string }, write: vi.fn(), eq: vi.fn() }));
vi.mock("../features/auth/authorization.client", () => ({ getAuthorizationContext: async () => {
  if (state.role === "ANONYMOUS") return null;
  return { userId: "11111111-1111-4111-8111-111111111111", accountRole: state.role };
} }));
vi.mock("../lib/supabase.client", () => ({ getSupabaseBrowserClient: () => ({ from: () => {
  const query = { eq: (name: string, value: string) => { state.eq(name, value); return query; }, then: (resolve: (value: unknown) => void) => resolve({ error: state.error }) };
  return { upsert: async (...args: unknown[]) => { state.write(...args); return { error: state.error }; }, delete: () => query };
} }) }));
import { clientAction } from "./favorite-update";

const caseId = "22222222-2222-4222-8222-222222222222";
function request(saved: boolean, id = caseId) { return { request: new Request("http://localhost/favorites/update", { method: "POST", body: new URLSearchParams({ caseId: id, saved: String(saved) }) }) } as Parameters<typeof clientAction>[0]; }
beforeEach(() => { state.role = "GENERAL"; state.error = null; vi.clearAllMocks(); });
it("ログイン中の利用者と事例を保存する", async () => {
  expect(await clientAction(request(true))).toMatchObject({ caseId, saved: true, error: "" });
  expect(state.write).toHaveBeenCalledWith({ user_id: "11111111-1111-4111-8111-111111111111", case_id: caseId }, { onConflict: "user_id,case_id", ignoreDuplicates: true });
});
it("削除対象を自分のユーザーIDと事例IDで限定する", async () => {
  await clientAction(request(false));
  expect(state.eq.mock.calls).toEqual([["user_id", "11111111-1111-4111-8111-111111111111"], ["case_id", caseId]]);
});
it("保存失敗時に状態変更を通知しない", async () => {
  state.error = { message: "failed" };
  const listener = vi.fn(); window.addEventListener("favorites-changed", listener);
  const result = await clientAction(request(true));
  expect(result).toMatchObject({ data: { error: expect.any(String) } });
  expect(listener).not.toHaveBeenCalled();
  window.removeEventListener("favorites-changed", listener);
});
it("不正な事例IDと権限のないアカウントでは保存しない", async () => {
  await clientAction(request(true, "invalid"));
  expect(state.write).not.toHaveBeenCalled();
  state.role = "COMPANY";
  await expect(clientAction(request(true))).rejects.toHaveProperty("status", 404);
});
it("ログイン期限が切れても操作していた画面へ戻れる", async () => {
  state.role = "ANONYMOUS";
  const args = { request: new Request("http://localhost/favorites/update", { method: "POST", body: new URLSearchParams({ caseId, saved: "true", redirectTo: `/cases/${caseId}` }) }) } as Parameters<typeof clientAction>[0];
  try { await clientAction(args); throw new Error("Expected redirect"); } catch (error) {
    expect(error).toBeInstanceOf(Response);
    expect((error as Response).headers.get("Location")).toBe(`/login?redirectTo=${encodeURIComponent(`/cases/${caseId}`)}`);
  }
});
