import ui from "../../ui.module.css";
import type { CaseStudy } from "../../features/cases/types";
import { CaseCard, CaseListItem } from "../molecules";
export { Sidebar } from "./sidebar";
export { DataTable, dataTableStyles } from "./data-table";

export function CaseGrid({ items }: { items: CaseStudy[] }) {
  return <div className={ui["case-grid"]}>{items.map((item) => <CaseCard key={item.id} item={item} />)}</div>;
}

export function CaseList({ items }: { items: CaseStudy[] }) {
  return <div className={ui["case-list"]}>{items.map((item) => <CaseListItem key={item.id} item={item} />)}</div>;
}
