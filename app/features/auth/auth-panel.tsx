import { Form, Link, useNavigation } from "react-router";
import { Button } from "../../components/atoms";
import { Field } from "../../components/molecules";

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
  const submitting = navigation.state === "submitting";

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <h1>{signup ? "新規登録" : "ログイン"}</h1>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {message ? <p className="form-success" role="status">{message}</p> : null}
        <Form method="post" className="auth-form">
          <input type="hidden" name="intent" value="password" />
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <Field label="メールアドレス">
            <input type="email" name="email" autoComplete="email" placeholder="mail@example.com" required />
          </Field>
          <Field label="パスワード">
            <input type="password" name="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={8} />
          </Field>
          <Button type="submit" disabled={submitting}>
            {submitting ? "処理中…" : signup ? "新規登録" : "ログイン"}
          </Button>
        </Form>
        <div className="auth-divider"><span>または</span></div>
        <Form method="post">
          <input type="hidden" name="intent" value="google" />
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <Button type="submit" variant="secondary" className="auth-google" disabled={submitting}>
            <img src="/google-g-logo.png" alt="" aria-hidden="true" />
            <span>Googleで続ける</span>
          </Button>
        </Form>
        <p className="auth-switch">
          {signup ? "すでにアカウントをお持ちの方" : "アカウントをお持ちでない方"}
          <Link to={(signup ? "/login" : "/signup") + "?redirectTo=" + encodeURIComponent(redirectTo)}>
            {signup ? "ログイン" : "新規登録"}
          </Link>
        </p>
      </section>
    </main>
  );
}
