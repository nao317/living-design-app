const yen = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });
// Database prices and search parameters are integer yen. Do not convert stored values.
export function formatPriceRange(min: number | null, max: number | null) {
  if (min === null && max === null) return "要相談";
  if (min === null) return `${yen.format(max!)}まで`;
  if (max === null) return `${yen.format(min)}から`;
  if (min === max) return yen.format(min);
  return `${yen.format(min)}〜${yen.format(max)}`;
}
