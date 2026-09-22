import type { ReactNode } from "react";
import { Header, Sidebar } from "../organisms";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="public-layout">
      <Header />
      <main>{children}</main>
    </div>
  );
}

export function DashboardLayout({ children, type = "user" }: { children: ReactNode; type?: "user" | "company" }) {
  return (
    <div className="dashboard-shell">
      <Sidebar type={type} />
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
