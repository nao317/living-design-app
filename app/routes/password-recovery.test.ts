import { beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ reset: vi.fn(), update: vi.fn(), user: true }));
vi.mock("../lib/supabase.client", () => ({ isSupabaseConfigured: () => true, getSupabaseBrowserClient: () => ({ auth: {
  resetPasswordForEmail: state.reset,
  updateUser: state.update,
  getUser: async () => ({ data: { user: state.user ? { id: "user" } : null }, error: null }),
} }) }));
import { clientAction as forgot } from "./forgot-password";
import { clientAction as reset } from "./reset-password";
import { getAuthErrorMessage } from "../features/auth/auth.client";

function request(values: Record<string, string>) { return { request: new Request("http://localhost", { method: "POST", body: new URLSearchParams(values) }) }; }
beforeEach(() => { vi.clearAllMocks(); state.user = true; state.reset.mockResolvedValue({ error: null }); state.update.mockResolvedValue({ error: null }); });
it("登録メールへ再設定画面のリンクを送信する", async () => {
  expect(await forgot(request({ email: "test@example.com" }) as Parameters<typeof forgot>[0])).toEqual({ sent: true });
  expect(state.reset).toHaveBeenCalledWith("test@example.com", { redirectTo: new URL("/reset-password", window.location.origin).toString() });
});
it("不一致のパスワードは項目エラーを返し、更新しない", async () => {
  const result = await reset(request({ password: "password123", passwordConfirmation: "password456" }) as Parameters<typeof reset>[0]);
  expect(result).toMatchObject({ fieldErrors: { passwordConfirmation: "パスワードが一致しません。" } });
  expect(state.update).not.toHaveBeenCalled();
});
it("セッションがない利用者のパスワードを更新しない", async () => {
  state.user = false;
  const result = await reset(request({ password: "password123", passwordConfirmation: "password123" }) as Parameters<typeof reset>[0]);
  expect(result).toMatchObject({ error: expect.stringContaining("有効期限") });
  expect(state.update).not.toHaveBeenCalled();
});
it("確認できた利用者のパスワードを更新する", async () => {
  expect(await reset(request({ password: "password123", passwordConfirmation: "password123" }) as Parameters<typeof reset>[0])).toEqual({ saved: true });
  expect(state.update).toHaveBeenCalledWith({ password: "password123" });
});
it("認証エラーを利用者が対処できる表現にする", () => {
  expect(getAuthErrorMessage({ code: "email_not_confirmed" })).toContain("確認メール");
  expect(getAuthErrorMessage(new Error("Supabaseの接続情報: .env"))).not.toMatch(/Supabase|\.env/);
});
