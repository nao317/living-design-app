import { Link } from "react-router";
import { PublicLayout } from "../components/templates";

export default function NotFoundRoute() {
  return (
    <PublicLayout>
      <div className="not-found">
        <h1>ページが見つかりません</h1>
        <Link className="button button--primary" to="/">ホームへ戻る</Link>
      </div>
    </PublicLayout>
  );
}
