import { Link } from "react-router";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p><strong>飯塚のリノベ</strong><span>飯塚エリアのリフォーム・リノベーション探しをお手伝いします。</span></p>
        <nav aria-label="フッターメニュー">
          <Link to="/search">施工事例を探す</Link>
          <Link to="/companies">企業を探す</Link>
          <Link to="/contact">お問い合わせ</Link>
        </nav>
      </div>
    </footer>
  );
}
