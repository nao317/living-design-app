import { House, Menu, X } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../features/auth/auth-context";

export function Header() {
  const [open, setOpen] = useState(false);
  const { state: { user, authorization }, meta: auth } = useAuth();
  const [logoutError, setLogoutError] = useState("");
  const navigate = useNavigate();
  const menuButton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const returnFocus = menuButton.current;
    const content = document.getElementById("page-content");
    const previousInert = content?.inert ?? false;
    document.body.style.overflow = "hidden";
    if (content) content.inert = true;
    const focusFrame = requestAnimationFrame(() => {
      menu.current?.querySelector<HTMLElement>("a, button")?.focus({ preventScroll: true });
    });
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
      if (event.key !== "Tab") return;
      const targets = [...(menu.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []), menuButton.current]
        .filter((item): item is HTMLElement => Boolean(item));
      const index = targets.indexOf(document.activeElement as HTMLElement);
      const next = event.shiftKey ? (index <= 0 ? targets.length - 1 : index - 1) : (index + 1) % targets.length;
      event.preventDefault();
      targets[next]?.focus();
    }
    const desktop = window.matchMedia("(min-width: 821px)");
    const resize = () => { if (desktop.matches) setOpen(false); };
    document.addEventListener("keydown", keydown);
    desktop.addEventListener("change", resize);
    return () => {
      document.body.style.overflow = previousOverflow;
      cancelAnimationFrame(focusFrame);
      if (content) content.inert = previousInert;
      document.removeEventListener("keydown", keydown);
      desktop.removeEventListener("change", resize);
      returnFocus?.focus();
    };
  }, [open]);

  async function handleLogout() {
    setLogoutError("");
    try {
      const { getSupabaseBrowserClient } = await import("../../lib/supabase.client");
      const { error } = await getSupabaseBrowserClient().auth.signOut();
      if (error) throw error;
      setOpen(false);
      navigate("/", { replace: true });
    } catch {
      setLogoutError("ログアウトできませんでした。接続を確認して再度お試しください。");
    }
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand" aria-label="飯塚のリノベ ホーム">
          <House size={25} strokeWidth={2.25} aria-hidden="true" />
          <span>飯塚のリノベ</span>
        </Link>
        {open ? <button type="button" className="menu-backdrop" tabIndex={-1} aria-label="メニューの外側をクリックして閉じる" onClick={() => setOpen(false)} /> : null}
        <nav ref={menu} id="site-navigation" className={open ? "header-nav is-open" : "header-nav"} aria-label="メインメニュー" onClick={() => setOpen(false)}>
          <NavLink to="/search">施工事例を探す</NavLink>
          <NavLink to="/companies">企業を探す</NavLink>
          <NavLink to="/contact">お問い合わせ</NavLink>
          {!auth.ready ? (
            <span className="header-auth-loading" role="status"><span className="spinner" aria-hidden="true" />確認中…</span>
          ) : user ? (
            <>
              {authorization?.accountRole === "ADMIN" ? <NavLink to="/admin">管理画面</NavLink> : null}
              {authorization?.accountRole === "COMPANY" ? <NavLink to="/company">企業管理</NavLink> : null}
              {authorization?.accountRole === "GENERAL" ? <NavLink to="/mypage">マイページ</NavLink> : null}
              <button type="button" className="header-login" onClick={handleLogout}>ログアウト</button>
            </>
          ) : (
            <NavLink to="/login" className="header-login">ログイン/会員登録</NavLink>
          )}
        </nav>
        {logoutError ? <p role="alert" className="field-error header-error">{logoutError}</p> : null}
        <button
          type="button"
          ref={menuButton}
          className="menu-button"
          onClick={() => setOpen((value) => !value)}
          aria-controls="site-navigation"
          aria-expanded={open}
          aria-label={open ? "メニューを閉じる" : "メニューを開く"}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
    </header>
  );
}
