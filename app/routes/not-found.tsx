import ui from "../ui.module.css";
import { Link } from "react-router";
import { PublicLayout } from "../components/templates/public-layout";

export default function NotFoundRoute() {
  return (
    <PublicLayout>
      <div className={ui["not-found"]}>
        <h1>ページが見つかりません</h1>
        <Link className={ui["button"] + " " + ui["button--primary"]} to="/">ホームへ戻る</Link>
      </div>
    </PublicLayout>
  );
}

export function meta() { return [{ title: "ページが見つかりません | 飯塚のリノベ" }]; }
