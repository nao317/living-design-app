import type { ReactNode } from "react";
import { Sidebar } from "../organisms";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="public-layout">
      <main>{children}</main>
    </div>
  );
}

export function DashboardLayout({ children, type = "user" }: { children: ReactNode; type?: "user" | "company" | "admin" }) {
  return (
    <div className="dashboard-shell">
      <Sidebar type={type} />
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
