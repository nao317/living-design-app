import ui from "../ui.module.css";
import { FileCheck2, Files, Tags, Users } from "lucide-react";
import { Link } from "react-router";
import type { Route } from "./+types/admin-dashboard";
import { PageHeader } from "../components/molecules";
import { DashboardLayout } from "../components/templates/dashboard-layout";
import { requireAuthorization } from "../features/auth/authorization.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";

export function loader() { return {}; }
export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  await requireAuthorization(request, { role: "ADMIN" });
  return serverLoader();
}
clientLoader.hydrate = true as const;
export function HydrateFallback() { return <ProtectedRouteFallback />; }

const sections = [
  ["/admin/users", "ユーザー", "権限と企業所属を管理します。", Users],
  ["/admin/applications", "企業申請", "企業アカウント申請を審査します。", FileCheck2],
  ["/admin/cases", "施工事例", "公開状態の確認、編集、削除を行います。", Files],
  ["/admin/tags", "検索項目", "企業から届いた検索項目の申請を審査します。", Tags],
] as const;

export default function AdminDashboardRoute() {
  return <DashboardLayout type="admin">
    <PageHeader eyebrow="ADMIN" title="管理者ダッシュボード" description="機能ごとの管理画面から、必要な情報だけを確認・更新できます。" />
    <div className={ui["dashboard-link-grid"]}>{sections.map(([href, title, description, Icon]) => <Link className={ui["dashboard-link-card"]} to={href} key={href}><Icon aria-hidden="true" size={22} /><span><strong>{title}</strong><small>{description}</small></span></Link>)}</div>
  </DashboardLayout>;
}
export function meta() { return [{ title: "管理者ダッシュボード | 飯塚のリノベ" }]; }
