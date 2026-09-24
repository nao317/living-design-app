import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { resolveAuthCallbackRedirectTo } from "../features/auth/redirect";
import { resolvePostLoginRedirect } from "../features/auth/authorization.client";
import { getSupabaseBrowserClient } from "../lib/supabase.client";

export function meta() {
  return [{ title: "認証中 | 飯塚のリノベ" }];
}

export default function AuthCallbackRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const redirectTo = resolveAuthCallbackRedirectTo(searchParams.get("redirectTo"));

    async function completeAuthentication() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !data.session) throw sessionError ?? new Error("Session was not created");
        if (active) navigate(await resolvePostLoginRedirect(redirectTo), { replace: true });
      } catch {
        if (active) setError("認証を完了できませんでした。もう一度ログインしてください。");
      }
    }

    void completeAuthentication();
    return () => { active = false; };
  }, [navigate, searchParams]);

  return (
    <main className="auth-callback">
      <h1>{error ? "認証エラー" : "認証しています"}</h1>
      <p role={error ? "alert" : "status"}>{error || "そのままお待ちください…"}</p>
      {error ? <Link className="button button--primary" to="/login">ログインへ戻る</Link> : null}
    </main>
  );
}
