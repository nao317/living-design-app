import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;

function readSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    ?? import.meta.env.VITE_SUPABASE_ANON_KEY
  )?.trim();

  return { url, key };
}

export function isSupabaseConfigured() {
  const { url, key } = readSupabaseConfig();
  return Boolean(url && key && !url.includes("your-project") && !key.startsWith("your-"));
}

export function getSupabaseBrowserClient() {
  if (typeof window === "undefined") {
    throw new Error("Supabase client is only available in the browser.");
  }

  if (browserClient) return browserClient;

  const { url, key } = readSupabaseConfig();
  if (!url || !key || !isSupabaseConfigured()) {
    throw new Error("Supabaseの接続情報が設定されていません。.envを確認してください。");
  }

  browserClient = createClient(url, key, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });

  return browserClient;
}
