import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./auth-context";
import { FavoritesProvider, useFavorites } from "../favorites/favorites-context";

type Session = { user: { id: string } } | null;
const state = vi.hoisted(() => ({
  userId: "first-user",
  listener: undefined as undefined | ((event: string, session: Session) => void),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  authorize: vi.fn(),
  loadFavorites: vi.fn(),
}));
vi.mock("./authorization.client", () => ({ getAuthorizationContext: state.authorize }));
vi.mock("../../lib/supabase.client", () => ({
  isSupabaseConfigured: () => true,
  getSupabaseBrowserClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: { user: { id: state.userId } } }, error: null }),
      onAuthStateChange: state.subscribe,
    },
    from: () => ({ select: () => ({ eq: state.loadFavorites }) }),
  }),
}));

function HeaderProbe() {
  const { state: auth, meta } = useAuth();
  return <p data-testid="auth">{meta.ready ? auth.authorization?.userId ?? "anonymous" : "loading"}</p>;
}
function FavoritesProbe() {
  const { state: favorites, meta } = useFavorites();
  return <p data-testid="favorites">{meta.ready ? [...favorites.ids].join(",") || "empty" : "loading"}</p>;
}
beforeEach(() => {
  vi.clearAllMocks();
  state.userId = "first-user";
  state.authorize.mockImplementation(async () => ({ userId: state.userId, accountRole: "GENERAL", memberships: [] }));
  state.subscribe.mockImplementation((listener: (event: string, session: Session) => void) => {
    state.listener = listener;
    queueMicrotask(() => listener("INITIAL_SESSION", { user: { id: state.userId } }));
    return { data: { subscription: { unsubscribe: state.unsubscribe } } };
  });
  state.loadFavorites.mockImplementation(async (_name: string, userId: string) => ({ data: [{ case_id: `${userId}-case` }], error: null }));
});
function setup() {
  return render(<AuthProvider><HeaderProbe /><FavoritesProvider><FavoritesProbe /><FavoritesProbe /></FavoritesProvider></AuthProvider>);
}

it("ヘッダーと複数のお気に入り表示が認証取得と購読を共有する", async () => {
  const { unmount } = setup();
  await waitFor(() => expect(screen.getAllByTestId("favorites")[0]).toHaveTextContent("first-user-case"));
  expect(state.subscribe).toHaveBeenCalledTimes(1);
  expect(state.authorize).toHaveBeenCalledTimes(1);
  expect(state.loadFavorites).toHaveBeenCalledTimes(1);
  await act(async () => state.listener?.("TOKEN_REFRESHED", { user: { id: state.userId } }));
  expect(state.authorize).toHaveBeenCalledTimes(1);
  expect(state.loadFavorites).toHaveBeenCalledTimes(1);
  unmount();
  expect(state.unsubscribe).toHaveBeenCalledTimes(1);
});

it("ログアウトと利用者の切り替えで別の利用者のお気に入りを表示しない", async () => {
  setup();
  await waitFor(() => expect(screen.getByTestId("auth")).toHaveTextContent("first-user"));
  await act(async () => state.listener?.("SIGNED_OUT", null));
  await waitFor(() => expect(screen.getAllByTestId("favorites")[0]).toHaveTextContent("empty"));
  state.userId = "second-user";
  await act(async () => state.listener?.("SIGNED_IN", { user: { id: state.userId } }));
  await waitFor(() => expect(screen.getAllByTestId("favorites")[0]).toHaveTextContent("second-user-case"));
  await act(async () => window.dispatchEvent(new CustomEvent("favorites-changed", { detail: { userId: "first-user", caseId: "wrong-user-case", saved: true } })));
  expect(screen.getAllByTestId("favorites")[0]).not.toHaveTextContent("wrong-user-case");
});
