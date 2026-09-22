import type { Route } from "./+types/company-profile-edit";
import { Camera, Plus } from "lucide-react";
import { data, Form } from "react-router";
import { Button, Tag } from "../components/atoms";
import { Field } from "../components/molecules";
import { DashboardLayout } from "../components/templates";
import { company } from "../data/mock";

export function loader() {
  return { company };
}

export async function action({ request }: Route.ActionArgs) {
  await request.formData();
  return data({ saved: true });
}

export default function CompanyProfileEditRoute({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <DashboardLayout type="company">
      <header className="page-heading"><h1>企業情報の編集</h1></header>
      {actionData?.saved ? <p className="success-message" role="status">企業情報を保存しました。</p> : null}
      <Form method="post" className="edit-form">
        <section className="company-media-fields">
          <button type="button" className="media-placeholder"><Plus /><span>メイン画像を追加</span></button>
          <button type="button" className="media-placeholder"><Camera /><span>ロゴ画像を追加</span></button>
        </section>
        <section className="form-card">
          <h2>企業情報</h2>
          <div className="form-grid">
            <Field label="企業名"><input name="name" defaultValue={loaderData.company.name} /></Field>
            <Field label="設立年"><input name="founded" defaultValue={loaderData.company.founded} /></Field>
            <Field label="電話番号"><input name="phone" defaultValue={loaderData.company.phone} /></Field>
            <Field label="ホームページ"><input name="website" defaultValue={loaderData.company.website} /></Field>
            <Field label="所在地"><input name="address" defaultValue={loaderData.company.address} /></Field>
            <Field label="営業時間"><input name="businessHours" defaultValue={loaderData.company.businessHours} /></Field>
          </div>
          <Field label="企業紹介"><textarea name="description" rows={3} defaultValue={loaderData.company.description} /></Field>
          <div className="feature-editor"><span>アピールポイント</span>{loaderData.company.features.map((feature) => <Tag key={feature}>{feature}</Tag>)}<button type="button"><Plus size={14} />追加</button></div>
          <div className="form-actions"><Button type="submit">更新する</Button></div>
        </section>
      </Form>
    </DashboardLayout>
  );
}
