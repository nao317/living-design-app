import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button className={("button button--" + variant + " " + className).trim()} {...props}>
      {children}
    </button>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="tag">{children}</span>;
}

export function Avatar({ name }: { name: string }) {
  return <span className="avatar" aria-label={name}>{name.slice(0, 1)}</span>;
}
