import { Building2, Heart, MapPin, Search } from "lucide-react";
import { Form, Link, useFetcher, useLocation, useSearchParams } from "react-router";
import { cloneElement, isValidElement, useId, type ReactNode, type ReactElement, type InputHTMLAttributes } from "react";
import { Button } from "../atoms";
import type { CaseStudy } from "../../features/cases/types";
import { useFavorites } from "../../features/favorites/favorites-context";
import { useFieldErrors } from "../../features/forms/managed-form";
import type { clientAction as favoriteAction } from "../../routes/favorite-update";
import { StorageImage } from "../../features/media/storage-image";

export function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <Form key={defaultValue} className="search-bar" method="get" action="/search">
      <Search size={18} aria-hidden="true" />
      <input
        name="q"
        aria-label="施工事例を検索"
        placeholder="例：キッチン・飯塚市…"
        defaultValue={defaultValue}
        autoComplete="off"
      />
      <Button type="submit">検索</Button>
    </Form>
  );
}

export function CompanySearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <Form key={defaultValue} className="search-bar company-search-bar" method="get" action="/companies">
      <Search size={18} aria-hidden="true" />
      <input
        name="q"
        aria-label="企業名や所在地を検索"
        placeholder="例：企業名・飯塚市…"
        defaultValue={defaultValue}
        autoComplete="off"
      />
      <Button type="submit">検索</Button>
    </Form>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  const generatedId = useId();
  const errors = useFieldErrors();
  const control = isValidElement(children) ? children as ReactElement<InputHTMLAttributes<HTMLInputElement>> : null;
  const id = control?.props.id ?? generatedId;
  const error = control?.props.name ? errors[control.props.name] : undefined;
  const describedBy = [control?.props["aria-describedby"], hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ");
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {control ? cloneElement(control, { id, autoComplete: control.props.autoComplete ?? "off", "aria-invalid": error ? true : control.props["aria-invalid"], "aria-describedby": describedBy || undefined }) : children}
      {hint ? <small id={`${id}-hint`}>{hint}</small> : null}
      {error ? <small className="field-error" id={`${id}-error`} role="alert">{error}</small> : null}
    </div>
  );
}

function FavoriteControl({ caseId, presentation }: { caseId: string; presentation: "icon" | "label" }) {
  const { state: { authorization, ids }, meta: { ready, error } } = useFavorites();
  const fetcher = useFetcher<typeof favoriteAction>({ key: `favorite:${caseId}` });
  const location = useLocation();
  const active = ids.has(caseId);
  const pending = fetcher.state !== "idle";
  if (authorization && authorization.accountRole !== "GENERAL") return null;
  const iconOnly = presentation === "icon";
  if (ready && !error && !authorization) return <Link
    className="favorite" to={`/login?redirectTo=${encodeURIComponent(location.pathname + location.search)}`}
    aria-label="ログインしてお気に入りに追加"
  ><Heart size={15} aria-hidden="true" />{iconOnly ? null : "お気に入りへ"}</Link>;

  return (
    <span className="favorite-control">
    <button
      type="button"
      className={"favorite " + (active ? "is-active" : "")}
      disabled={!ready || pending || error}
      onClick={() => {
        void fetcher.submit({ caseId, saved: String(!active), redirectTo: location.pathname + location.search }, { method: "post", action: "/favorites/update" });
      }}
      aria-label={active ? "お気に入りから削除" : "お気に入りに追加"}
      aria-pressed={active}
    >
      <Heart size={15} fill={active ? "currentColor" : "none"} aria-hidden="true" />
      {iconOnly ? null : pending ? "保存中…" : active ? "お気に入り済み" : "お気に入りへ"}
    </button>
    {fetcher.data?.error || error ? <small className="field-error" role="alert">{fetcher.data?.error || "お気に入りを読み込めませんでした。再読み込みしてください。"}</small> : null}
    <span className="sr-only" role="status">{pending ? "お気に入りを保存しています…" : fetcher.data && !fetcher.data.error ? active ? "お気に入りに保存しました。" : "お気に入りから削除しました。" : ""}</span>
    </span>
  );
}

