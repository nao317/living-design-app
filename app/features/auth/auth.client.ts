import { redirect } from "react-router";
import { z } from "zod";
import { getSupabaseBrowserClient } from "../../lib/supabase.client";
import { safeRedirectTo } from "./redirect";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

function getAuthErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.includes("接続情報")) return error.message;
  return "認証に失敗しました。入力内容またはSupabaseの設定を確認してください。";
}

export async function handleAuthAction(request: Request, mode: "login" | "signup") {
  const formData = await request.formData();
  const redirectTo = safeRedirectTo(formData.get("redirectTo"));

  try {
    const supabase = getSupabaseBrowserClient();

    if (formData.get("intent") === "google") {
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("redirectTo", redirectTo);

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
        error: mode === "signup"
          ? "メールアドレスと8文字以上のパスワードを入力してください。"
          : "メールアドレスとパスワードを確認してください。",
      };
    }

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword(result.data);
      if (error) return { error: getAuthErrorMessage(error) };
      throw redirect(redirectTo);
    }

    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("redirectTo", redirectTo);
    const { data, error } = await supabase.auth.signUp({
      ...result.data,
      options: { emailRedirectTo: callback.toString() },
    });

    if (error) return { error: getAuthErrorMessage(error) };
    if (data.session) throw redirect(redirectTo);

    return { message: "確認メールを送信しました。メール内のリンクから登録を完了してください。" };
  } catch (error) {
    if (error instanceof Response) throw error;
    return { error: getAuthErrorMessage(error) };
  }
}
