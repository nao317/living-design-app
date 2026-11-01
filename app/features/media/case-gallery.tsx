import { useRef, useState } from "react";
import { StorageImage } from "./storage-image";

export function CaseGallery({ images, paths = [], title }: { images: string[]; paths?: string[]; title: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState(0);
  if (!images.length) return <div className="image-empty">施工写真はまだ登録されていません</div>;
  return <section className="case-gallery" aria-label="施工写真">
    <div className="case-gallery__grid">{images.map((src, index) => <figure key={paths[index] ?? src}>
      <button type="button" className="photo-button" aria-label={`施工写真${index + 1}を拡大`} onClick={() => { setSelected(index); dialog.current?.showModal(); }}>
        <StorageImage src={src} storagePath={paths[index]} bucket="case-images" alt={`${title}の施工写真${index + 1}`} loading={index < 2 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"} />
      </button>
      <figcaption>施工写真{index + 1} <span>クリックで拡大</span></figcaption>
    </figure>)}</div>
    <dialog ref={dialog} className="photo-dialog" aria-label={`${title}の施工写真を拡大表示`} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="photo-dialog__toolbar"><span role="status">施工写真{selected + 1} / {images.length}</span><button className="button button--secondary" type="button" onClick={() => dialog.current?.close()}>閉じる</button></div>
      <StorageImage src={images[selected]} storagePath={paths[selected]} bucket="case-images" alt={`${title}の施工写真${selected + 1}`} loading="eager" />
      {images.length > 1 ? <div className="photo-dialog__controls"><button type="button" className="button button--secondary" disabled={selected === 0} onClick={() => setSelected((index) => index - 1)}>前の写真</button><button type="button" className="button button--secondary" disabled={selected === images.length - 1} onClick={() => setSelected((index) => index + 1)}>次の写真</button></div> : null}
    </dialog>
  </section>;
}
