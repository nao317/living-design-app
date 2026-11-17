import { beforeEach, expect, it, vi } from "vitest";

const companyId = "11111111-1111-4111-8111-111111111111";
const state = vi.hoisted(() => ({ update: vi.fn(), client: vi.fn() }));
vi.mock("../features/auth/authorization.client", () => ({ requireAuthorization: async () => ({ accountRole: "COMPANY", memberships: [{ companyId: "11111111-1111-4111-8111-111111111111", role: "OWNER" }] }) }));
vi.mock("../lib/supabase.client", () => ({ isSupabaseConfigured: () => true, getSupabaseBrowserClient: state.client }));
import { clientAction } from "./company-profile-edit";

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  state.client.mockReturnValue({ from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { logo_path: null, cover_image_path: null }, error: null }) }) }),
    update: state.update,
  }) });
  state.update.mockReturnValue({ eq: vi.fn(async () => ({ error: null })) });
});
function submit(founded: string) {
  const body = new FormData();
  for (const [key, value] of Object.entries({ name: "施工会社", email: "", founded, phone: "", website: "", address: "", businessHours: "", description: "" })) body.set(key, value);
  return clientAction({ request: new Request("http://localhost/company/profile/edit", { method: "POST", body }) } as Parameters<typeof clientAction>[0]);
}
it.each(["201831", "2018/3/1", "2018年3月1日", "不明", "0", "-2018", "2018.5"])("設立年 %s を数値に連結せず、DBへ送る前に項目エラーで止める", async founded => {
  const result = await submit(founded);
  expect(result).toMatchObject({ data: { fieldErrors: { founded: expect.stringContaining("西暦4桁") } } });
  expect(state.client).not.toHaveBeenCalled();
  expect(state.update).not.toHaveBeenCalled();
});
it.each(["2018", "2018年", "２０１８", " 2018 "])("有効な設立年 %s は整数で保存する", async founded => {
  expect(await submit(founded)).toMatchObject({ data: { saved: true } });
  expect(state.update).toHaveBeenCalledWith(expect.objectContaining({ founded_year: 2018 }));
  expect(state.update.mock.results[0].value.eq).toHaveBeenCalledWith("id", companyId);
});
it("設立年を空にした場合は未登録として保存する", async () => {
  await submit("");
  expect(state.update).toHaveBeenCalledWith(expect.objectContaining({ founded_year: null }));
});
