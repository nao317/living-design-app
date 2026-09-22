import { Heart, Home, LogIn, Menu, PencilLine, Plus, Search, UserRound, X } from "lucide-react";
import { Form, Link, NavLink } from "react-router";
import { useState } from "react";
import type { CaseStudy } from "../../data/mock";
import { CaseCard, CaseListItem } from "../molecules";
import { Button } from "../atoms";

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand"><Home size={25} fill="currentColor" /><span>飯塚のリノベ</span></Link>
        <nav className={open ? "header-nav is-open" : "header-nav"}>
          <Link to="/search">施工事例を探す</Link>
          <Link to="/companies/1">企業を探す</Link>
          <Link to="/mypage/favorites">お問い合わせ</Link>
          <Link to="/login" className="header-login">ログイン/会員登録</Link>
        </nav>
        <button type="button" className="menu-button" onClick={() => setOpen((value) => !value)} aria-label="メニュー">
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}

export function Sidebar({ type = "user" }: { type?: "user" | "company" }) {
  const links = type === "company"
    ? [
        ["/company", "ダッシュボード", Home],
        ["/company/profile/edit", "企業情報の編集", PencilLine],
        ["/company/cases/new", "施工事例の追加", Plus],
        ["/mypage/favorites", "問い合わせ", UserRound],
      ] as const
    : [
        ["/mypage", "ダッシュボード", Home],
        ["/mypage/favorites", "お気に入り", Heart],
        ["/search", "探す", Search],
      ] as const;

  return (
    <aside className="sidebar">
      <Link to="/" className="sidebar__brand"><Home size={22} fill="currentColor" /><span>飯塚のリノベ</span></Link>
      <nav>
        {links.map(([href, label, Icon]) => (
          <NavLink key={href} to={href} end><Icon size={16} />{label}</NavLink>
        ))}
      </nav>
      <Link to="/login" className="sidebar__bottom"><LogIn size={16} />退会</Link>
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
