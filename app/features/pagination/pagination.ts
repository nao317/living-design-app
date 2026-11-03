export type PageResult<T> = {
  items: T[];
  total: number;
  page: number;
};

type RangeResult<T> = {
  data: T[] | null;
  error: unknown;
  count: number | null;
};

export function parsePage(params: URLSearchParams, name = "page") {
  const value = Number(params.get(name) ?? "1");
  return Number.isSafeInteger(value) && value > 0 && value <= 1_000_000 ? value : 1;
}

export function getPageRange(page: number, pageSize: number) {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

export function clampPage(page: number, total: number, pageSize: number) {
  return Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
}

export async function loadPage<T>(
  requestedPage: number,
  pageSize: number,
  fetchRange: (from: number, to: number) => PromiseLike<RangeResult<T>>,
): Promise<PageResult<T>> {
  const requestedRange = getPageRange(requestedPage, pageSize);
  const first = await fetchRange(requestedRange.from, requestedRange.to);
  if (first.error) throw first.error;

  const total = first.count ?? 0;
  const page = clampPage(requestedPage, total, pageSize);
  if (page === requestedPage) return { items: first.data ?? [], total, page };

  const range = getPageRange(page, pageSize);
  const corrected = await fetchRange(range.from, range.to);
  if (corrected.error) throw corrected.error;
  return { items: corrected.data ?? [], total, page };
}
