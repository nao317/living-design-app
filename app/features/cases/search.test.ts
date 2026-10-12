import { describe, expect, it, vi } from "vitest";
import { parseSearchParams } from "../search/schema";

const { getSupabaseBrowserClient, rpc } = vi.hoisted(() => {
  const tables: Record<string, Array<Record<string, unknown>>> = {
    construction_cases: [
      { id: "case-1", company_id: "company-1", title: "台所の改修", summary: "収納を追加", area: "飯塚市", price_min: 100, price_max: 200, construction_period: "2週間", published_at: "2026-01-02", status: "PUBLISHED" },
      { id: "case-2", company_id: "company-1", title: "居間の改修", summary: "断熱を改善", area: "飯塚市", price_min: 300, price_max: 400, construction_period: "2か月", published_at: "2026-01-01", status: "PUBLISHED" },
    ],
    companies: [{ id: "company-1", name: "青空工務店", address: "飯塚市", status: "PUBLISHED", logo_path: null, cover_image_path: null }],
    case_categories: [
      { case_id: "case-1", categories: { slug: "kitchen", name: "キッチン" } },
      { case_id: "case-2", categories: { slug: "living", name: "リビング" } },
    ],
    case_styles: [
      { case_id: "case-1", styles: { slug: "storage", name: "収納" } },
      { case_id: "case-2", styles: { slug: "insulation", name: "断熱" } },
    ],
    case_images: [],
  };
  const rpc = vi.fn(async () => ({ data: null, error: { code: "PGRST202" } }));
  const getSupabaseBrowserClient = vi.fn(() => ({
    rpc,
    from: (table: string) => {
      let rows = [...(tables[table] ?? [])];
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => { rows = rows.filter((row) => row[column] === value); return query; },
        neq: (column: string, value: unknown) => { rows = rows.filter((row) => row[column] !== value); return query; },
        in: (column: string, values: unknown[]) => { rows = rows.filter((row) => values.includes(row[column])); return query; },
        order: () => query,
        range: (start: number, end: number) => { rows = rows.slice(start, end + 1); return query; },
        then: (resolve: (value: { data: typeof rows; error: null }) => unknown) => resolve({ data: rows, error: null }),
      };
      return query;
    },
  }));
  return { getSupabaseBrowserClient, rpc };
});

vi.mock("../../lib/supabase.client", () => ({ getSupabaseBrowserClient, isSupabaseConfigured: () => true }));
vi.mock("../media/image-storage.client", () => ({ getSignedImageUrl: async () => null }));

import { searchPublishedCases } from "./public-data.client";

describe("searchPublishedCases without a database search function", () => {
  it("finds keyword and tag matches from the published tables", async () => {
    const first = await searchPublishedCases(parseSearchParams(new URLSearchParams("q=青空&category=kitchen")), 10);
    expect(first.total).toBe(1);
    expect(first.items.map((item) => item.id)).toEqual(["case-1"]);

    const second = await searchPublishedCases(parseSearchParams(new URLSearchParams("q=断熱&style=insulation")), 10);
    expect(second.total).toBe(1);
    expect(second.items.map((item) => item.id)).toEqual(["case-2"]);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
