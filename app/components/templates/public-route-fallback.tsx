import ui from "../../ui.module.css";
import { PublicLayout } from "./public-layout";
import { LoadingIndicator } from "../atoms";

export function PublicRouteFallback({ label }: { label: string }) {
  return (
    <PublicLayout>
      <div className={ui["public-page"] + " " + ui["route-loading"]}>
        <LoadingIndicator label={label} />
      </div>
    </PublicLayout>
  );
}
