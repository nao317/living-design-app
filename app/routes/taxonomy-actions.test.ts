import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ calls: [] as Array<{ name: string; args: Record<string, unknown> }> }));

vi.mock("../features/auth/authorization.client", () => ({
  requireAuthorization: async () => ({ memberships: [{ companyId: "11111111-1111-4111-8111-111111111111" }] }),
}));
vi.mock("../lib/supabase.client", () => ({
  getSupabaseBrowserClient: () => ({
    rpc: async (name: string, args: Record<string, unknown>) => {
      state.calls.push({ name, args });
      return { error: null };
    },
  }),
}));

import { clientAction as submit } from "./company-tags";
import { clientAction as review } from "./admin-tags";

function request(path: string, values: Record<string, string>) {
  return { request: new Request(`http://localhost${path}`, { method: "POST", body: new URLSearchParams(values) }) };
}

describe("taxonomy request actions", () => {
  beforeEach(() => { state.calls = []; });

  it("submits a company scoped creation request without changing the master directly", async () => {
    const result = await submit(request("/company/tags", {
      intent: "request", kind: "CATEGORY", operation: "CREATE", name: "玄関", reason: "施工事例に必要",
    }) as Parameters<typeof submit>[0]);
    expect(result).toMatchObject({ saved: true });
    expect(state.calls).toEqual([{ name: "submit_taxonomy_request", args: {
      target_company_id: "11111111-1111-4111-8111-111111111111",
      request_kind: "CATEGORY", request_operation: "CREATE", request_target_id: null,
      request_name: "玄関", request_reason: "施工事例に必要",
    } }]);
  });

  it("requires a reason before rejecting an application", async () => {
    const result = await review(request("/admin/tags", {
      requestId: "22222222-2222-4222-8222-222222222222", decision: "REJECTED", reviewReason: "",
    }) as Parameters<typeof review>[0]);
    expect(result).toHaveProperty("data.error", expect.any(String));
    expect(state.calls).toEqual([]);
  });
});
