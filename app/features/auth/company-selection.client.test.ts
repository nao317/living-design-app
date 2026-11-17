import { beforeEach, expect, it } from "vitest";
import { getActiveCompanyId, setActiveCompanyId } from "./company-selection.client";

const context = { userId: "user", accountRole: "COMPANY" as const, memberships: [{ companyId: "one", role: "OWNER" as const }, { companyId: "two", role: "EDITOR" as const }] };
beforeEach(() => sessionStorage.clear());

it("所属企業だけを操作対象として保存する", () => {
  expect(setActiveCompanyId(["one", "two"], "two")).toBe(true);
  expect(getActiveCompanyId(context)).toBe("two");
  expect(setActiveCompanyId(["one", "two"], "other")).toBe(false);
  expect(getActiveCompanyId(context)).toBe("two");
});

it("保存値が所属外なら最初の所属企業へ安全に戻す", () => {
  sessionStorage.setItem("living-design:active-company", "other");
  expect(getActiveCompanyId(context)).toBe("one");
});
