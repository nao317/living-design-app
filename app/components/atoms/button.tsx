import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./button.module.css";

export function Button({ children, className = "", variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return <button className={`${styles.button} ${styles[variant]} ${className}`.trim()} {...props}>{children}</button>;
}
