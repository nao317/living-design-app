import { Link } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/reset-password";
import { Field } from "../components/molecules";
import { ManagedForm, SubmitButton } from "../features/forms/managed-form";
import { validationErrors } from "../features/forms/validation";
import { getAuthErrorMessage } from "../features/auth/auth.client";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../lib/supabase.client";

export function meta() { return [{ title: "新しいパスワードを設定 | 飯塚のリノベ" }]; }
export function loader() { return { canReset: false }; }
export async function clientLoader() {
  if (!isSupabaseConfigured()) return { canReset: false };
  try {
    const { data, error } = await getSupabaseBrowserClient().auth.getSession();
    return { canReset: !error && Boolean(data.session) };
  } catch { return { canReset: false }; }
}
clientLoader.hydrate = true as const;
export function HydrateFallback() { return <main id="main-content" tabIndex={-1} className="auth-page"><p role="status">再設定リンクを確認しています…</p></main>; }

export async function clientAction({ request }: Route.ClientActionArgs) {
  const result = z.object({ password: z.string().min(8, "8文字以上で入力してください。"), passwordConfirmation: z.string() }).refine((values) => values.password === values.passwordConfirmation, { path: ["passwordConfirmation"], message: "パスワードが一致しません。" }).safeParse(Object.fromEntries(await request.formData()));
  if (!result.success) return { error: "入力内容を確認してください。", fieldErrors: validationErrors(result.error) };
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user) return { error: "再設定リンクの有効期限が切れています。再設定メールをもう一度送信してください。" };
    const { error } = await supabase.auth.updateUser({ password: result.data.password });
    if (error) return { error: getAuthErrorMessage(error) };
    return { saved: true };
  } catch (error) { return { error: getAuthErrorMessage(error) }; }
}

export default function ResetPasswordRoute({ loaderData, actionData }: Route.ComponentProps) {
  const saved = actionData && "saved" in actionData && actionData.saved;
  return <main id="main-content" tabIndex={-1} className="auth-page"><section className="auth-panel">
    <h1>新しいパスワードを設定</h1>
    {saved ? <><p className="form-success" role="status">パスワードを更新しました。</p><Link to="/login" className="button button--primary">ログインへ</Link></> : !loaderData.canReset ? <><p className="form-error" role="alert">再設定リンクを確認できませんでした。メール内のリンクを開くか、再設定メールをもう一度送信してください。</p><Link to="/forgot-password">再設定メールを送る</Link></> : <>
      {actionData && "error" in actionData ? <p className="form-error" role="alert">{actionData.error}</p> : null}
      <ManagedForm method="post" protect className="auth-form">
        <Field label="新しいパスワード" hint="8文字以上で入力してください。"><input type="password" name="password" autoComplete="new-password" minLength={8} required /></Field>
        <Field label="新しいパスワード（確認）"><input type="password" name="passwordConfirmation" autoComplete="new-password" minLength={8} required /></Field>
        <SubmitButton pendingLabel="更新中…">パスワードを更新する</SubmitButton>
      </ManagedForm>
    </>}
  </section></main>;
}
