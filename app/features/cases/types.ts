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
  images?: string[];
};

export type CompanyProfile = {
  id: string;
  name: string;
  address: string;
  phone: string;
  founded: string;
  businessHours: string;
  website: string;
  description: string;
  image: string;
  features: string[];
  logoImage?: string;
  coverImage?: string;
};

export type CompanySummary = Pick<CompanyProfile, "id" | "name" | "address" | "description" | "image">;

export type CompanyMember = {
  id: string;
  name: string;
  role: string;
  email: string;
};
