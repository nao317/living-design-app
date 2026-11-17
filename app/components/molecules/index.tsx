import ui from "../../ui.module.css";
import { Building2, ChevronLeft, ChevronRight, Clock3, Hammer, Heart, MapPin, Search } from "lucide-react";
import { Form, Link, useFetcher, useLocation, useSearchParams } from "react-router";
import { cloneElement, isValidElement, useId, type ReactNode, type ReactElement, type InputHTMLAttributes } from "react";
import { Button } from "../atoms";
import type { CaseStudy } from "../../features/cases/types";
import { useFavorites } from "../../features/favorites/favorites-context";
import { useFieldErrors } from "../../features/forms/managed-form";
import type { clientAction as favoriteAction } from "../../routes/favorite-update";
import { StorageImage } from "../../features/media/storage-image";

const pageNumberFormatter = new Intl.NumberFormat("ja-JP");

export { EmptyState } from "./empty-state";
export { PageHeader } from "./page-header";
export { Breadcrumb } from "./breadcrumb";

export function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <Form key={defaultValue} className={ui["search-bar"]} method="get" action="/search">
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
    <Form key={defaultValue} className={ui["search-bar"] + " " + ui["company-search-bar"]} method="get" action="/companies">
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
    <div className={ui["field"]}>
      <label htmlFor={id}>{label}</label>
      {control ? cloneElement(control, { id, autoComplete: control.props.autoComplete ?? "off", "aria-invalid": error ? true : control.props["aria-invalid"], "aria-describedby": describedBy || undefined }) : children}
      {hint ? <small id={`${id}-hint`}>{hint}</small> : null}
      {error ? <small className={ui["field-error"]} id={`${id}-error`} role="alert">{error}</small> : null}
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


  return (
    <span className={ui["favorite-control"]}>
    <button
      type="button"
      className={`${ui.favorite} ${active ? ui["is-active"] : ""}`.trim()}
      disabled={!ready || pending || error}
      onClick={() => {
        void fetcher.submit({ caseId, saved: String(!active), redirectTo: location.pathname + location.search }, { method: "post", action: "/favorites/update" });
      }}
      aria-label={active ? "お気に入りから削除" : "お気に入りに追加"}
      aria-pressed={active}
      title={iconOnly ? active ? "お気に入りから削除" : "お気に入りに追加" : !authorization ? "この端末に保存します。ログインするとアカウントへ引き継げます。" : undefined}
    >
      <Heart size={15} fill={active ? "currentColor" : "none"} aria-hidden="true" />
      {iconOnly ? null : pending ? "保存中…" : active ? "保存済み" : "保存"}
    </button>
    {fetcher.data?.error || error ? <small className={ui["field-error"]} role="alert">{fetcher.data?.error || "お気に入りを読み込めませんでした。再読み込みしてください。"}</small> : null}
    <span className={ui["sr-only"]} role="status">{pending ? "お気に入りを保存しています…" : fetcher.data && !fetcher.data.error ? active ? "お気に入りに保存しました。" : "お気に入りから削除しました。" : ""}</span>
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
    <article className={ui["case-card"]}>
      <Link to={"/cases/" + item.id} className={ui["case-card__image"]} aria-label={item.title + "の詳細を見る"}>
        {item.image ? <StorageImage width={800} height={472} src={item.image} storagePath={item.imagePath} bucket="case-images" alt={item.title} /> : <span className={ui["image-empty"]}>写真の掲載なし</span>}
      </Link>
      <div className={ui["case-card__body"]}>
        <h3><Link to={"/cases/" + item.id}>{item.title}</Link></h3>
        {item.status && item.status !== "PUBLISHED" ? <p className={ui["case-card__status"]}>{item.status === "DRAFT" ? "下書き・検索には表示されません" : "非公開・検索には表示されません"}</p> : null}
        <p className={ui["case-card__price"]}>{item.price}</p>
        <p><Building2 aria-hidden="true" size={13} />{item.company}</p>
        <div className={ui["case-card__meta"]}>
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
    <article className={ui["case-list-item"]}>
      <Link to={detailUrl} className={ui["case-list-item__image"]}>
        {item.image ? <StorageImage width={800} height={600} src={item.image} storagePath={item.imagePath} bucket="case-images" alt={item.title} /> : <span className={ui["image-empty"]}>写真の掲載なし</span>}
      </Link>
      <div className={ui["case-list-item__body"]}>
        <h2><Link to={detailUrl}>{item.title}</Link></h2>
        <p className={ui["case-list-item__company"]}><Link to={"/companies/" + item.companyId}>{item.company}</Link></p>
        <div className={ui["case-list-item__facts"]}>
          <span><Hammer size={15} aria-hidden="true" /><span className={ui["sr-only"]}>施工箇所：</span>{item.categories.join("・") || "記載なし"}</span>
          <span><MapPin size={15} aria-hidden="true" /><span className={ui["sr-only"]}>施工地域：</span>{item.area || "記載なし"}</span>
        </div>
        <p className={ui["case-list-item__price"]}>{item.price}</p>
        <p className={ui["case-list-item__period"]}><Clock3 size={15} aria-hidden="true" /><span className={ui["sr-only"]}>施工期間：</span>{item.period || "要相談"}</p>
      </div>
      <div className={ui["case-list-item__actions"]}>
        <FavoriteIconButton caseId={item.id} />
      </div>
    </article>
  );
}

export function Pagination({ totalItems, currentPage = 1, pageSize = 10, paramName = "page", ariaLabel = "ページ送り", showSinglePage = false }: { totalItems: number; currentPage?: number; pageSize?: number; paramName?: string; ariaLabel?: string; showSinglePage?: boolean }) {
  const [searchParams] = useSearchParams();
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalItems === 0 || (totalPages === 1 && !showSinglePage)) return null;
  const formattedCurrentPage = pageNumberFormatter.format(currentPage);
  const formattedTotalPages = pageNumberFormatter.format(totalPages);

  function getPageUrl(page: number) {
    const params = new URLSearchParams(searchParams);
    params.set(paramName, String(page));
    return `?${params.toString()}`;
  }

  return (
    <nav className={ui["pagination"]} aria-label={ariaLabel}>
      {currentPage > 1 ? <Link className={ui["pagination__link"] + " " + ui["pagination__link--previous"]} to={getPageUrl(currentPage - 1)}><ChevronLeft size={20} aria-hidden="true" />前のページ</Link> : null}
      <span className={ui["pagination__counter"]} aria-current="page">
        <span className={ui["sr-only"]}>{formattedCurrentPage}ページ、全{formattedTotalPages}ページ</span>
        <span aria-hidden="true">{formattedCurrentPage} / {formattedTotalPages}</span>
      </span>
      {currentPage < totalPages ? <Link className={ui["pagination__link"] + " " + ui["pagination__link--next"]} to={getPageUrl(currentPage + 1)}>次のページ<ChevronRight size={20} aria-hidden="true" /></Link> : null}
    </nav>
  );
}
