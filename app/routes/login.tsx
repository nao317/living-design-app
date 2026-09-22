import type { Route } from "./+types/login";
import { data, redirect } from "react-router";
import { z } from "zod";
import { AuthPanel } from "../features/auth/auth-panel";

const schema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export async function action({ request }: Route.ActionArgs) {
  const result = schema.safeParse(Object.fromEntries(await request.formData()));
  if (!result.success) return data({ error: "メールアドレスとパスワードを確認してください。" }, { status: 400 });
  return redirect("/mypage");
}

export default function LoginRoute({ actionData }: Route.ComponentProps) {
  return <AuthPanel mode="login" error={actionData?.error} />;
}
