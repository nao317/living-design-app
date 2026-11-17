import { Link, useLocation } from "react-router";
import styles from "./breadcrumb.module.css";

const labels: Record<string, string> = {
  admin: "管理者", users: "ユーザー", applications: "企業申請", cases: "施工事例", tags: "検索項目", edit: "編集",
  company: "企業管理", messages: "お問い合わせ", members: "所属ユーザー", profile: "企業情報", new: "新規登録",
  mypage: "マイページ", favorites: "お気に入り", apply: "企業アカウント申請",
};

export function Breadcrumb() {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;
  const knownPages = new Set(["/admin", "/admin/users", "/admin/applications", "/admin/cases", "/admin/tags", "/company", "/company/cases", "/company/messages", "/company/members", "/company/tags", "/mypage", "/mypage/favorites"]);
  return <nav className={styles.nav} aria-label="パンくずリスト"><ol className={styles.list}>{segments.map((segment, index) => {
    if (/^[0-9a-f]{8}-/.test(segment)) return null;
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const last = index === segments.length - 1;
    const label = labels[segment] ?? (segment.length > 12 ? "詳細" : segment);
    return <li key={href}>{last || !knownPages.has(href) ? <span className={styles.current} aria-current={last ? "page" : undefined}>{label}</span> : <Link to={href}>{label}</Link>}</li>;
  })}</ol></nav>;
}
