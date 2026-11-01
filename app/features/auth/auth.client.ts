import { redirect } from "react-router";
import { z } from "zod";
import { getSupabaseBrowserClient } from "../../lib/supabase.client";
import { resolvePostLoginRedirect } from "./authorization.client";
import { rememberAuthRedirectTo, safeRedirectTo } from "./redirect";
import { validationErrors } from "../forms/validation";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export function getAuthErrorMessage(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
  if (code === "invalid_credentials") return "メールアドレスまたはパスワードが正しくありません。パスワードを忘れた場合は再設定してください。";
  if (code === "email_not_confirmed") return "メールアドレスの確認が完了していません。登録時の確認メールにあるリンクを開いてください。";
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") return "試行回数が多いため、しばらく待ってから再度お試しください。";
  if (code === "weak_password") return "より長く、推測されにくいパスワードを入力してください。";
  if (code === "user_already_exists") return "登録内容を確認してください。登録済みの場合はログインまたはパスワードの再設定をご利用ください。";
  return "認証を完了できませんでした。接続を確認し、時間をおいて再度お試しください。";
}

export async function handleAuthAction(request: Request, mode: "login" | "signup") {
  const formData = await request.formData();
  const redirectTo = safeRedirectTo(formData.get("redirectTo"));

  try {
    const supabase = getSupabaseBrowserClient();

    if (formData.get("intent") === "google") {
      rememberAuthRedirectTo(redirectTo);
      const callback = new URL("/auth/callback", window.location.origin);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callback.toString() },
      });

      if (error) return { error: getAuthErrorMessage(error) };
      return null;
    }

    const result = credentialsSchema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return {
        fieldErrors: validationErrors(result.error),
        error: mode === "signup"
          ? "メールアドレスと8文字以上のパスワードを入力してください。"
          : "メールアドレスとパスワードを確認してください。",
      };
    }

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword(result.data);
      if (error) return { error: getAuthErrorMessage(error) };
      throw redirect(await resolvePostLoginRedirect(redirectTo));
    }

    rememberAuthRedirectTo(redirectTo);
    const callback = new URL("/auth/callback", window.location.origin);
    const { data, error } = await supabase.auth.signUp({
      ...result.data,
      options: { emailRedirectTo: callback.toString() },
    });

    if (error) return { error: getAuthErrorMessage(error) };
    if (data.session) throw redirect(await resolvePostLoginRedirect(redirectTo));

    return { message: "確認メールを送信しました。メール内のリンクから登録を完了してください。" };
  } catch (error) {
    if (error instanceof Response) throw error;
    return { error: getAuthErrorMessage(error) };
  }
}
