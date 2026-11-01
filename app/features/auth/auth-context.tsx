import { createContext, use, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../lib/supabase.client";
import { getAuthorizationContext, type AuthorizationContext } from "./authorization.client";

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
    async function refresh(user: User | null, force = false) {
      const userId = user?.id ?? null;
      if (!active || (!force && requestedUserId === userId)) return;
      requestedUserId = userId;
      const current = ++revision;
      try {
        const authorization = user ? await getAuthorizationContext() : await Promise.resolve(null);
        if (active && current === revision) setValue({ state: { user, authorization }, meta: { ready: true, error: false } });
      } catch {
        if (active && current === revision) {
          requestedUserId = undefined;
          setValue({ state: { user, authorization: null }, meta: { ready: true, error: true } });
        }
      }
    }

    if (!isSupabaseConfigured()) {
      void refresh(null);
      return () => { active = false; };
    }
    const supabase = getSupabaseBrowserClient();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Auth callbacks run under the SDK lock. Read the profile after it releases.
      queueMicrotask(() => { void refresh(session?.user ?? null, event === "USER_UPDATED"); });
    });
    const initialRevision = revision;
    void supabase.auth.getSession().then(({ data: sessionData, error }) => {
      if (error) throw error;
      if (revision === initialRevision) void refresh(sessionData.session?.user ?? null);
    }).catch(() => {
      if (active && revision === initialRevision) setValue({ state: { user: null, authorization: null }, meta: { ready: true, error: true } });
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  return <AuthContext value={value}>{children}</AuthContext>;
}
