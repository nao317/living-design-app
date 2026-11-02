import { createContext, use, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import type { AuthorizationContext } from "./authorization.client";

type AuthState = { user: User | null; authorization: AuthorizationContext | null };
type AuthContextValue = { state: AuthState; meta: { ready: boolean; error: boolean } };
const AuthContext = createContext<AuthContextValue>({ state: { user: null, authorization: null }, meta: { ready: true, error: false } });
export function useAuth() { return use(AuthContext); }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<AuthContextValue>({ state: { user: null, authorization: null }, meta: { ready: false, error: false } });
  useEffect(() => {
    let active = true;
    let revision = 0;
    let requestedUserId: string | null | undefined;
    let unsubscribe: (() => void) | undefined;
    let loadAuthorization: (() => Promise<AuthorizationContext | null>) | undefined;
    async function refresh(user: User | null, force = false) {
      const userId = user?.id ?? null;
      if (!active || (!force && requestedUserId === userId)) return;
      requestedUserId = userId;
      const current = ++revision;
      try {
        const authorization = user && loadAuthorization ? await loadAuthorization() : null;
        if (active && current === revision) setValue({ state: { user, authorization }, meta: { ready: true, error: false } });
      } catch {
        if (active && current === revision) {
          requestedUserId = undefined;
          setValue({ state: { user, authorization: null }, meta: { ready: true, error: true } });
        }
      }
    }

    async function setup() {
      const supabaseModule = await import("../../lib/supabase.client");
      if (!active) return;
      if (!supabaseModule.isSupabaseConfigured()) {
        await refresh(null);
        return;
      }
      const authorizationModule = await import("./authorization.client");
      if (!active) return;
      loadAuthorization = authorizationModule.getAuthorizationContext;
      const supabase = supabaseModule.getSupabaseBrowserClient();
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        // Auth callbacks run under the SDK lock. Read the profile after it releases.
        queueMicrotask(() => { void refresh(session?.user ?? null, event === "USER_UPDATED"); });
      });
      unsubscribe = () => data.subscription.unsubscribe();
      const initialRevision = revision;
      const { data: sessionData, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (revision === initialRevision) await refresh(sessionData.session?.user ?? null);
    }
    void setup().catch(() => {
      if (active) setValue({ state: { user: null, authorization: null }, meta: { ready: true, error: true } });
    });
    return () => { active = false; unsubscribe?.(); };
  }, []);
  return <AuthContext value={value}>{children}</AuthContext>;
}
