import { z } from "zod";

const optionalPrice = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "") || value === null || value === undefined ? undefined : value,
  z.coerce.number().int().min(0).max(2_147_483_647).optional().catch(undefined),
);

export const searchParamsSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  area: z.string().trim().max(120).catch(""),
  category: z.string().max(100).regex(/^[a-z0-9-]*$/).catch(""),
  priceMin: optionalPrice,
  priceMax: optionalPrice,
  period: z.enum(["", "1", "3"]).catch(""),
  style: z.string().max(100).regex(/^[a-z0-9-]*$/).catch(""),
  sort: z.enum(["newest", "oldest", "price_asc", "price_desc"]).catch("newest"),
  page: z.coerce.number().int().positive().max(1_000_000).catch(1),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

export function parseSearchParams(params: URLSearchParams): SearchParams {
  const values = Object.fromEntries(params);
  for (const [budget, price] of [["budgetMin", "priceMin"], ["budgetMax", "priceMax"]]) {
    if (!(price in values) && values[budget]?.trim()) {
      const amount = Number(values[budget]);
      values[price] = Number.isFinite(amount) && amount >= 0 ? String(Math.round(amount * 10000)) : "";
    }
  }
  return searchParamsSchema.parse(values);
}

export function hasInvalidPriceRange(filters: SearchParams) {
  return filters.priceMin !== undefined && filters.priceMax !== undefined && filters.priceMin > filters.priceMax;
}
