import { Heart, Home, House, Menu, PencilLine, Plus, Search, X } from "lucide-react";
import { Form, Link, NavLink, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { CaseStudy } from "../../data/mock";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../lib/supabase.client";
import { CaseCard, CaseListItem } from "../molecules";
import { Button } from "../atoms";
import { getAuthorizationContext, type AuthorizationContext } from "../../features/auth/authorization.client";

export function Header() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authorization, setAuthorization] = useState<AuthorizationContext | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = getSupabaseBrowserClient();
    async function refreshAuthorization(nextUser: User | null) {
      if (!nextUser) {
        setAuthorization(null);
        return;
      }

      try {
        setAuthorization(await getAuthorizationContext());
      } catch {
        setAuthorization(null);
      }
    }

    void supabase.auth.getSession().then(({ data }) => {
      const nextUser = data.session?.user ?? null;
      setUser(nextUser);
      void refreshAuthorization(nextUser);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      void refreshAuthorization(nextUser);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setOpen(false);
    setAuthorization(null);
    navigate("/", { replace: true });
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand" aria-label="飯塚のリノベ ホーム">
          <House size={25} strokeWidth={2.25} aria-hidden="true" />
          <span>飯塚のリノベ</span>
        </Link>
        <nav id="site-navigation" className={open ? "header-nav is-open" : "header-nav"} aria-label="メインメニュー" onClick={() => setOpen(false)}>
          <Link to="/search">施工事例を探す</Link>
          <Link to="/companies/1">企業を探す</Link>
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
        <button
          type="button"
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
        ["/company/cases/new", "施工事例の追加", Plus],
      ] as const
    : type === "admin"
      ? [
          ["/admin", "管理画面", Home],
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
          <NavLink key={href} to={href} end><Icon size={16} />{label}</NavLink>
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

export function Filters({ compact = false }: { compact?: boolean }) {
  return (
    <Form method="get" action="/search" className={compact ? "filters filters--home" : "filters"}>
      <h2>絞り込み検索</h2>
      <label>リノベーション箇所
        <select name="category" defaultValue="">
          <option value="">選択してください</option>
          <option value="kitchen">キッチン</option>
          <option value="living">リビング</option>
          <option value="bath">水回り</option>
        </select>
      </label>
      <label>予算
        <span className="range-fields"><input name="priceMin" inputMode="numeric" /><span>〜</span><input name="priceMax" inputMode="numeric" /></span>
      </label>
      <label>施工期間
        <select name="period" defaultValue="">
          <option value="">指定なし</option>
          <option value="1">1か月以内</option>
          <option value="3">3か月以内</option>
        </select>
      </label>
      <label>こだわり条件
        <select name="style" defaultValue="">
          <option value="">指定なし</option>
          <option value="storage">収納</option>
          <option value="insulation">断熱</option>
        </select>
      </label>
      <Button type="submit">検索する</Button>
    </Form>
  );
}
