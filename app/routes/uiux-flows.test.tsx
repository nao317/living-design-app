import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { expect, it, vi } from "vitest";
import AdminDashboardRoute from "./admin-dashboard";
import CaseDetailRoute from "./case-detail";
import { formatPriceRange } from "../features/cases/format";
import { priceErrors } from "../features/forms/validation";

it("管理者の削除確認をキャンセルすると送信せず、確定時だけ送信する", async () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const action = vi.fn(() => ({ saved: true }));
  const props = { loaderData: { users: [], companies: [], applications: [], posts: [{ id: "case", title: "台所の改修", status: "PUBLISHED", company_id: "company" }] } } as unknown as Parameters<typeof AdminDashboardRoute>[0];
  render(<RouterProvider router={createMemoryRouter([{ path: "/", element: <AdminDashboardRoute {...props} />, action }])} />);
  fireEvent.click(screen.getByRole("button", { name: "削除" }));
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining("台所の改修"));
  expect(action).not.toHaveBeenCalled();
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "削除" }));
  await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
  confirm.mockRestore();
});

it("詳細画面の戻るリンクで検索条件とページを保ち、施工写真を前後と断定しない", () => {
  const props = { loaderData: { item: { id: "case", title: "台所の改修", company: "施工会社", companyId: "company", image: "/one.jpg", area: "飯塚", price: "要相談", period: "", categories: [], summary: "", images: ["/one.jpg", "/two.jpg"] } } } as unknown as Parameters<typeof CaseDetailRoute>[0];
  render(<RouterProvider router={createMemoryRouter([{ path: "/cases/case", element: <CaseDetailRoute {...props} /> }], { initialEntries: [{ pathname: "/cases/case", state: { searchReturnTo: "/search?area=飯塚&page=2" } }] })} />);
  expect(screen.getByRole("link", { name: "検索結果へ戻る" })).toHaveAttribute("href", "/search?area=飯塚&page=2");
  expect(screen.queryByText("BEFORE")).not.toBeInTheDocument();
  expect(screen.queryByText("AFTER")).not.toBeInTheDocument();
  const show = vi.fn();
  const close = vi.fn();
  const dialog = document.querySelector("dialog")!;
  dialog.showModal = show;
  dialog.close = close;
  fireEvent.click(screen.getByRole("button", { name: "施工写真2を拡大" }));
  expect(show).toHaveBeenCalledTimes(1);
  expect(dialog.querySelector("img")).toHaveAttribute("src", "/two.jpg");
});

it("円単位の費用を表示し、逆転した範囲は保存前に拒否する", () => {
  expect(formatPriceRange(100000, 200000)).toBe("￥100,000〜￥200,000");
  expect(formatPriceRange(null, null)).toBe("要相談");
  expect(Object.keys(priceErrors("200000", "100000"))).toEqual(["priceMin", "priceMax"]);
  expect(priceErrors("", "")).toEqual({});
});

it("共有した詳細URLや別タブからも検索条件付きの一覧へ戻れる", () => {
  const props = { loaderData: { item: { id: "case", title: "台所の改修", company: "施工会社", companyId: "company", image: "", area: "飯塚", price: "要相談", period: "", categories: [], summary: "" } } } as unknown as Parameters<typeof CaseDetailRoute>[0];
  render(<RouterProvider router={createMemoryRouter([{ path: "/cases/case", element: <CaseDetailRoute {...props} /> }], { initialEntries: [`/cases/case?returnTo=${encodeURIComponent("/search?area=飯塚&page=2")}`] })} />);
  expect(screen.getByRole("link", { name: "検索結果へ戻る" })).toHaveAttribute("href", "/search?area=飯塚&page=2");
});
