import ui from "../../ui.module.css";
import type { ReactNode } from "react";

export function PublicLayout({ children }: { children: ReactNode }) {
  return <div className={ui["public-layout"]}><main id="main-content" tabIndex={-1}>{children}</main></div>;
}
