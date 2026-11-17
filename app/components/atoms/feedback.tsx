import type { ReactNode } from "react";
import styles from "./feedback.module.css";

export function LoadingIndicator({ label = "読み込んでいます…" }: { label?: string }) {
  return <span className={styles.loading} role="status"><span className={styles.spinner} aria-hidden="true" />{label}</span>;
}
export function ErrorMessage({ children }: { children: ReactNode }) { return <p className={styles.error} role="alert">{children}</p>; }
