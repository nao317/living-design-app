import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { getSignedImageUrl, markImageTransformUnavailable, type ImagePreset } from "./image-storage.client";

type StorageImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "width" | "height"> & {
  width: number;
  height: number;
  bucket: "case-images" | "company-assets";
  storagePath?: string | null;
  preset?: ImagePreset;
};

export function StorageImage(props: StorageImageProps) {
  // A source change must discard the previous signed URL and fallback attempt.
  const sourceKey = JSON.stringify([props.bucket, props.storagePath, props.preset, props.src]);
  return <StorageImageSource key={sourceKey} {...props} />;
}

function StorageImageSource({ src, bucket, storagePath, preset, loading = "lazy", decoding = "async", onError, onLoad, ...props }: StorageImageProps) {
  const [loaded, setLoaded] = useState<{ path: string; url: string | null }>();
  const [fallback, setFallback] = useState<{ source?: string; url?: string; attempted: boolean }>({ attempted: false });
  useEffect(() => {
    if (src || !storagePath) return;
    let active = true;
    void getSignedImageUrl(bucket, storagePath, preset).then((url) => {
      if (active) setLoaded({ path: storagePath, url });
    });
    return () => { active = false; };
  }, [bucket, preset, src, storagePath]);

  const source = src || (loaded?.path === storagePath ? loaded?.url ?? undefined : undefined);
  const currentSrc = fallback.source === source ? fallback.url ?? source : source;
  const fallbackAttempted = fallback.source === source && fallback.attempted;

  return <img
    {...props}
    src={currentSrc}
    loading={loading}
    decoding={decoding}
    onLoad={(event) => {
      onLoad?.(event);
      if (fallback.source === source && fallback.url) markImageTransformUnavailable();
    }}
    onError={(event) => {
      onError?.(event);
      if (!storagePath || fallbackAttempted) return;
      setFallback({ source, attempted: true });
      void getSignedImageUrl(bucket, storagePath).then((fallbackUrl) => {
        if (fallbackUrl) setFallback({ source, url: fallbackUrl, attempted: true });
      });
    }}
  />;
}
