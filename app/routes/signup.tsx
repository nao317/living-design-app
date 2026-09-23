import type { Route } from "./+types/signup";
import { AuthPanel } from "../features/auth/auth-panel";
import { handleAuthAction } from "../features/auth/auth.client";
import { safeRedirectTo } from "../features/auth/redirect";

export function loader({ request }: Route.LoaderArgs) {
  return { redirectTo: safeRedirectTo(new URL(request.url).searchParams.get("redirectTo")) };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  return handleAuthAction(request, "signup");
}

export default function SignupRoute({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <AuthPanel
      mode="signup"
      error={actionData?.error}
      message={actionData?.message}
      redirectTo={loaderData.redirectTo}
    />
  );
}
