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

it("万円の小数を円へ変換し、既存の円単位URLも維持する", () => {
  expect(parseSearchParams(new URLSearchParams("budgetMin=12.5&budgetMax=300"))).toMatchObject({ priceMin: 125000, priceMax: 3000000 });
  expect(parseSearchParams(new URLSearchParams("priceMin=100&priceMax=300"))).toMatchObject({ priceMin: 100, priceMax: 300 });
  const empty = parseSearchParams(new URLSearchParams("budgetMin=&budgetMax="));
  expect(empty.priceMin).toBeUndefined();
  expect(empty.priceMax).toBeUndefined();
  expect(hasInvalidPriceRange(parseSearchParams(new URLSearchParams("budgetMin=300&budgetMax=100")))).toBe(true);
});
