import { ArrowRight, Pause, Play } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router";
import { CaseCard } from "../molecules";
import type { CaseStudy } from "../../features/cases/types";
import ui from "../../ui.module.css";
import styles from "./case-marquee.module.css";

const edgeBlurLevels = [0.5, 1, 2, 4, 8, 16];

function MarqueeEdgeBlur({ side }: { side: "left" | "right" }) {
  return <div className={`${styles.edgeBlur} ${styles[side]}`} aria-hidden="true">
    {edgeBlurLevels.map((blur, index) => <span key={blur} style={{
      "--blur-radius": `${blur}px`,
      "--fade-start": `${(5 - index) * 12}%`,
      "--fade-end": `${(6 - index) * 16}%`,
    } as CSSProperties} />)}
  </div>;
}

export function CaseMarquee({ items, children }: { items: CaseStudy[]; children?: ReactNode }) {
  const [paused, setPaused] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const headingId = useId();

  useEffect(() => {
    const element = viewport.current;
    if (!element || !items.length) return;
    let frame = 0;
    let appliedWidth = 0;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.borderBoxSize?.[0]?.inlineSize ?? element.clientWidth;
      if (!width || Math.abs(width - appliedWidth) < .5) return;
      appliedWidth = width;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const cardWidth = Math.min(320, Math.max(260, width * .32));
        const gap = 22;
        const distance = Math.max(width + cardWidth + gap, items.length * (cardWidth + gap));
        const pixelsPerSecond = 32;
        element.style.setProperty("--card-width", `${cardWidth}px`);
        element.style.setProperty("--loop-distance", `${distance}px`);
        element.style.setProperty("--loop-duration", `${distance / pixelsPerSecond}s`);
        element.style.setProperty("--step-time", `${distance / items.length / pixelsPerSecond}s`);
        element.style.setProperty("--lead-time", `${(distance - cardWidth - gap) / pixelsPerSecond}s`);
        element.dataset.ready = "true";
      });
    });
    observer.observe(element);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [items.length]);

  return <section className={ui["home-cases"]} aria-labelledby={headingId}>
    <div className={ui["section-header"]}>
      <h2 id={headingId}>施工事例</h2>
      <div className={styles.actions}>
        {items.length ? <button type="button" className={styles.toggle} aria-label={paused ? "施工事例の自動スクロールを再開" : "施工事例の自動スクロールを停止"} title={paused ? "再生" : "一時停止"} aria-pressed={paused} onClick={() => setPaused(current => !current)}>
          {paused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
        </button> : null}
        <Link to="/search" aria-label="すべての事例を見る">すべて見る<ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
    </div>
    {items.length ? <div className={styles.showcase}>
      <div ref={viewport} className={styles.viewport} data-paused={paused || undefined} tabIndex={0} aria-label="施工事例を横にスクロール" onFocus={event => {
        if (!event.target.matches(":focus-visible")) return;
        const card = event.target.closest<HTMLElement>("[data-marquee-card]");
        if (card) requestAnimationFrame(() => card.scrollIntoView({ block: "nearest", inline: "nearest" }));
      }}>
        <div className={styles.track}>
          {items.map((item, index) => <div key={item.id} className={styles.item} data-marquee-card style={{ "--item-index": index } as CSSProperties}><CaseCard item={item} /></div>)}
        </div>
      </div>
      <MarqueeEdgeBlur side="left" />
      <MarqueeEdgeBlur side="right" />
    </div> : children}
  </section>;
}
