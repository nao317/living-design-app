import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CaseCard, FavoriteButton, Pagination } from "./index";

const state = vi.hoisted(() => ({ authorization: null as null | { userId: string; accountRole: string }, ids: new Set<string>() }));
vi.mock("../../features/favorites/favorites-context", () => ({ useFavorites: () => ({ state, meta: { ready: true, error: false } }) }));
beforeEach(() => { state.authorization = null; state.ids = new Set(); });

const caseItem = {
  id: "case-id",
  title: "テスト施工事例",
  company: "テスト企業",
  companyId: "company-id",
  image: "/case.jpg",
  area: "飯塚市",
  price: "100〜200",
  period: "1か月",
  categories: ["キッチン"],
  summary: "テスト概要",
};

describe("FavoriteButton", () => {
  it("未ログイン時は元の画面を保持してログインへ案内する", async () => {
    const router = createMemoryRouter([{ path: "/", element: <FavoriteButton caseId="case-id" /> }, { path: "/login", element: <h1>ログイン</h1> }], { initialEntries: ["/?area=飯塚"] });
    render(<RouterProvider router={router} />);
    const link = screen.getByRole("link", { name: "ログインしてお気に入りに追加" });
    expect(link).toHaveAttribute("href", "/login?redirectTo=%2F%3Farea%3D%E9%A3%AF%E5%A1%9A");
    fireEvent.click(link);
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    expect(new URLSearchParams(router.state.location.search).get("redirectTo")).toBe("/?area=飯塚");
  });
  it("保存済み状態を表示し、保存失敗を成功として表示しない", async () => {
    state.authorization = { userId: "user", accountRole: "GENERAL" };
    state.ids.add("case-id");
    const router = createMemoryRouter([{ path: "/", element: <FavoriteButton caseId="case-id" /> }, { path: "/favorites/update", action: () => ({ error: "通信できませんでした。" }) }]);
    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByRole("button", { name: "お気に入りから削除" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("通信できませんでした。");
    expect(screen.getByRole("button", { name: "お気に入りから削除" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("CaseCard", () => {
  it("施工事例の主要情報と詳細導線を表示する", () => {
    render(<RouterProvider router={createMemoryRouter([{ path: "/", element: <CaseCard item={caseItem} /> }])} />);
    expect(screen.getByRole("heading", { name: caseItem.title })).toBeInTheDocument();
    expect(screen.getByText(caseItem.company)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: caseItem.title })).toHaveAttribute("href", `/cases/${caseItem.id}`);
  });
});

it("現在位置と前後のページを示し、検索条件を保持する", () => {
  render(<RouterProvider router={createMemoryRouter([{ path: "/", element: <Pagination totalItems={10_000_000} currentPage={500_000} /> }], { initialEntries: ["/?q=収納"] })} />);
  expect(screen.getAllByRole("link")).toHaveLength(2);
  expect(screen.getByText("500,000ページ、全1,000,000ページ")).toHaveClass("sr-only");
  expect(screen.getByRole("link", { name: "次のページ" }).getAttribute("href")).toContain("page=500001");
  expect(new URLSearchParams(screen.getByRole("link", { name: "次のページ" }).getAttribute("href")!.slice(1)).get("q")).toBe("収納");
});

it("移動先がない前後リンクは非活性表示せず非表示にする", () => {
  const router = createMemoryRouter([{ path: "/", element: <Pagination totalItems={30} currentPage={1} /> }]);
  const { rerender } = render(<RouterProvider router={router} />);
  expect(screen.queryByRole("link", { name: "前のページ" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "次のページ" })).toBeInTheDocument();

  rerender(<RouterProvider router={createMemoryRouter([{ path: "/", element: <Pagination totalItems={30} currentPage={3} /> }])} />);
  expect(screen.getByRole("link", { name: "前のページ" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "次のページ" })).not.toBeInTheDocument();
});

it("指定された一覧では1ページだけでも現在位置を表示する", () => {
  render(<RouterProvider router={createMemoryRouter([{
    path: "/",
    element: <Pagination totalItems={6} pageSize={10} showSinglePage />,
  }])} />);
  expect(screen.getByRole("navigation", { name: "ページ送り" })).toBeInTheDocument();
  expect(screen.getByText("1ページ、全1ページ")).toHaveClass("sr-only");
  expect(screen.queryByRole("link", { name: "前のページ" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "次のページ" })).not.toBeInTheDocument();
});

it("同じ画面の一覧ごとにページパラメータとラベルを分ける", () => {
  render(<RouterProvider router={createMemoryRouter([{
    path: "/",
    element: <Pagination totalItems={30} currentPage={2} paramName="usersPage" ariaLabel="ユーザー管理のページ送り" />,
  }], { initialEntries: ["/?postsPage=3"] })} />);
  const navigation = screen.getByRole("navigation", { name: "ユーザー管理のページ送り" });
  const next = within(navigation).getByRole("link", { name: "次のページ" });
  const params = new URLSearchParams(next.getAttribute("href")!.slice(1));
  expect(params.get("usersPage")).toBe("3");
  expect(params.get("postsPage")).toBe("3");
});
