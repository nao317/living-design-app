import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase.client";
import { useAuth } from "../auth/auth-context";
import type { AuthorizationContext } from "../auth/authorization.client";

type FavoritesContextValue = {
  state: { authorization: AuthorizationContext | null; ids: ReadonlySet<string> };
  meta: { ready: boolean; error: boolean };
};
type LoadedFavorites = { userId: string; ids: ReadonlySet<string>; error: boolean };
const emptyIds: ReadonlySet<string> = new Set();
const FavoritesContext = createContext<FavoritesContextValue>({ state: { authorization: null, ids: emptyIds }, meta: { ready: true, error: false } });
export function useFavorites() { return use(FavoritesContext); }

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { state: { authorization }, meta: auth } = useAuth();
  const userId = authorization?.accountRole === "GENERAL" ? authorization.userId : null;
  const [loaded, setLoaded] = useState<LoadedFavorites>();

  useEffect(() => {
    if (!userId) return;
    let active = true;
    let changedDuringLoad = false;
    void getSupabaseBrowserClient().from("favorites").select("case_id").eq("user_id", userId).then(({ data, error }) => {
      if (!active || changedDuringLoad) return;
      setLoaded({ userId, ids: new Set((data ?? []).map((row) => row.case_id as string)), error: Boolean(error) });
    }, () => { if (active) setLoaded({ userId, ids: emptyIds, error: true }); });

    const changed = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string; caseId: string; saved: boolean }>).detail;
      if (detail.userId !== userId) return;
      changedDuringLoad = true;
      setLoaded((current) => {
        const ids = new Set(current?.userId === userId ? current.ids : []);
        if (detail.saved) ids.add(detail.caseId); else ids.delete(detail.caseId);
        return { userId, ids, error: false };
      });
    };
    window.addEventListener("favorites-changed", changed);
    return () => { active = false; window.removeEventListener("favorites-changed", changed); };
  }, [userId]);

  const current = loaded?.userId === userId ? loaded : undefined;
  return <FavoritesContext value={{
    state: { authorization, ids: current?.ids ?? emptyIds },
    meta: { ready: auth.ready && (!userId || Boolean(current)), error: auth.error || Boolean(current?.error) },
  }}>{children}</FavoritesContext>;
}
