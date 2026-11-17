import ui from "../../ui.module.css";
import { Form, Link, useNavigation } from "react-router";
import { Button } from "../../components/atoms";
import { Field } from "../../components/molecules";
import { ManagedForm, SubmitButton } from "../forms/managed-form";

export function AuthPanel({
  mode,
  error,
  message,
  redirectTo,
}: {
  mode: "login" | "signup";
  error?: string;
  message?: string;
  redirectTo: string;
}) {
  const signup = mode === "signup";
  const navigation = useNavigation();
  const submitting = navigation.state !== "idle" && Boolean(navigation.formMethod);

  return (
    <main id="main-content" tabIndex={-1} className={ui["auth-page"]}>
      <section className={ui["auth-panel"]}>
        <h1>{signup ? "新規登録" : "ログイン"}</h1>
        {error ? <p className={ui["form-error"]} role="alert">{error}</p> : null}
        {message ? <p className={ui["form-success"]} role="status">{message}</p> : null}
        <ManagedForm method="post" className={ui["auth-form"]}>
          <input type="hidden" name="intent" value="password" />
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <Field label="メールアドレス">
            <input type="email" name="email" autoComplete="email" spellCheck={false} placeholder="mail@example.com…" required />
          </Field>
          <Field label="パスワード" hint={signup ? "8文字以上で入力してください。" : undefined}>
            <input type="password" name="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={8} />
          </Field>
          <SubmitButton pendingLabel="認証中…">{signup ? "新規登録" : "ログイン"}</SubmitButton>
        </ManagedForm>
        {!signup ? <p className={ui["auth-help"]}><Link to="/forgot-password">パスワードを忘れた方</Link></p> : null}
        <div className={ui["auth-divider"]}><span>または</span></div>
        <Form method="post">
          <input type="hidden" name="intent" value="google" />
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <Button type="submit" variant="secondary" className={ui["auth-google"]} disabled={submitting}>
            <img src="/google-g-logo.png" alt="" width={18} height={18} aria-hidden="true" />
            {submitting && navigation.formData?.get("intent") === "google" ? <span className={ui["spinner"]} aria-hidden="true" /> : null}
            <span aria-live="polite">{submitting && navigation.formData?.get("intent") === "google" ? "認証中…" : "Googleで続ける"}</span>
          </Button>
        </Form>
        <p className={ui["auth-switch"]}>
          {signup ? "すでにアカウントをお持ちの方" : "アカウントをお持ちでない方"}
          <Link to={(signup ? "/login" : "/signup") + "?redirectTo=" + encodeURIComponent(redirectTo)}>
            {signup ? "ログイン" : "新規登録"}
          </Link>
        </p>
      </section>
    </main>
  );
}
