import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, useLoaderData } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import CompanyCaseEditRoute, { clientAction } from "./company-case-edit";

const state = vi.hoisted(() => ({ calls: [] as Array<{ table: string; operation: string }>, upload: vi.fn(), remove: vi.fn() }));
const caseId = "22222222-2222-4222-8222-222222222222";
const companyId = "11111111-1111-4111-8111-111111111111";
vi.mock("../features/auth/authorization.client", () => ({ requireAuthorization: async () => ({ accountRole: "COMPANY", memberships: [{ companyId: "11111111-1111-4111-8111-111111111111", role: "EDITOR" }] }) }));
vi.mock("../lib/supabase.client", () => ({ isSupabaseConfigured: () => true, getSupabaseBrowserClient: () => ({ from: (table: string) => {
  let operation = "select";
  const query = {
    select: () => query, eq: () => query,
    update: () => { operation = "update"; state.calls.push({ table, operation }); return query; },
    delete: () => { operation = "delete"; state.calls.push({ table, operation }); return query; },
    maybeSingle: async () => ({ data: operation === "select" ? { company_id: "11111111-1111-4111-8111-111111111111", status: "PUBLISHED", published_at: "2026-01-01" } : { id: "22222222-2222-4222-8222-222222222222", status: "PUBLISHED" }, error: null }),
    then: (resolve: (result: { error: null }) => void) => resolve({ error: null }),
  }; return query;
} }) }));
vi.mock("../features/media/image-storage.client", async importOriginal => ({ ...await importOriginal<typeof import("../features/media/image-storage.client")>(), uploadImage: state.upload, removeImages: state.remove }));

const existing = { id: "image-one", storagePath: "one.jpg", url: "/one.jpg" };
const uploaded = { id: "image-two", storagePath: "two.jpg", url: "/two.jpg" };
const item = { id: caseId, companyId, title: "台所の改修", summary: "工事の内容", area: "飯塚", period: "1か月", status: "PUBLISHED", company: "施工会社", image: "/one.jpg", categories: [], price: "要相談" };
function view(images = [existing]) {
  return { loaderData: { item, caseId, caseImages: images, categories: [], styles: [], selectedCategoryIds: [], selectedStyleIds: [] } } as unknown as Parameters<typeof CompanyCaseEditRoute>[0];
}
beforeEach(() => { vi.clearAllMocks(); state.calls = []; sessionStorage.clear(); });

it("画像の登録が反映されたらファイル選択だけを解除し、編集中のテキストを残す", async () => {
  let props = view();
  const router = createMemoryRouter([{ path: "/company/cases/:caseId/edit", loader: () => props, HydrateFallback: () => null, Component: () => <CompanyCaseEditRoute {...useLoaderData<ReturnType<typeof view>>()} /> }], { initialEntries: [`/company/cases/${caseId}/edit`] });
  render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { name: "施工事例の編集" });
  const input = document.querySelector<HTMLInputElement>('input[name="images"]')!;
  fireEvent.change(input, { target: { files: [new File(["photo"], "two.png", { type: "image/png" })] } });
  fireEvent.change(screen.getByRole("textbox", { name: "タイトル" }), { target: { value: "入力中のタイトル" } });
  expect(input.files).toHaveLength(1);
  props = view([existing, uploaded]);
  await act(async () => { await router.revalidate(); });
  await waitFor(() => expect(document.querySelector<HTMLInputElement>('input[name="images"]')!.files).toHaveLength(0));
  expect(screen.getByRole("textbox", { name: "タイトル" })).toHaveValue("入力中のタイトル");
  expect(screen.getAllByRole("img", { name: "施工事例" })).toHaveLength(2);
});

it("画像の変更を伴わない再読込では、まだ保存していないファイル選択を消さない", async () => {
  const props = view();
  const router = createMemoryRouter([{ path: "/company/cases/:caseId/edit", loader: () => props, HydrateFallback: () => null, Component: () => <CompanyCaseEditRoute {...useLoaderData<ReturnType<typeof view>>()} /> }], { initialEntries: [`/company/cases/${caseId}/edit`] });
  render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { name: "施工事例の編集" });
  const input = document.querySelector<HTMLInputElement>('input[name="images"]')!;
  fireEvent.change(input, { target: { files: [new File(["photo"], "two.png", { type: "image/png" })] } });
  await act(async () => { await router.revalidate(); });
  expect(document.querySelector<HTMLInputElement>('input[name="images"]')!.files).toHaveLength(1);
});

it("本文だけの保存を繰り返しても画像をアップロード・追加・削除しない", async () => {
  for (const summary of ["最初の変更", "次の変更"]) {
    const body = new FormData();
    for (const [key, value] of Object.entries({ title: item.title, area: item.area, period: item.period, summary, priceMin: "", priceMax: "", status: "PUBLISHED" })) body.set(key, value);
    body.set("images", new File([], "", { type: "application/octet-stream" }));
    const result = await clientAction({ request: { formData: async () => body }, params: { caseId } } as Parameters<typeof clientAction>[0]);
    expect(result).toMatchObject({ data: { saved: true } });
  }
  expect(state.upload).not.toHaveBeenCalled();
  expect(state.remove).not.toHaveBeenCalled();
  expect(state.calls.filter(call => call.table === "case_images")).toEqual([]);
});
