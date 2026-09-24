import { Building2, Heart, MapPin, Search } from "lucide-react";
import { Form, Link, useSearchParams } from "react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../atoms";
import type { CaseStudy } from "../../features/cases/types";
import { getAuthorizationContext } from "../../features/auth/authorization.client";
import { isSupabaseConfigured } from "../../lib/supabase.client";

export function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <Form className="search-bar" method="get" action="/search">
      <Search size={18} aria-hidden="true" />
      <input
        name="q"
        aria-label="施工事例を検索"
        placeholder="キッチンリフォーム、地域、会社名から検索"
        defaultValue={defaultValue}
      />
      <Button type="submit">検索</Button>
    </Form>
  );
}

export function CompanySearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <Form className="search-bar company-search-bar" method="get" action="/companies">
      <Search size={18} aria-hidden="true" />
      <input
        name="q"
        aria-label="企業名や所在地を検索"
        placeholder="企業名や所在地から検索"
        defaultValue={defaultValue}
      />
      <Button type="submit">検索</Button>
    </Form>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function FavoriteButton({ compact = false }: { compact?: boolean }) {
  const [active, setActive] = useState(false);
  const [canFavorite, setCanFavorite] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    void getAuthorizationContext().then((context) => {
      setCanFavorite(context?.accountRole !== "COMPANY" && context?.accountRole !== "ADMIN");
    }).catch(() => setCanFavorite(true));
  }, []);

  if (!canFavorite) return null;

  return (
    <button
      type="button"
      className={"favorite " + (active ? "is-active" : "")}
      onClick={() => setActive((value) => !value)}
      aria-label={active ? "お気に入りから削除" : "お気に入りに追加"}
      aria-pressed={active}
    >
      <Heart size={15} fill={active ? "currentColor" : "none"} />
      {compact ? null : active ? "お気に入り済み" : "お気に入りへ"}
    </button>
  );
}

export function CaseCard({ item }: { item: CaseStudy }) {
  return (
    <article className="case-card">
      <Link to={"/cases/" + item.id} className="case-card__image" aria-label={item.title + "の画像を見る"}>
        <img src={item.image} alt={item.title} />
      </Link>
      <div className="case-card__body">
        <h3><Link to={"/cases/" + item.id}>{item.title}</Link></h3>
        <p><Building2 size={13} />{item.company}</p>
        <div className="case-card__meta">
          <span><MapPin size={13} />{item.area}</span>
          <FavoriteButton compact />
        </div>
      </div>
    </article>
  );
}

export function CaseListItem({ item }: { item: CaseStudy }) {
  return (
    <article className="case-list-item">
      <Link to={"/cases/" + item.id} className="case-list-item__image">
        <img src={item.image} alt={item.title} />
      </Link>
      <div className="case-list-item__body">
        <h2>{item.title}</h2>
        <p className="case-list-item__company"><Building2 size={14} />{item.company}</p>
        <p>{item.categories.join("・")} / {item.area}</p>
        <p>費用目安：{item.price} / 施工期間：{item.period}</p>
      </div>
      <div className="case-list-item__actions">
        <Link className="button button--secondary" to={"/companies/" + item.companyId}>企業情報を見る</Link>
        <FavoriteButton />
        <Link className="button button--primary" to={"/cases/" + item.id}>詳細を見る</Link>
      </div>
    </article>
  );
}

export function Pagination({ totalItems, currentPage = 1, pageSize = 10 }: { totalItems: number; currentPage?: number; pageSize?: number }) {
  const [searchParams] = useSearchParams();
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return null;

  function getPageUrl(page: number) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(page));
    return `?${params.toString()}`;
  }

  return (
    <nav className="pagination" aria-label="ページ送り">
      {currentPage > 1 ? <Link to={getPageUrl(currentPage - 1)} aria-label="前のページ">‹</Link> : <span aria-hidden="true">‹</span>}
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
        page === currentPage
          ? <span key={page} className="is-current" aria-current="page">{page}</span>
          : <Link key={page} to={getPageUrl(page)}>{page}</Link>
      ))}
      {currentPage < totalPages ? <Link to={getPageUrl(currentPage + 1)} aria-label="次のページ">›</Link> : <span aria-hidden="true">›</span>}
    </nav>
  );
}
