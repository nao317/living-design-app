import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  companyId: "11111111-1111-4111-8111-111111111111",
  deleted: false,
  storageError: false,
  calls: [] as string[],
}));

vi.mock("../features/auth/authorization.client", () => ({
  requireAuthorization: async () => ({ memberships: [{ companyId: state.companyId, role: "OWNER" }] }),
  getAuthorizationContext: async () => null,
}));
vi.mock("../features/media/image-storage.client", () => ({
  removeImages: async (_bucket: string, paths: string[]) => {
    state.calls.push(`storage:${paths.join(",")}`);
    return state.storageError ? "Storage error" : null;
  },
}));
vi.mock("../lib/supabase.client", () => ({
  isSupabaseConfigured: () => true,
  getSupabaseBrowserClient: () => ({
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        delete: () => { state.deleted = true; state.calls.push("delete"); return query; },
        maybeSingle: async () => ({
          data: table === "construction_cases"
            ? state.deleted
              ? { id: "22222222-2222-4222-8222-222222222222" }
              : { id: "22222222-2222-4222-8222-222222222222", company_id: "11111111-1111-4111-8111-111111111111", title: "台所の改修" }
            : null,
          error: null,
        }),
        then: (resolve: (result: { data: Array<{ storage_path: string }>; error: null }) => unknown) =>
          resolve({ data: [{ storage_path: "company/case/photo.jpg" }], error: null }),
      };
      return query;
    },
  }),
}));

import { clientAction } from "./company-dashboard";

function deleteRequest() {
  return {
    request: new Request("http://localhost/company", {
      method: "POST",
      body: new URLSearchParams({ intent: "delete-case", caseId: "22222222-2222-4222-8222-222222222222" }),
    }),
  } as Parameters<typeof clientAction>[0];
}

describe("company case deletion", () => {
  beforeEach(() => {
    state.companyId = "11111111-1111-4111-8111-111111111111";
    state.deleted = false;
    state.storageError = false;
    state.calls = [];
  });

  it("removes stored photos before deleting its own case", async () => {
    const result = await clientAction(deleteRequest());
    expect(result.data).toMatchObject({ deleted: true, title: "台所の改修" });
    expect(state.calls).toEqual(["storage:company/case/photo.jpg", "delete"]);
  });

  it("rejects cases from a different company before removing photos", async () => {
    state.companyId = "33333333-3333-4333-8333-333333333333";
    const result = await clientAction(deleteRequest());
    expect(result.data).toMatchObject({ error: "この施工事例は削除できません。" });
    expect(state.calls).toEqual([]);
  });

  it("keeps the case if photo removal fails", async () => {
    state.storageError = true;
    const result = await clientAction(deleteRequest());
    expect(result.data).toMatchObject({ error: "施工写真を削除できませんでした。" });
    expect(state.calls).toEqual(["storage:company/case/photo.jpg"]);
  });
});
