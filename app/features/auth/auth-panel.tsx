import { Form, Link } from "react-router";
import { Button } from "../../components/atoms";
import { Field } from "../../components/molecules";

export function AuthPanel({ mode, error }: { mode: "login" | "signup"; error?: string }) {
  const signup = mode === "signup";
  return (
    <main className="auth-page">
      <Link to="/" className="auth-logo">⌂ 飯塚のリノベ</Link>
      <section className="auth-panel">
        <h1>{signup ? "新規登録" : "ログイン"}</h1>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <Form method="post" className="auth-form">
          <Field label="メールアドレス">
            <input type="email" name="email" autoComplete="email" placeholder="mail@example.com" required />
          </Field>
          <Field label="パスワード">
            <input type="password" name="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={8} />
          </Field>
          <Button type="submit">{signup ? "新規登録" : "ログイン"}</Button>
        </Form>
        <div className="auth-divider"><span>または</span></div>
        <Button type="button" variant="secondary" className="auth-google">Googleで続ける</Button>
        <p className="auth-switch">
          {signup ? "すでにアカウントをお持ちの方" : "アカウントをお持ちでない方"}
          <Link to={signup ? "/login" : "/signup"}>{signup ? "ログイン" : "新規登録"}</Link>
        </p>
      </section>
    </main>
  );
}
