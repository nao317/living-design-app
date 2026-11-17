import { Building2, FileCheck2, Files, Heart, Home, Mail, PencilLine, Plus, Search, Tags, Users } from "lucide-react";
import { NavLink, useLocation } from "react-router";
import styles from "./sidebar.module.css";

type DashboardType = "user" | "company" | "admin";
type NavigationItem = { href: string; label: string; icon: typeof Home; end?: boolean };
type NavigationGroup = { label: string; items: NavigationItem[] };

const navigation: Record<DashboardType, NavigationGroup[]> = {
  admin: [
    { label: "概要", items: [{ href: "/admin", label: "ダッシュボード", icon: Home, end: true }] },
    { label: "管理", items: [
      { href: "/admin/users", label: "ユーザー", icon: Users },
      { href: "/admin/applications", label: "企業申請", icon: FileCheck2 },
      { href: "/admin/cases", label: "施工事例", icon: Files },
      { href: "/admin/tags", label: "検索項目", icon: Tags },
    ] },
    { label: "公開サイト", items: [{ href: "/search", label: "公開事例を見る", icon: Search }] },
  ],
  company: [
    { label: "概要", items: [{ href: "/company", label: "ダッシュボード", icon: Home, end: true }] },
    { label: "コンテンツ", items: [
      { href: "/company/cases", label: "施工事例", icon: Files },
      { href: "/company/cases/new", label: "施工事例を追加", icon: Plus, end: true },
      { href: "/company/messages", label: "お問い合わせ", icon: Mail },
      { href: "/company/tags", label: "検索項目の申請", icon: Tags },
    ] },
    { label: "組織", items: [
      { href: "/company/members", label: "所属ユーザー", icon: Users },
      { href: "/company/profile/edit", label: "企業情報", icon: PencilLine },
    ] },
  ],
  user: [
    { label: "マイページ", items: [
      { href: "/mypage", label: "概要", icon: Home, end: true },
      { href: "/mypage/favorites", label: "お気に入り", icon: Heart },
      { href: "/company/apply", label: "企業アカウント申請", icon: Building2 },
    ] },
  ],
};

export function Sidebar({ type = "user", open = false, id, onNavigate }: { type?: DashboardType; open?: boolean; id?: string; onNavigate?: () => void }) {
  const location = useLocation();
  const label = type === "company" ? "企業管理" : type === "admin" ? "管理者メニュー" : "マイページ";
  return (
    <aside id={id} className={`${styles.sidebar} ${open ? styles.open : ""}`.trim()} aria-label={label}>
      <p className={styles.heading}>{label}</p>
      <nav>
        {navigation[type].map((group) => <section className={styles.group} key={group.label} aria-labelledby={`${type}-${group.label}`}>
          <span className={styles.groupLabel} id={`${type}-${group.label}`}>{group.label}</span>
          <div className={styles.links}>
            {group.items.map(({ href, label: itemLabel, icon: Icon, end }) => {
              const parentActive = !end && location.pathname.startsWith(`${href}/`);
              return <NavLink className={styles.link} data-parent-active={parentActive || undefined} key={href} to={href} end={end} onClick={onNavigate}>
                <Icon aria-hidden="true" size={18} />{itemLabel}
              </NavLink>;
            })}
          </div>
        </section>)}
      </nav>
    </aside>
  );
}
