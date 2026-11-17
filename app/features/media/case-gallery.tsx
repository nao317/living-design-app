import ui from "../../ui.module.css";
import { ChevronLeft, ChevronRight, Images, Maximize2, X } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { StorageImage } from "./storage-image";

export function CaseGallery({ images, paths = [], title, details = [], children }: { images: string[]; paths?: string[]; title: string; details?: Array<{ date?: string; description?: string }>; children?: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState(0);
  if (!images.length) return <><div className={ui["image-empty"]}>施工写真の掲載はありません</div>{children}</>;
  const timeline = images.map((src, index) => ({ src, index, ...details[index] })).slice(1)
    .sort((a, b) => (a.date ?? "9999-12-31").localeCompare(b.date ?? "9999-12-31") || a.index - b.index);
  function expand(index: number) { setSelected(index); dialog.current?.showModal(); }
  return <section className={ui["case-gallery"]} aria-label="施工写真">
    <button type="button" className={ui["photo-button"] + " " + ui["gallery-cover"]} aria-label="施工写真1を拡大" onClick={() => expand(0)}>
      <StorageImage width={1200} height={780} src={images[0]} storagePath={paths[0]} bucket="case-images" alt={`${title}の施工写真1`} loading="eager" fetchPriority="high" />
    </button>
    <div className={ui["gallery-caption"]}><span><Images size={16} aria-hidden="true" /><span className={ui["sr-only"]}>施工写真 </span>{images.length}枚</span><button type="button" className={ui["gallery-expand"]} onClick={() => expand(0)} aria-label="メイン写真を拡大"><Maximize2 size={15} aria-hidden="true" />拡大</button></div>
    {children}
    {timeline.length ? <section className={ui["case-timeline"]} aria-labelledby="case-timeline-heading">
      <h2 id="case-timeline-heading">施工の記録</h2>
      <ol>{timeline.map(({ src, index, date, description }) => <li key={paths[index] ?? `${src}-${index}`}>
        <div className={ui["case-timeline__date"]}>{date ? <time dateTime={date}>{date.replace(/-/g, "/")}</time> : <span>日付未設定</span>}</div>
        <figure>
          <button type="button" className={ui["photo-button"]} aria-label={`施工写真${index + 1}を拡大`} onClick={() => expand(index)}>
            <StorageImage width={1000} height={700} src={src} storagePath={paths[index]} bucket="case-images" alt={description || `${title}の施工写真${index + 1}`} loading="lazy" />
          </button>
          {description ? <figcaption>{description}</figcaption> : null}
        </figure>
      </li>)}</ol>
    </section> : null}
    <dialog ref={dialog} className={ui["photo-dialog"]} aria-label={`${title}の施工写真を拡大表示`} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} onKeyDown={event => {
      if (event.key === "ArrowLeft") { event.preventDefault(); setSelected(index => Math.max(0, index - 1)); }
      if (event.key === "ArrowRight") { event.preventDefault(); setSelected(index => Math.min(images.length - 1, index + 1)); }
    }}>
      <div className={ui["photo-dialog__toolbar"]}><span role="status">施工写真{selected + 1} / {images.length}</span><button className={ui.button + " " + ui["button--secondary"]} type="button" aria-label="閉じる" title="閉じる" onClick={() => dialog.current?.close()}><X size={20} aria-hidden="true" /></button></div>
      <StorageImage width={1600} height={1040} src={images[selected]} storagePath={paths[selected]} bucket="case-images" alt={`${title}の施工写真${selected + 1}`} loading="eager" />
      {images.length > 1 ? <div className={ui["photo-dialog__controls"]}><button type="button" className={ui.button + " " + ui["button--secondary"]} aria-label="前の写真" disabled={selected === 0} onClick={() => setSelected(index => index - 1)}><ChevronLeft size={20} aria-hidden="true" />前へ</button><button type="button" className={ui.button + " " + ui["button--secondary"]} aria-label="次の写真" disabled={selected === images.length - 1} onClick={() => setSelected(index => index + 1)}>次へ<ChevronRight size={20} aria-hidden="true" /></button></div> : null}
    </dialog>
  </section>;
}
