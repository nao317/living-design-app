import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DashboardLayout } from "./dashboard-layout";

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => vi.unstubAllGlobals());

it("モバイルサイドバーを開閉し、Escapeでトリガーへフォーカスを戻す", async () => {
  render(<MemoryRouter initialEntries={["/company/cases"]}><DashboardLayout type="company"><h1>施工事例</h1></DashboardLayout></MemoryRouter>);
  const trigger = screen.getByRole("button", { name: "メニュー" });
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("button", { name: "メニューを閉じる" })).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole("link", { name: "ダッシュボード" })).toHaveFocus());
  fireEvent.keyDown(document, { key: "Escape" });
  await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
  expect(trigger).toHaveFocus();
});
