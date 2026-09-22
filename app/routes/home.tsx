import { Filters } from "../components/organisms";
import { SearchBar } from "../components/molecules";
import { PublicLayout } from "../components/templates";
import { images } from "../data/mock";

export function meta() {
  return [
    { title: "飯塚のリノベ" },
    { name: "description", content: "飯塚エリアのリフォーム・リノベーション施工事例を検索できます。" },
  ];
}

export default function HomeRoute() {
  return (
    <PublicLayout>
      <div className="public-page home-page">
        <section className="home-hero" style={{ backgroundImage: "url(" + images.house + ")" }}>
          <div>
            <h1>飯塚で理想のリフォーム＆<br />リノベーション</h1>
          </div>
        </section>
        <SearchBar />
        <Filters compact />
      </div>
    </PublicLayout>
  );
}
