import { describe, expect, it } from "vitest";
import { hasInvalidPriceRange, parseSearchParams } from "./schema";

describe("search parameters", () => {
  it("treats empty price fields as unspecified", () => {
    const filters = parseSearchParams(new URLSearchParams("q=kitchen&priceMin=&priceMax="));
    expect(filters.priceMin).toBeUndefined();
    expect(filters.priceMax).toBeUndefined();
    expect(filters.q).toBe("kitchen");
  });

  it("keeps combined conditions and normalizes an invalid page", () => {
    const filters = parseSearchParams(new URLSearchParams("q=収納&area=飯塚&category=kitchen&style=natural&sort=price_asc&page=-1"));
    expect(filters).toMatchObject({ q: "収納", area: "飯塚", category: "kitchen", style: "natural", sort: "price_asc", page: 1 });
  });

  it("detects a reversed price range", () => {
    const filters = parseSearchParams(new URLSearchParams("priceMin=300&priceMax=100"));
    expect(hasInvalidPriceRange(filters)).toBe(true);
  });
});
