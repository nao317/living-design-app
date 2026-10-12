import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { Filters } from "./index";

describe("Filters", () => {
  it("restores combined URL conditions and uses all supplied master options", () => {
    const router = createMemoryRouter([{
      path: "/",
      element: <Filters
          filters={{ q: "収納", area: "飯塚", category: "interior", style: "natural", priceMin: 100, priceMax: 300, period: "3", sort: "price_asc", page: 2 }}
          categories={[{ slug: "interior", name: "内装" }]}
          styles={[{ slug: "natural", name: "自然素材" }]}
        />,
    }]);
    render(<RouterProvider router={router} />);

    expect(screen.getByRole("textbox", { name: "キーワード" })).toHaveValue("収納");
    expect(screen.getByRole("textbox", { name: "施工地域" })).toHaveValue("飯塚");
    expect(screen.getByRole("combobox", { name: "リノベーション箇所" })).toHaveValue("interior");
    expect(screen.getByRole("combobox", { name: "こだわり条件" })).toHaveValue("natural");
    expect(screen.getByRole("combobox", { name: "並び順" })).toHaveValue("price_asc");
    expect(screen.getByRole("spinbutton", { name: "予算下限" })).toHaveValue(100);
    expect(screen.getByRole("spinbutton", { name: "予算上限" })).toHaveValue(300);
    expect(screen.getByRole("option", { name: "内装" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "自然素材" })).toBeInTheDocument();
  });
});
