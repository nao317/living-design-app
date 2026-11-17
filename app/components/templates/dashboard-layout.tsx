import { Menu } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Sidebar } from "../organisms/sidebar";
import { Breadcrumb } from "../molecules/breadcrumb";
import styles from "./dashboard-layout.module.css";

export function DashboardLayout({ children, type = "user" }: { children: ReactNode; type?: "user" | "company" | "admin" }) {
  const [open, setOpen] = useState(false);
  const sidebarId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const returnFocus = menuButton.current;
    const main = document.getElementById("dashboard-content");
    const previousInert = main?.inert ?? false;
    document.body.style.overflow = "hidden";
    if (main) main.inert = true;
    const frame = requestAnimationFrame(() => document.getElementById(sidebarId)?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true }));
    const media = window.matchMedia("(min-width: 821px)");
    const closeOnDesktop = () => { if (media.matches) setOpen(false); };
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); return; }
      if (event.key !== "Tab") return;
      const drawer = document.getElementById(sidebarId);
      const targets = [...(drawer?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []), menuButton.current].filter((target): target is HTMLElement => Boolean(target));
      const current = targets.indexOf(document.activeElement as HTMLElement);
      const next = event.shiftKey ? (current <= 0 ? targets.length - 1 : current - 1) : (current + 1) % targets.length;
      event.preventDefault();
      targets[next]?.focus();
    };
    media.addEventListener("change", closeOnDesktop);
    document.addEventListener("keydown", handleKeydown);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      if (main) main.inert = previousInert;
      media.removeEventListener("change", closeOnDesktop);
      document.removeEventListener("keydown", handleKeydown);
      returnFocus?.focus({ preventScroll: true });
    };
  }, [open, sidebarId]);

  return <div className={styles.shell}>
    <div className={styles.mobileBar}>
      <button ref={menuButton} type="button" className={styles.menuButton} aria-controls={sidebarId} aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <Menu aria-hidden="true" size={20} />メニュー
      </button>
    </div>
    {open ? <button type="button" className={styles.backdrop} aria-label="メニューを閉じる" tabIndex={-1} onClick={() => setOpen(false)} /> : null}
    <Sidebar id={sidebarId} type={type} open={open} onNavigate={() => setOpen(false)} />
    <main id="main-content" tabIndex={-1} className={styles.main}><div id="dashboard-content" className={styles.content}><Breadcrumb />{children}</div></main>
  </div>;
}
