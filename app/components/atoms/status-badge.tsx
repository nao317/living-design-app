import type { ReactNode } from "react";
import styles from "./status-badge.module.css";

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "success" | "warning" | "neutral" | "danger" }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}
