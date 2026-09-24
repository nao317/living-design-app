import { Link } from "react-router";
import { Avatar } from "../components/atoms";
import { CaseGrid } from "../components/organisms";
import { DashboardLayout } from "../components/templates";
import { cases, company, members } from "../data/mock";
import type { Route } from "./+types/company-dashboard";
import { requireAuthorization } from "../features/auth/authorization.client";
import { ProtectedRouteFallback } from "../features/auth/protected-route-fallback";

export function loader() {
  return { company, cases, members };
}

export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  await requireAuthorization(request, { role: "COMPANY" });
  return serverLoader();
}

clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return <ProtectedRouteFallback />;
}

export default function CompanyDashboardRoute({ loaderData }: { loaderData: ReturnType<typeof loader> }) {
  return (
    <DashboardLayout type="company">
      <header className="company-summary">
        <div>
          <p>{loaderData.company.name}</p>
          <h1>{loaderData.company.description}</h1>
          <Link className="button button--secondary" to="/company/profile/edit">企業情報を編集</Link>
        </div>
        <img src={loaderData.company.image} alt={loaderData.company.name} />
      </header>
      <section className="dashboard-section">
        <div className="section-header"><h2>施工事例</h2><Link to="/company/cases/new">施工事例を追加</Link></div>
        <CaseGrid items={loaderData.cases} />
      </section>
      <section className="dashboard-section">
        <div className="section-header"><h2>所属ユーザー</h2></div>
        <div className="member-list">
          {loaderData.members.map((member) => (
            <div key={member.id}><Avatar name={member.name} /><strong>{member.name}</strong><span>{member.email}</span><small>{member.role}</small></div>
          ))}
        </div>
      </section>
    </DashboardLayout>
  );
}
