import type { CSSProperties } from "react";
import styles from "./partner-map.module.css";

const radialBlurLevels = [0.375, 0.75, 1.5, 3, 6, 12];

// The static map is centered on the coordinates supplied for Living Design.
// Keep the pin at the center when the map is cropped for narrow screens.
const companies = [{
  id: "living-design",
  number: 1,
  name: "リビングデザイン",
  website: "https://living-d-f.com/",
  latitude: 33.60904,
  longitude: 130.6719161,
}];

export function PartnerMap() {
  return <section className={styles.section} aria-label="参加企業の所在地">
    <div className={styles.layout}>
      <div className={styles.mapPanel}>
        <div className={styles.map}>
          <div className={styles.surface}>
            <img className={styles.basemap} src="/maps/iizuka-openstreetmap.png" width={1182} height={491} alt="OpenStreetMapによる飯塚市と桂川町周辺の地図" decoding="async" fetchPriority="high" />
            <div className={styles.radialBlur} aria-hidden="true">
              {radialBlurLevels.map((blur, index) => <span key={blur} style={{
                "--blur-radius": `${blur}px`,
                "--blur-start": `${50 + index * 8}%`,
                "--blur-end": `${Math.min(100, 66 + index * 8)}%`,
              } as CSSProperties} />)}
            </div>
          </div>
          {companies.map(company => <a key={company.id} className={styles.pin} href={company.website} aria-label={`${company.number}：株式会社${company.name}のホームページへ`} data-latitude={company.latitude} data-longitude={company.longitude}>
            <svg className={styles.marker} width={48} height={48} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" />
              <text className={styles.pinNumber} x={12} y={10}>{company.number}</text>
            </svg>
          </a>)}
        </div>
        <a className={styles.attribution} href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>
      </div>
      <ol className={styles.companyList} aria-label="参加企業一覧">
        {companies.map(company => <li key={company.id}>
          <a href={company.website}>
            <span className={styles.companyNumber}>{company.number}</span>
            <span className={styles.companyName}>{company.name}</span>
          </a>
        </li>)}
      </ol>
    </div>
  </section>;
}
