export type TaxonomyKind = "CATEGORY" | "STYLE";
export type TaxonomyOperation = "CREATE" | "EDIT" | "DELETE";
export type TaxonomyStatus = "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN";

export type TaxonomyOption = { id: string; name: string };
export type TaxonomyRequest = {
  id: string;
  company_id: string;
  requested_by: string;
  kind: TaxonomyKind;
  operation: TaxonomyOperation;
  target_id: string | null;
  proposed_name: string | null;
  reason: string;
  status: TaxonomyStatus;
  review_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export const kindLabel: Record<TaxonomyKind, string> = {
  CATEGORY: "リノベーション箇所",
  STYLE: "こだわり条件",
};

export const operationLabel: Record<TaxonomyOperation, string> = {
  CREATE: "追加",
  EDIT: "名称変更",
  DELETE: "削除",
};

export const statusLabel: Record<TaxonomyStatus, string> = {
  PENDING: "審査中",
  APPROVED: "承認",
  REJECTED: "却下",
  WITHDRAWN: "取下げ",
};
