import { redirect } from "react-router";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../lib/supabase.client";

export type AccountRole = "GENERAL" | "COMPANY" | "ADMIN";
export type CompanyMemberRole = "OWNER" | "ADMIN" | "EDITOR";

export type AuthorizationContext = {
  userId: string;
  accountRole: AccountRole;
  memberships: Array<{ companyId: string; role: CompanyMemberRole }>;
};

type AuthorizationRequirement = {
  role?: AccountRole;
  roles?: AccountRole[];
  companyRoles?: CompanyMemberRole[];
};

function normalizeAccountRole(value: unknown): AccountRole | null {
  return value === "GENERAL" || value === "COMPANY" || value === "ADMIN" ? value : null;
}

export async function getAuthorizationContext(): Promise<AuthorizationContext | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabaseBrowserClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const [profileResult, membershipResult] = await Promise.all([
    supabase.from("profiles").select("account_role").eq("id", userData.user.id).maybeSingle(),
    supabase.from("company_members").select("company_id, role").eq("user_id", userData.user.id),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (membershipResult.error) throw membershipResult.error;

  const memberships = (membershipResult.data ?? []).flatMap((membership) => {
    if (
      typeof membership.company_id !== "string"
      || (membership.role !== "OWNER" && membership.role !== "ADMIN" && membership.role !== "EDITOR")
    ) {
      return [];
    }

    return [{ companyId: membership.company_id, role: membership.role }];
  });

  const storedRole = normalizeAccountRole(profileResult.data?.account_role);
  const accountRole = storedRole ?? "GENERAL";

  return { userId: userData.user.id, accountRole, memberships };
}

function getLoginRedirect(request: Request) {
  const url = new URL(request.url);
  const target = `${url.pathname}${url.search}`;
  return `/login?redirectTo=${encodeURIComponent(target)}`;
}

export async function requireAuthorization(
  request: Request,
  requirement: AuthorizationRequirement,
) {
  const context = await getAuthorizationContext();

  if (!context) throw redirect(getLoginRedirect(request));

  const allowedRoles = requirement.roles ?? (requirement.role ? [requirement.role] : []);
  if (!allowedRoles.includes(context.accountRole)) {
    throw new Response("権限がありません", { status: 404 });
  }

  if (allowedRoles.includes("COMPANY") && context.accountRole === "COMPANY" && context.memberships.length === 0) {
    throw new Response("権限がありません", { status: 404 });
  }

  if (
    requirement.companyRoles
    && !context.memberships.some(({ role }) => requirement.companyRoles?.includes(role))
  ) {
    throw new Response("権限がありません", { status: 404 });
  }

  return context;
}

export function getDefaultAuthenticatedPath(context: AuthorizationContext) {
  if (context.accountRole === "ADMIN") return "/admin";
  if (context.accountRole === "COMPANY") return "/company";
  return "/mypage";
}

export async function resolvePostLoginRedirect(value: string) {
  if (value !== "/mypage") return value;
  const context = await getAuthorizationContext();
  return context ? getDefaultAuthenticatedPath(context) : value;
}
