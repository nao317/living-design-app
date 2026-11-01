import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getAuthorizationContext, type AuthorizationContext } from "../auth/authorization.client";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../lib/supabase.client";

type FavoriteState = { ready: boolean; authorization: AuthorizationContext | null; ids: Set<string>; error: boolean };
const FavoritesContext = createContext<FavoriteState>({ ready: true, authorization: null, ids: new Set(), error: false });
export function useFavorites() { return useContext(FavoritesContext); }

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FavoriteState>({ ready: false, authorization: null, ids: new Set(), error: false });
  useEffect(() => {
    let active = true;
    let version = 0;
    async function refresh() {
      const current = ++version;
      try {
        const authorization = await getAuthorizationContext();
        const ids = new Set<string>();
        if (authorization?.accountRole === "GENERAL") {
          const { data, error } = await getSupabaseBrowserClient().from("favorites").select("case_id").eq("user_id", authorization.userId);
          if (error) throw error;
          for (const row of data ?? []) ids.add(row.case_id);
        }
        if (active && current === version) setState({ ready: true, authorization, ids, error: false });
      } catch {
        if (active && current === version) setState({ ready: true, authorization: null, ids: new Set(), error: true });
      }
    }
    const changed = (event: Event) => {
      const { caseId, saved } = (event as CustomEvent<{ caseId: string; saved: boolean }>).detail;
      setState((current) => {
        const ids = new Set(current.ids);
        if (saved) ids.add(caseId); else ids.delete(caseId);
        return { ...current, ids };
      });
    };
    window.addEventListener("favorites-changed", changed);
    void refresh();
    const subscription = isSupabaseConfigured() ? getSupabaseBrowserClient().auth.onAuthStateChange(() => { queueMicrotask(() => { void refresh(); }); }).data.subscription : null;
    return () => { active = false; subscription?.unsubscribe(); window.removeEventListener("favorites-changed", changed); };
  }, []);
  return <FavoritesContext.Provider value={state}>{children}</FavoritesContext.Provider>;
}
