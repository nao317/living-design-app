import ui from "../../ui.module.css";
import { LoadingIndicator } from "../../components/atoms";
export function ProtectedRouteFallback() {
  return (
    <main className={ui["auth-callback"]}>
      <LoadingIndicator label="権限を確認しています…" />
    </main>
  );
}
