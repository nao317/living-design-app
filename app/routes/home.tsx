import { Filters } from "../components/organisms";
import { PublicLayout } from "../components/templates";
import { media } from "../data/media";
import { fetchSearchOptions, type SearchOption } from "../features/cases/public-data.client";
import type { Route } from "./+types/home";

export function loader() {
  return { categories: [] as SearchOption[], styles: [] as SearchOption[] };
}

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  const serverData = await serverLoader();
  try {
    return { ...serverData, ...(await fetchSearchOptions()) };
  } catch (error) {
    console.error("Failed to load search options", error);
    return serverData;
  }
}

clientLoader.hydrate = true as const;

export function meta() {
  return [
    { title: "飯塚のリノベ" },
    { name: "description", content: "飯塚エリアのリフォーム・リノベーション施工事例を検索できます。" },
  ];
}

export default function HomeRoute({ loaderData }: Route.ComponentProps) {
  return (
    <PublicLayout>
      <div className="public-page home-page">
        <section className="home-hero" style={{ backgroundImage: "url(" + media.house + ")" }}>
          <div>
            <h1>飯塚で理想のリフォーム＆<br />リノベーション</h1>
          </div>
        </section>
        <Filters compact categories={loaderData.categories} styles={loaderData.styles} />
      </div>
    </PublicLayout>
  );
}
