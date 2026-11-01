import { Link } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/forgot-password";
import { Field } from "../components/molecules";
import { ManagedForm, SubmitButton } from "../features/forms/managed-form";
import { validationErrors } from "../features/forms/validation";
import { getAuthErrorMessage } from "../features/auth/auth.client";
import { getSupabaseBrowserClient } from "../lib/supabase.client";

export function meta() { return [{ title: "パスワードの再設定 | 飯塚のリノベ" }]; }

export async function clientAction({ request }: Route.ClientActionArgs) {
  const result = z.object({ email: z.email() }).safeParse(Object.fromEntries(await request.formData()));
  if (!result.success) return { error: "メールアドレスを確認してください。", fieldErrors: validationErrors(result.error) };
  try {
    const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(result.data.email, { redirectTo: new URL("/reset-password", window.location.origin).toString() });
    if (error) return { error: getAuthErrorMessage(error) };
    return { sent: true };
  } catch (error) { return { error: getAuthErrorMessage(error) }; }
}

export default function ForgotPasswordRoute({ actionData }: Route.ComponentProps) {
  return <main id="main-content" tabIndex={-1} className="auth-page"><section className="auth-panel">
    <h1>パスワードの再設定</h1>
    <p>登録したメールアドレスに、再設定用のリンクを送信します。</p>
    {actionData && "sent" in actionData && actionData.sent ? <p className="form-success" role="status">該当するアカウントがある場合、再設定メールを送信しました。メール内のリンクを開いてください。届かない場合は迷惑メールフォルダーもご確認ください。</p> : null}
    {actionData && "error" in actionData ? <p className="form-error" role="alert">{actionData.error}</p> : null}
    <ManagedForm method="post" className="auth-form"><Field label="メールアドレス"><input name="email" type="email" autoComplete="email" spellCheck={false} required /></Field><SubmitButton pendingLabel="送信中…">再設定メールを送る</SubmitButton></ManagedForm>
    <p className="auth-help"><Link to="/login">ログインへ戻る</Link></p>
  </section></main>;
}
