import type { Route } from "./+types/company-case-edit";
import { ImagePlus, Plus } from "lucide-react";
import { data, Form } from "react-router";
import { Button, Tag } from "../components/atoms";
import { Field } from "../components/molecules";
import { DashboardLayout } from "../components/templates";
import { cases, images } from "../data/mock";

export function loader({ params }: Route.LoaderArgs) {
  return { item: cases.find((entry) => entry.id === params.caseId) ?? cases[0] };
}

export async function action({ request }: Route.ActionArgs) {
  await request.formData();
  return data({ saved: true });
}

export default function CompanyCaseEditRoute({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <DashboardLayout type="company">
      <header className="page-heading"><h1>施工事例の編集</h1></header>
      {actionData?.saved ? <p className="success-message" role="status">施工事例を保存しました。</p> : null}
      <Form method="post" className="edit-form">
        <section className="case-photo-editor">
          <img src={images.kitchen} alt="施工事例" />
          <img src={images.living} alt="施工事例" />
          <button type="button"><ImagePlus /><span>写真を追加</span></button>
        </section>
        <section className="form-card">
          <div className="form-grid">
            <Field label="費用の目安"><input name="price" defaultValue={loaderData.item.price} /></Field>
            <Field label="施工地域"><input name="area" defaultValue={loaderData.item.area} /></Field>
            <Field label="施工期間"><input name="period" defaultValue={loaderData.item.period} /></Field>
          </div>
          <div className="feature-editor"><span>カテゴリ</span>{loaderData.item.categories.map((category) => <Tag key={category}>{category}</Tag>)}<button type="button"><Plus size={14} />カテゴリを追加</button></div>
          <div className="form-actions"><Button type="submit">更新する</Button></div>
        </section>
      </Form>
    </DashboardLayout>
  );
}
