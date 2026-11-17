import type { AuthorizationContext } from "./authorization.client";

const storageKey = "living-design:active-company";

export function getActiveCompanyId(context: AuthorizationContext) {
  const stored = typeof window === "undefined" ? null : window.sessionStorage.getItem(storageKey);
  const selected = stored && context.memberships.some(({ companyId }) => companyId === stored) ? stored : context.memberships[0]?.companyId;
  if (selected && typeof window !== "undefined") window.sessionStorage.setItem(storageKey, selected);
  return selected;
}

export function setActiveCompanyId(allowedCompanyIds: string[], companyId: string) {
  if (!allowedCompanyIds.includes(companyId)) return false;
  window.sessionStorage.setItem(storageKey, companyId);
  return true;
}
