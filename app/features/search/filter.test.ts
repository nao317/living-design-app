import { describe, expect, it } from "vitest";
import { filterSearchRecords, type SearchRecord } from "./filter";
import { parseSearchParams } from "./schema";

const records: SearchRecord[] = [
  {
    id: "1", title: "キッチン改修", summary: "収納を増やしました", area: "飯塚市", companyName: "青空工務店",
    companyAddress: "福岡県飯塚市", categorySlugs: ["kitchen"], categoryNames: ["キッチン"],
    styleSlugs: ["storage"], styleNames: ["収納"], priceMin: 100, priceMax: 200,
    periodMonths: 0.5, publishedAt: "2026-01-02",
  },
  {
    id: "2", title: "居間の改装", summary: "断熱材を追加", area: "直方市", companyName: "住まい工房",
    companyAddress: "福岡県直方市", categorySlugs: ["living"], categoryNames: ["リビング"],
    styleSlugs: ["insulation"], styleNames: ["断熱"], priceMin: 300, priceMax: 400,
    periodMonths: 2, publishedAt: "2026-01-03",
  },
];

function ids(query: string) {
  return filterSearchRecords(records, parseSearchParams(new URLSearchParams(query))).map((record) => record.id);
}

describe("case search filters", () => {
  it("finds words in the title, company, and tag names", () => {
    expect(ids("q=キッチン")).toEqual(["1"]);
    expect(ids("q=青空工務店")).toEqual(["1"]);
    expect(ids("q=断熱")).toEqual(["2"]);
    expect(ids("q=飯塚%20収納")).toEqual(["1"]);
  });

  it("combines category, style, keyword, and area conditions", () => {
    expect(ids("q=キッチン&category=kitchen&style=storage&area=飯塚")).toEqual(["1"]);
    expect(ids("q=キッチン&category=living")).toEqual([]);
    expect(ids("style=insulation")).toEqual(["2"]);
  });

  it("applies price, period, and sort conditions", () => {
    expect(ids("priceMin=&priceMax=&period=1")).toEqual(["1"]);
    expect(ids("priceMin=250&sort=price_desc")).toEqual(["2"]);
    expect(ids("sort=oldest")).toEqual(["1", "2"]);
  });
});
