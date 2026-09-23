import type { Route } from "./+types/contact";
import { data, Form, Link, useNavigation } from "react-router";
import { z } from "zod";
import { Button } from "../components/atoms";
import { Field } from "../components/molecules";
import { PublicLayout } from "../components/templates";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.email(),
  subject: z.enum(["renovation", "company", "account", "other"]),
  message: z.string().trim().min(10).max(2000),
});

export function meta() {
  return [
    { title: "お問い合わせ | 飯塚のリノベ" },
    { name: "description", content: "飯塚のリノベへのお問い合わせを受け付けています。" },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  const result = contactSchema.safeParse(Object.fromEntries(await request.formData()));

  if (!result.success) {
    return data(
      { sent: false, error: "入力内容を確認してください。お問い合わせ内容は10文字以上で入力してください。" },
      { status: 400 },
    );
  }

  return data({ sent: true, error: "" });
}

export default function ContactRoute({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";

  return (
    <PublicLayout>
      <div className="public-page contact-page">
        <header className="contact-heading">
          <h1>お問い合わせ</h1>
          <p>施工のご相談、掲載企業、会員登録についてなど、お気軽にお問い合わせください。</p>
        </header>

        <section className="contact-panel" aria-label="お問い合わせフォーム">
          {actionData?.sent ? (
            <div className="form-success" role="status">
              お問い合わせを受け付けました。内容を確認のうえ担当者よりご連絡します。
            </div>
          ) : (
            <Form method="post" className="contact-form">
              {actionData?.error ? <p className="form-error" role="alert">{actionData.error}</p> : null}
              <Field label="お名前">
                <input name="name" autoComplete="name" required maxLength={80} />
              </Field>
              <Field label="メールアドレス">
                <input type="email" name="email" autoComplete="email" required />
              </Field>
              <Field label="お問い合わせ種別">
                <select name="subject" defaultValue="renovation" required>
                  <option value="renovation">リノベーション・施工について</option>
                  <option value="company">掲載企業について</option>
                  <option value="account">会員登録・アカウントについて</option>
                  <option value="other">その他</option>
                </select>
              </Field>
              <Field label="お問い合わせ内容" hint="10文字以上、2,000文字以内で入力してください。">
                <textarea name="message" required minLength={10} maxLength={2000} />
              </Field>
              <Button type="submit" disabled={submitting}>
                {submitting ? "送信中…" : "送信する"}
              </Button>
            </Form>
          )}
        </section>

        <section className="contact-guidance">
          <h2>企業へ直接相談したい方</h2>
          <p>
            <Link to="/search">施工事例を探す</Link>
            から事例や企業を選ぶと、相談先を指定してお問い合わせできます。
          </p>
        </section>
      </div>
    </PublicLayout>
  );
}
