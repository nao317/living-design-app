import type { SearchParams } from "./schema";

export type SearchRecord = {
  id: string;
  title: string;
  summary: string;
  area: string;
  companyName: string;
  companyAddress: string;
  categorySlugs: string[];
  categoryNames: string[];
  styleSlugs: string[];
  styleNames: string[];
  priceMin: number | null;
  priceMax: number | null;
  periodMonths: number | null;
  publishedAt: string | null;
};

export function filterSearchRecords(records: SearchRecord[], filters: SearchParams) {
  const words = filters.q.toLocaleLowerCase("ja-JP").split(/[\s\u3000]+/).filter(Boolean);
  return records.filter((record) => {
    const searchable = [record.title, record.summary, record.area, record.companyName, record.companyAddress,
      ...record.categoryNames, ...record.styleNames].join(" ").toLocaleLowerCase("ja-JP");
    if (!words.every((word) => searchable.includes(word))) return false;
    if (filters.area && !record.area.toLocaleLowerCase("ja-JP").includes(filters.area.toLocaleLowerCase("ja-JP"))) return false;
    if (filters.category && !record.categorySlugs.includes(filters.category)) return false;
    if (filters.style && !record.styleSlugs.includes(filters.style)) return false;
    const hasPrice = record.priceMin !== null || record.priceMax !== null;
    if (filters.priceMin !== undefined && (!hasPrice || record.priceMax !== null && record.priceMax < filters.priceMin)) return false;
    if (filters.priceMax !== undefined && (!hasPrice || record.priceMin !== null && record.priceMin > filters.priceMax)) return false;
    if (filters.period && (record.periodMonths === null || record.periodMonths > Number(filters.period))) return false;
    return true;
  }).sort((a, b) => {
    if (filters.sort === "oldest") return (a.publishedAt ?? "").localeCompare(b.publishedAt ?? "") || b.id.localeCompare(a.id);
    if (filters.sort === "price_asc" || filters.sort === "price_desc") {
      const aPrice = a.priceMin ?? a.priceMax;
      const bPrice = b.priceMin ?? b.priceMax;
      if (aPrice === null && bPrice !== null) return 1;
      if (bPrice === null && aPrice !== null) return -1;
      if (aPrice !== null && bPrice !== null && aPrice !== bPrice) {
        return filters.sort === "price_asc" ? aPrice - bPrice : bPrice - aPrice;
      }
    }
    return (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "") || b.id.localeCompare(a.id);
  });
}
