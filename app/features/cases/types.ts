export type CaseStudy = {
  id: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  title: string;
  company: string;
  companyId: string;
  companyAddress?: string;
  companyImage?: string;
  companyImagePath?: string;
  image: string;
  imagePath?: string;
  area: string;
  price: string;
  period: string;
  categories: string[];
  summary: string;
  images?: string[];
  imagesPaths?: string[];
  priceMin?: number | null;
  priceMax?: number | null;
  periodMonths?: number | null;
  styles?: string[];
  categorySlugs?: string[];
  styleSlugs?: string[];
};

export type CompanyProfile = {
  id: string;
  name: string;
  email: string;
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
  imagePath?: string;
  logoImagePath?: string;
  coverImagePath?: string;
};

export type CompanySummary = Pick<CompanyProfile, "id" | "name" | "address" | "description" | "image" | "imagePath">;

export type CompanyMember = {
  id: string;
  name: string;
  role: string;
  email: string;
};

export type CompanyContactOption = {
  id: string;
  name: string;
};

export type ContactMessage = {
  id: string;
  companyId: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  caseId?: string;
  status: "NEW" | "READ" | "ARCHIVED";
  createdAt: string;
  readAt?: string;
};