export function FavoriteButton({ caseId }: { caseId: string }) {
  return <FavoriteControl caseId={caseId} presentation="label" />;
}

export function FavoriteIconButton({ caseId }: { caseId: string }) {
  return <FavoriteControl caseId={caseId} presentation="icon" />;
}

export function CaseCard({ item }: { item: CaseStudy }) {
  return (
    <article className="case-card">
      <Link to={"/cases/" + item.id} className="case-card__image" aria-label={item.title + "の詳細を見る"}>
        {item.image ? <StorageImage width={800} height={472} src={item.image} storagePath={item.imagePath} bucket="case-images" alt={item.title} /> : <span className="image-empty">画像未登録</span>}
      </Link>
      <div className="case-card__body">
        <h3><Link to={"/cases/" + item.id}>{item.title}</Link></h3>
        {item.status && item.status !== "PUBLISHED" ? <p className="case-card__status">{item.status === "DRAFT" ? "下書き・検索には表示されません" : "非公開・検索には表示されません"}</p> : null}
        <p><Building2 aria-hidden="true" size={13} />{item.company}</p>
        <div className="case-card__meta">
          <span><MapPin aria-hidden="true" size={13} />{item.area}</span>
          <FavoriteIconButton caseId={item.id} />
        </div>
      </div>
    </article>
  );
}

export function CaseListItem({ item }: { item: CaseStudy }) {
  const location = useLocation();
  const returnTo = location.pathname === "/search" ? location.pathname + location.search : null;
  const detailUrl = `/cases/${item.id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;
  return (
    <article className="case-list-item">
      <Link to={detailUrl} className="case-list-item__image">
        {item.image ? <StorageImage width={190} height={112} src={item.image} storagePath={item.imagePath} bucket="case-images" alt={item.title} /> : <span className="image-empty">画像未登録</span>}
      </Link>
      <div className="case-list-item__body">
        <h2><Link to={detailUrl}>{item.title}</Link></h2>
        <p className="case-list-item__company"><Building2 aria-hidden="true" size={14} />{item.company}</p>
        <p>{item.categories.join("・") || "箇所未登録"} / {item.area || "地域未登録"}</p>
        <p>費用目安：{item.price} / 施工期間：{item.period}</p>
      </div>
      <div className="case-list-item__actions">
        <Link className="button button--secondary" to={"/companies/" + item.companyId}>企業情報を見る</Link>
        <FavoriteButton caseId={item.id} />
        <Link className="button button--primary" to={detailUrl}>詳細を見る</Link>
      </div>
    </article>
  );
}

export function Pagination({ totalItems, currentPage = 1, pageSize = 10 }: { totalItems: number; currentPage?: number; pageSize?: number }) {
  const [searchParams] = useSearchParams();
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return null;
  const pages = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages])].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);

  function getPageUrl(page: number) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(page));
    return `?${params.toString()}`;
  }

  return (
    <nav className="pagination" aria-label="ページ送り">
      {currentPage > 1 ? <Link to={getPageUrl(currentPage - 1)} aria-label="前のページ">‹</Link> : <span aria-hidden="true">‹</span>}
      {pages.flatMap((page, index) => [
        ...(index > 0 && page - pages[index - 1] > 1 ? [<span key={`gap-${page}`} className="pagination-gap" aria-hidden="true">…</span>] : []),
        page === currentPage
          ? <span key={page} className="is-current" aria-current="page" aria-label={`${page}ページ（現在）`}>{page}</span>
          : <Link key={page} to={getPageUrl(page)} aria-label={`${page}ページへ`}>{page}</Link>,
      ])}
      {currentPage < totalPages ? <Link to={getPageUrl(currentPage + 1)} aria-label="次のページ">›</Link> : <span aria-hidden="true">›</span>}
    </nav>
  );
}
