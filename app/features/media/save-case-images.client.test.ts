import { beforeEach, expect, it, vi } from "vitest";
import { saveCaseImages } from "./save-case-images.client";
import type { CaseImageChanges } from "./case-image-form";

const state = vi.hoisted(() => ({ rpc: vi.fn(), upload: vi.fn(), remove: vi.fn() }));
vi.mock("../../lib/supabase.client", () => ({ getSupabaseBrowserClient: () => ({ rpc: state.rpc }) }));
vi.mock("./image-storage.client", async importOriginal => ({ ...await importOriginal<typeof import("./image-storage.client")>(), uploadImage: state.upload, removeImages: state.remove }));

const original = [{ id: "cover", storage_path: "company/case/old.jpg", display_order: 0 }];
function changes(): CaseImageChanges { return { files: [], removedIds: [], existing: [], added: [] }; }
beforeEach(() => {
  vi.clearAllMocks();
  state.rpc.mockResolvedValue({ error: null });
  state.upload.mockResolvedValue({ path: "company/case/new.jpg", error: null });
  state.remove.mockResolvedValue(null);
});

it("写真と日付・説明を一度に保存し、代表画像を維持する", async () => {
  const input = changes();
  input.files = [new File(["photo"], "new.jpg", { type: "image/jpeg" })];
  input.added = [{ date: "2026-11-18", description: "内装が完成" }];
  expect(await saveCaseImages("case", "company", original, input)).toBeNull();
  expect(state.rpc).toHaveBeenCalledWith("save_case_images", expect.objectContaining({
    image_updates: [expect.objectContaining({ storage_path: "company/case/new.jpg", taken_on: "2026-11-18", description: "内装が完成", display_order: 1 })],
  }));
  expect(state.remove).not.toHaveBeenCalled();
});

it("保存失敗時は新規ファイルのみ片付け、現在の代表画像を消さない", async () => {
  const input = changes();
  input.cover = new File(["photo"], "cover.jpg", { type: "image/jpeg" });
  state.rpc.mockResolvedValue({ error: { message: "permission denied" } });
  expect(await saveCaseImages("case", "company", original, input)).toContain("保存できません");
  expect(state.remove).toHaveBeenCalledExactlyOnceWith("case-images", ["company/case/new.jpg"]);
});

it("代表画像の差し替えは保存後に旧ファイルを片付ける", async () => {
  const input = changes();
  input.cover = new File(["photo"], "cover.jpg", { type: "image/jpeg" });
  await saveCaseImages("case", "company", original, input);
  expect(state.rpc).toHaveBeenCalledWith("save_case_images", expect.objectContaining({ image_updates: [expect.objectContaining({ id: "cover", display_order: 0 })] }));
  expect(state.remove).toHaveBeenCalledExactlyOnceWith("case-images", ["company/case/old.jpg"]);
  expect(state.remove.mock.invocationCallOrder[0]).toBeGreaterThan(state.rpc.mock.invocationCallOrder[0]);
});

it("変更のない画像は保存し直さない", async () => {
  expect(await saveCaseImages("case", "company", original, changes())).toBeNull();
  expect(state.rpc).not.toHaveBeenCalled();
  expect(state.upload).not.toHaveBeenCalled();
});
