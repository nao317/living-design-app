import { Heart, Home, PencilLine, Plus, Search } from "lucide-react";
import { NavLink } from "react-router";
import type { CaseStudy } from "../../features/cases/types";
import { CaseCard, CaseListItem } from "../molecules";

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
