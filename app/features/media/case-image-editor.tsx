import { useCallback, useState } from "react";
import { Field } from "../../components/molecules";
import { StorageImage } from "./storage-image";
import { MAX_CASE_IMAGES } from "./image-storage.client";
import ui from "../../ui.module.css";

export type EditableCaseImage = { id: string; storagePath: string; url: string; date?: string; description?: string };

function FilePreview({ file }: { file: File }) {
  const preview = useCallback((node: HTMLImageElement | null) => {
    if (!node || typeof URL.createObjectURL !== "function") return;
    const source = URL.createObjectURL(file);
    node.src = source;
    return () => URL.revokeObjectURL(source);
  }, [file]);
  return <img ref={preview} alt={file.name} width={300} height={200} />;
}

function PhotoFields({ imageKey, date = "", description = "" }: { imageKey: string; date?: string; description?: string }) {
  return <>
    <Field label="日付"><input name={`imageDate:${imageKey}`} type="date" defaultValue={date} /></Field>
    <Field label="写真の説明"><textarea name={`imageDescription:${imageKey}`} maxLength={2000} rows={3} defaultValue={description} /></Field>
  </>;
}

export function CaseImageEditor({ images = [] }: { images?: EditableCaseImage[] }) {
  // Remount only the media fields after a saved image is added, replaced, or removed.
  return <CaseImageEditorFields key={JSON.stringify(images.map(image => [image.id, image.storagePath]))} images={images} />;
}

function CaseImageEditorFields({ images }: { images: EditableCaseImage[] }) {
  const [files, setFiles] = useState<File[]>([]);
  const [cover, setCover] = useState<File>();
  return <section className={ui["case-image-editor"]} aria-label="施工事例の写真">
    <p className={ui["form-hint"]}>代表画像はホームと一覧に表示されます。追加の写真は日付の古い順に表示し、日付のない写真は最後に登録順で表示します。1枚1MB以内、代表画像を含めて合計{MAX_CASE_IMAGES}枚まで登録できます。</p>
    <section className={ui["form-card"]}>
      <h2>代表画像</h2>
      {cover ? <FilePreview file={cover} /> : images[0] ? <StorageImage width={300} height={200} src={images[0].url} storagePath={images[0].storagePath} bucket="case-images" alt="施工事例" /> : null}
      <Field label={images[0] ? "代表画像を差し替える" : "代表画像を選択"}><input type="file" name="coverImage" accept="image/jpeg,image/png,image/webp" onChange={event => setCover(event.currentTarget.files?.[0])} /></Field>
      {images[0] ? <label className={ui["media-remove"]}><input type="checkbox" name="removeImageIds" value={images[0].id} />現在の代表画像を削除</label> : null}
    </section>
    <section className={ui["form-card"]}>
      <h2>タイムラインの写真</h2>
      <div className={ui["case-photo-editor"]}>
        {images.slice(1).map(image => <div className={ui["case-photo-item"]} key={image.id}>
          <StorageImage width={300} height={200} src={image.url} storagePath={image.storagePath} bucket="case-images" alt="施工事例" />
          <input type="hidden" name="imageIds" value={image.id} />
          <PhotoFields imageKey={image.id} date={image.date} description={image.description} />
          <label><input type="checkbox" name="removeImageIds" value={image.id} />この写真を削除</label>
        </div>)}
      </div>
      <Field label="写真を追加" hint="複数の写真を選択できます。"><input type="file" name="images" accept="image/jpeg,image/png,image/webp" multiple onChange={event => setFiles(Array.from(event.currentTarget.files ?? []))} /></Field>
      <div className={ui["case-photo-editor"]}>
        {files.map((file, index) => <div className={ui["case-photo-item"]} key={`${index}-${file.name}-${file.lastModified}`}>
          <FilePreview file={file} />
          <p>{file.name}</p>
          <PhotoFields imageKey={`new-${index}`} />
        </div>)}
      </div>
    </section>
  </section>;
}
