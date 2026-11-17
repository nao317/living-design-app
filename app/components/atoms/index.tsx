import ui from "../../ui.module.css";
import type { ReactNode } from "react";

export function Tag({ children }: { children: ReactNode }) {
  return <span className={ui["tag"]}>{children}</span>;
}

export function Avatar({ name }: { name: string }) {
  return <span className={ui["avatar"]} aria-label={name}>{name.slice(0, 1)}</span>;
}

export { StatusBadge } from "./status-badge";
export { Button } from "./button";
export { ErrorMessage, LoadingIndicator } from "./feedback";
