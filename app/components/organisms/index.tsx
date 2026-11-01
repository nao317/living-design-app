import { Heart, Home, House, Menu, PencilLine, Plus, Search, X } from "lucide-react";
import { Form, Link, NavLink, useNavigate } from "react-router";
import { useEffect, useRef, useState } from "react";
import type { CaseStudy } from "../../features/cases/types";
import type { SearchParams } from "../../features/search/schema";
import type { SearchOption } from "../../features/cases/public-data.client";
import { getSupabaseBrowserClient } from "../../lib/supabase.client";
import { CaseCard, CaseListItem } from "../molecules";
import { Button } from "../atoms";
import { useAuth } from "../../features/auth/auth-context";

export function Header() {
  const [open, setOpen] = useState(false);
  const { state: { user, authorization } } = useAuth();
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
    // Wait for the closed panel's visibility style to clear before moving focus.
    const focusFrame = requestAnimationFrame(() => {
      menu.current?.querySelector<HTMLElement>("a, button")?.focus({ preventScroll: true });
    });
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
      if (event.key !== "Tab") return;
      const targets = [...(menu.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []), menuButton.current].filter((item): item is HTMLElement => Boolean(item));
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
      const { error } = await getSupabaseBrowserClient().auth.signOut();
      if (error) throw error;
      setOpen(false);
      navigate("/", { replace: true });
    } catch { setLogoutError("ログアウトできませんでした。接続を確認して再度お試しください。"); }
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
          <Link to="/search">施工事例を探す</Link>
          <Link to="/companies">企業を探す</Link>
          <Link to="/contact">お問い合わせ</Link>
          {user ? (
            <>
              {authorization?.accountRole === "ADMIN" ? <Link to="/admin">管理画面</Link> : null}
              {authorization?.accountRole === "COMPANY" ? <Link to="/company">企業管理</Link> : null}
              {authorization?.accountRole === "GENERAL" ? <Link to="/mypage">マイページ</Link> : null}
              <button type="button" className="header-login" onClick={handleLogout}>ログアウト</button>
            </>
          ) : (
            <Link to="/login" className="header-login">ログイン/会員登録</Link>
          )}
        </nav>
        {logoutError ? <p role="alert" className="field-error">{logoutError}</p> : null}
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

export function Sidebar({ type = "user" }: { type?: "user" | "company" | "admin" }) {
  const links = type === "company"
    ? [
        ["/company", "ダッシュボード", Home],
        ["/company/profile/edit", "企業情報の編集", PencilLine],
        ["/company/tags", "検索項目の変更申請", PencilLine],
        ["/company/cases/new", "施工事例の追加", Plus],
      ] as const
    : type === "admin"
      ? [
          ["/admin", "管理画面", Home],
          ["/admin/tags", "検索項目の申請審査", PencilLine],
          ["/search", "公開事例", Search],
        ] as const
      : [
          ["/mypage", "ダッシュボード", Home],
          ["/mypage/favorites", "お気に入り", Heart],
        ] as const;

  return (
    <aside className="sidebar" aria-label={type === "company" ? "企業メニュー" : type === "admin" ? "管理者メニュー" : "マイページメニュー"}>
      <nav>
        {links.map(([href, label, Icon]) => (
          <NavLink key={href} to={href} end><Icon aria-hidden="true" size={16} />{label}</NavLink>
        ))}
      </nav>
    </aside>
  );
}

export function CaseGrid({ items }: { items: CaseStudy[] }) {
  return <div className="case-grid">{items.map((item) => <CaseCard key={item.id} item={item} />)}</div>;
}

export function CaseList({ items }: { items: CaseStudy[] }) {
  return <div className="case-list">{items.map((item) => <CaseListItem key={item.id} item={item} />)}</div>;
}

export function Filters({ compact = false, filters, categories = [], styles = [] }: {
  compact?: boolean;
  filters?: SearchParams;
  categories?: SearchOption[];
  styles?: SearchOption[];
}) {
  const [open, setOpen] = useState(false);
  const count = filters ? [filters.q, filters.area, filters.category, filters.style, filters.priceMin !== undefined, filters.priceMax !== undefined, filters.period].filter(Boolean).length : 0;
  return (
    <section className={compact ? "filter-panel filter-panel--home" : `filter-panel${open ? " is-open" : ""}`}>
    {!compact ? <button type="button" className="filter-toggle button button--secondary" aria-expanded={open} aria-controls="search-filters" onClick={() => setOpen((current) => !current)}>検索条件{count ? `（${count}件指定）` : "を指定"}{open ? "を閉じる" : ""}</button> : null}
    <div id="search-filters" className="filter-panel__content">
    <Form key={filters ? JSON.stringify(filters) : "home"} method="get" action="/search" onSubmit={() => setOpen(false)} className={compact ? "filters filters--home" : "filters"}>
      <h2>絞り込み検索</h2>
      <label>キーワード<input name="q" autoComplete="off" defaultValue={filters?.q ?? ""} maxLength={100} placeholder="例：キッチン…" /></label>
      <label>施工地域<input name="area" autoComplete="off" defaultValue={filters?.area ?? ""} maxLength={120} placeholder="例：飯塚市…" /></label>
      <label>リノベーション箇所
        <select name="category" defaultValue={filters?.category ?? ""}>
          <option value="">選択してください</option>
          {categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
        </select>
      </label>
      <fieldset className="budget-field"><legend>予算（円）</legend>
        <span className="range-fields"><input name="priceMin" type="number" min="0" max="2147483647" inputMode="numeric" autoComplete="off" defaultValue={filters?.priceMin ?? ""} aria-label="予算下限（円）" placeholder="例：100000…" /><span aria-hidden="true">〜</span><input name="priceMax" type="number" min="0" max="2147483647" inputMode="numeric" autoComplete="off" defaultValue={filters?.priceMax ?? ""} aria-label="予算上限（円）" placeholder="例：500000…" /></span>
      </fieldset>
      <label>施工期間
        <select name="period" defaultValue={filters?.period ?? ""}>
          <option value="">指定なし</option>
          <option value="1">1か月以内</option>
          <option value="3">3か月以内</option>
        </select>
      </label>
      <label>こだわり条件
        <select name="style" defaultValue={filters?.style ?? ""}>
          <option value="">指定なし</option>
          {styles.map((style) => <option key={style.slug} value={style.slug}>{style.name}</option>)}
        </select>
      </label>
      <label>並び順
        <select name="sort" defaultValue={filters?.sort ?? "newest"}>
          <option value="newest">新しい順</option>
          <option value="oldest">古い順</option>
          <option value="price_asc">費用が低い順</option>
          <option value="price_desc">費用が高い順</option>
        </select>
      </label>
      <Button type="submit">検索する</Button>
      <Link className="filter-clear" to="/search" onClick={() => setOpen(false)}>条件をクリア</Link>
    </Form>
    </div>
    </section>
  );
}
