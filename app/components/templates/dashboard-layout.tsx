import type { ReactNode } from "react";
import { Sidebar } from "../organisms";

export function DashboardLayout({ children, type = "user" }: { children: ReactNode; type?: "user" | "company" | "admin" }) {
  return <div className="dashboard-shell"><Sidebar type={type} /><main id="main-content" tabIndex={-1} className="dashboard-main">{children}</main></div>;
}
