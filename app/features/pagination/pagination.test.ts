import { describe, expect, it, vi } from "vitest";
import { getPageRange, loadPage, parsePage } from "./pagination";

describe("pagination", () => {
  it("parses only positive integer page parameters", () => {
    expect(parsePage(new URLSearchParams("page=3"))).toBe(3);
    expect(parsePage(new URLSearchParams("page=0"))).toBe(1);
    expect(parsePage(new URLSearchParams("page=1.5"))).toBe(1);
    expect(parsePage(new URLSearchParams("page=1000001"))).toBe(1);
    expect(parsePage(new URLSearchParams("itemsPage=4"), "itemsPage")).toBe(4);
  });

  it("returns an inclusive database range", () => {
    expect(getPageRange(3, 10)).toEqual({ from: 20, to: 29 });
  });

  it("loads the last page when the requested page exceeds the total", async () => {
    const fetchRange = vi.fn(async (from: number, to: number) => ({
      data: Array.from({ length: 23 }, (_, index) => index + 1).slice(from, to + 1),
      count: 23,
      error: null,
    }));
    const result = await loadPage(99, 10, fetchRange);
    expect(result).toEqual({ items: [21, 22, 23], total: 23, page: 3 });
    expect(fetchRange).toHaveBeenNthCalledWith(1, 980, 989);
    expect(fetchRange).toHaveBeenNthCalledWith(2, 20, 29);
  });
});
