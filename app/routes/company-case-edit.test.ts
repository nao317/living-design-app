import { expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ updated: false }));

vi.mock("../features/auth/authorization.client", () => ({
  requireAuthorization: async () => ({
    accountRole: "COMPANY",
    memberships: [{ companyId: "11111111-1111-4111-8111-111111111111", role: "EDITOR" }],
  }),
}));
vi.mock("../lib/supabase.client", () => ({
  isSupabaseConfigured: () => true,
  getSupabaseBrowserClient: () => ({
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        update: () => { state.updated = true; return query; },
        maybeSingle: async () => ({ data: { company_id: "33333333-3333-4333-8333-333333333333", status: "PUBLISHED", published_at: null }, error: null }),
      };
      return query;
    },
  }),
}));

import { clientAction } from "./company-case-edit";

it("does not let a company edit another company's published case", async () => {
  state.updated = false;
  const request = new Request("http://localhost/company/cases/22222222-2222-4222-8222-222222222222/edit", {
    method: "POST",
    body: new URLSearchParams({ title: "他社事例", area: "飯塚", period: "1か月", summary: "", priceMin: "", priceMax: "", status: "PUBLISHED" }),
  });
  const result = await clientAction({ request, params: { caseId: "22222222-2222-4222-8222-222222222222" } } as Parameters<typeof clientAction>[0]);
  expect(result.data).toMatchObject({ error: "この施工事例は編集できません。" });
  expect(state.updated).toBe(false);
});
