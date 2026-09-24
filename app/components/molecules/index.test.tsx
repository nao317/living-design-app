import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { CaseCard, FavoriteButton } from "./index";

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
  it("お気に入り状態を切り替えられる", () => {
    render(<FavoriteButton />);
    const button = screen.getByRole("button", { name: "お気に入りに追加" });
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: "お気に入りから削除" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("CaseCard", () => {
  it("施工事例の主要情報と詳細導線を表示する", () => {
    render(<MemoryRouter><CaseCard item={caseItem} /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: caseItem.title })).toBeInTheDocument();
    expect(screen.getByText(caseItem.company)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: caseItem.title })).toHaveAttribute("href", `/cases/${caseItem.id}`);
  });
});
