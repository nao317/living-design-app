export const images = {
  kitchen: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=80",
  kitchenBefore: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
  living: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
  house: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=80",
  office: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
};

export type CaseStudy = {
  id: string;
  title: string;
  company: string;
  companyId: string;
  image: string;
  area: string;
  price: string;
  period: string;
  categories: string[];
  summary: string;
};

export const cases: CaseStudy[] = [
  {
    id: "1",
    title: "キッチンを中心にしたリノベーション",
    company: "株式会社リビングデザイン",
    companyId: "1",
    image: images.kitchen,
    area: "飯塚市",
    price: "約800〜1,000万円",
    period: "約1か月",
    categories: ["キッチン", "水回り"],
    summary: "対面キッチンへ変更し、収納と家事動線に配慮した施工事例です。",
  },
  {
    id: "2",
    title: "家族が集まるリビングへ",
    company: "株式会社リビングデザイン",
    companyId: "1",
    image: images.living,
    area: "飯塚市",
    price: "約500〜800万円",
    period: "約2か月",
    categories: ["リビング", "内装"],
    summary: "明るさと使いやすさを整えたリビングの施工事例です。",
  },
  {
    id: "3",
    title: "住まい全体の断熱改修",
    company: "株式会社リビングデザイン",
    companyId: "1",
    image: images.house,
    area: "直方市",
    price: "約1,000〜1,500万円",
    period: "約3か月",
    categories: ["戸建て", "断熱"],
    summary: "外装と断熱性能を見直した戸建ての施工事例です。",
  },
];

export const company = {
  id: "1",
  name: "株式会社リビングデザイン",
  address: "福岡県飯塚市本町7-9-1",
  phone: "0948-00-0000",
  founded: "1999年",
  businessHours: "9:00〜18:00（水曜定休）",
  website: "https://living-design.example",
  description: "リノベーションを通して、住む人すべてを豊かに。",
  image: images.office,
  features: ["見積もり休日対応可", "見積もり無料", "LINE対応可", "部分リフォーム"],
};

export const members = [
  { id: "1", name: "ProAccount Name", role: "管理者", email: "owner@example.com" },
  { id: "2", name: "Staff Member", role: "スタッフ", email: "staff@example.com" },
];
