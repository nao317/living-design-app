import type { ReactNode } from "react";
import styles from "./empty-state.module.css";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className={styles.empty}><div className={styles.inner}><h2 className={styles.title}>{title}</h2>{description ? <p className={styles.description}>{description}</p> : null}{action ? <div className={styles.action}>{action}</div> : null}</div></div>;
}
