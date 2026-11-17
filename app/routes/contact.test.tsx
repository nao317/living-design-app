import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { expect, it, vi } from "vitest";
import ContactRoute, { clientLoader, loader } from "./contact";
import type { CaseStudy } from "../features/cases/types";

const fixture = vi.hoisted(() => ({ item: { id: "22222222-2222-4222-8222-222222222222", companyId: "11111111-1111-4111-8111-111111111111", title: "台所の収納を増やす工事", price: "￥1,200,000", image: "" } }));
vi.mock("../features/cases/public-data.client", () => ({ fetchPublishedCompanyContacts: async () => [{ id: fixture.item.companyId, name: "施工会社" }], fetchCaseById: async () => fixture.item }));
it("問い合わせ先に一致する事例だけを表示し、会社を変えると送信対象から外す", () => {
  const loaderData = { companies: [{ id: fixture.item.companyId, name: "施工会社" }, { id: "other", name: "別の会社" }], selectedCompanyId: fixture.item.companyId, caseId: fixture.item.id, selectedCase: fixture.item as CaseStudy };
  const props = { loaderData } as Parameters<typeof ContactRoute>[0];
  render(<RouterProvider router={createMemoryRouter([{ path: "/contact", element: <ContactRoute {...props} /> }], { initialEntries: ["/contact"] })} />);
  expect(screen.getByRole("link", { name: fixture.item.title })).toHaveAttribute("href", `/cases/${fixture.item.id}`);
  expect(document.querySelector('input[name="caseId"]')).toHaveValue(fixture.item.id);
  fireEvent.change(screen.getByRole("combobox", { name: "お問い合わせ先企業" }), { target: { value: "other" } });
  expect(screen.queryByRole("link", { name: fixture.item.title })).not.toBeInTheDocument();
  expect(document.querySelector('input[name="caseId"]')).toBeNull();
});
it("他の会社への問い合わせURLに事例を混ぜない", async () => {
  const request = new Request(`http://localhost/contact?companyId=other&caseId=${fixture.item.id}`);
  const result = await clientLoader({ serverLoader: async () => loader({ request } as Parameters<typeof loader>[0]) } as Parameters<typeof clientLoader>[0]);
  expect(result.selectedCase).toBeNull();
});
