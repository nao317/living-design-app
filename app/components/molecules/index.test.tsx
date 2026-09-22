import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { CaseCard, FavoriteButton } from "./index";
import { cases } from "../../data/mock";

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
    render(<MemoryRouter><CaseCard item={cases[0]} /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: cases[0].title })).toBeInTheDocument();
    expect(screen.getByText(cases[0].company)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: cases[0].title })).toHaveAttribute("href", `/cases/${cases[0].id}`);
  });
});
