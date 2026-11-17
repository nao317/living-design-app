import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CaseGallery } from "./case-gallery";

it("代表画像は先頭に保ち、追加画像を日付順で説明付きのタイムラインに表示する", () => {
  render(<CaseGallery title="台所の改修"
    images={["/cover.jpg", "/after.jpg", "/before.jpg", "/undated.jpg"]}
    details={[{}, { date: "2026-11-01", description: "収納の設置が完了" }, { date: "2026-10-01", description: "工事を開始\n壁を撤去" }, { description: "細部の様子" }]} />);
  expect(screen.getByRole("button", { name: "施工写真1を拡大" }).querySelector("img")).toHaveAttribute("src", "/cover.jpg");
  const entries = within(screen.getByRole("region", { name: "施工の記録" })).getAllByRole("listitem");
  expect(entries.map(entry => entry.querySelector("img")?.getAttribute("src"))).toEqual(["/before.jpg", "/after.jpg", "/undated.jpg"]);
  expect(entries[0].querySelector("time")).toHaveAttribute("datetime", "2026-10-01");
  expect(entries[0]).toHaveTextContent("工事を開始 壁を撤去");
  expect(entries[2]).toHaveTextContent("日付未設定");
  const dialog = screen.getByRole("dialog", { hidden: true });
  const show = vi.fn();
  Object.assign(dialog, { showModal: show });
  fireEvent.click(within(entries[0]).getByRole("button"));
  expect(show).toHaveBeenCalledOnce();
  expect(dialog.querySelector("img")).toHaveAttribute("src", "/before.jpg");
});

it("代表画像だけの場合はタイムラインを表示しない", () => {
  render(<CaseGallery title="台所の改修" images={["/cover.jpg"]} />);
  expect(screen.queryByRole("region", { name: "施工の記録" })).not.toBeInTheDocument();
});
