import type { ReactNode } from "react";
import styles from "./data-table.module.css";

export function DataTable({ caption, headers, children }: { caption: string; headers: ReactNode[]; children: ReactNode }) {
  return <div className={styles.container}><table className={styles.table}><caption className={styles.srOnly}>{caption}</caption><thead><tr>{headers.map((header, index) => <th key={index} scope="col">{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

export const dataTableStyles = styles;
