import { data, redirect } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/favorite-update";
import { getAuthorizationContext } from "../features/auth/authorization.client";
import { safeRedirectTo } from "../features/auth/redirect";
import { getSupabaseBrowserClient } from "../lib/supabase.client";

export async function clientAction({ request }: Route.ClientActionArgs) {
  const values = Object.fromEntries(await request.formData());
  try {
    const authorization = await getAuthorizationContext();
    if (!authorization) throw redirect(`/login?redirectTo=${encodeURIComponent(safeRedirectTo(values.redirectTo, "/search"))}`);
    if (authorization.accountRole !== "GENERAL") throw new Response("権限がありません", { status: 404 });
    const result = z.object({ caseId: z.uuid(), saved: z.enum(["true", "false"]) }).safeParse(values);
    if (!result.success) return data({ error: "施工事例を確認して、もう一度お試しください。" }, { status: 400 });
    const { caseId } = result.data;
    const saved = result.data.saved === "true";
    const supabase = getSupabaseBrowserClient();
    const { error } = saved
      ? await supabase.from("favorites").upsert({ user_id: authorization.userId, case_id: caseId }, { onConflict: "user_id,case_id", ignoreDuplicates: true })
      : await supabase.from("favorites").delete().eq("user_id", authorization.userId).eq("case_id", caseId);
    if (error) return data({ error: "お気に入りを保存できませんでした。時間をおいて再度お試しください。" }, { status: 400 });
    window.dispatchEvent(new CustomEvent("favorites-changed", { detail: { caseId, saved } }));
    return { caseId, saved, error: "" };
  } catch (error) {
    if (error instanceof Response) throw error;
    return data({ error: "通信できませんでした。接続を確認して再度お試しください。" }, { status: 503 });
  }
}
