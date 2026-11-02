import { PublicLayout } from "./public-layout";

export function PublicRouteFallback({ label }: { label: string }) {
  return (
    <PublicLayout>
      <div className="public-page route-loading" role="status">
        <span className="spinner" aria-hidden="true" />
        <p>{label}</p>
      </div>
    </PublicLayout>
  );
}
