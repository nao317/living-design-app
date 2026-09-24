import { media } from "../../data/media";
import { getSignedImageUrl } from "../media/image-storage.client";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../lib/supabase.client";
import type { CaseStudy, CompanyMember, CompanyProfile, CompanySummary } from "./types";

type CaseRow = {
  id: string;
  company_id: string;
  title: string;
  summary: string;
  area: string;
  price_min: number | null;
  price_max: number | null;
  construction_period: string;
};

type CompanyRow = {
  id: string;
  name: string;
  address: string;
  phone: string;
  founded_year: number | null;
  business_hours: string;
  website_url: string | null;
  description: string;
  logo_path?: string | null;
  cover_image_path?: string | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatPrice(row: CaseRow) {
  if (row.price_min === null && row.price_max === null) return "";
  if (row.price_min === null) return `〜${row.price_max}`;
  if (row.price_max === null) return `${row.price_min}〜`;
  return `${row.price_min}〜${row.price_max}`;
}

function toCaseStudy(row: CaseRow, company: Pick<CompanyRow, "id" | "name">, index: number): CaseStudy {
  return {
    id: row.id,
    title: row.title,
    company: company.name,
    companyId: company.id,
    image: [media.kitchen, media.living, media.house][index % 3],
    area: row.area,
    price: formatPrice(row),
    period: row.construction_period,
    categories: [],
    summary: row.summary,
  };
}

async function fetchCasesByRows(rows: CaseRow[]) {
  if (!rows.length) return [];
  const supabase = getSupabaseBrowserClient();
  const companyIds = [...new Set(rows.map((row) => row.company_id))];
  const { data, error } = await supabase.from("companies")
    .select("id, name")
    .in("id", companyIds)
    .neq("status", "SUSPENDED");
  if (error) throw error;

  const companies = new Map((data ?? []).map((company) => [company.id, company]));
  const { data: imageRows, error: imageError } = await supabase.from("case_images")
    .select("case_id, storage_path, display_order")
    .in("case_id", rows.map((row) => row.id))
    .order("display_order");
  if (imageError) throw imageError;
  const imageUrls = new Map<string, string[]>();
  for (const image of imageRows ?? []) {
    const url = await getSignedImageUrl("case-images", image.storage_path);
    if (url) imageUrls.set(image.case_id, [...(imageUrls.get(image.case_id) ?? []), url]);
  }
  return rows.flatMap((row, index) => {
    const company = companies.get(row.company_id);
    if (!company) return [];
    const item = toCaseStudy(row, company, index);
    const images = imageUrls.get(row.id) ?? [];
    return [{ ...item, image: images[0] ?? item.image, images: images.length ? images : undefined }];
  });
}

export async function fetchPublishedCases() {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("construction_cases")
    .select("id, company_id, title, summary, area, price_min, price_max, construction_period")
    .eq("status", "PUBLISHED")
    .order("published_at", { ascending: false });
  if (error) throw error;
  return fetchCasesByRows((data ?? []) as CaseRow[]);
}

export async function fetchCaseById(caseId: string) {
  if (!isSupabaseConfigured() || !uuidPattern.test(caseId)) return null;
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("construction_cases")
    .select("id, company_id, title, summary, area, price_min, price_max, construction_period")
    .eq("id", caseId)
    .maybeSingle();
  if (error) throw error;
  const cases = await fetchCasesByRows(data ? [data as CaseRow] : []);
  return cases[0] ?? null;
}

export async function fetchCompanyById(companyId: string) {
  if (!isSupabaseConfigured() || !uuidPattern.test(companyId)) return null;
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("companies")
    .select("id, name, address, phone, founded_year, business_hours, website_url, description, logo_path, cover_image_path")
    .eq("id", companyId)
    .neq("status", "SUSPENDED")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const company = data as CompanyRow;
  const { data: caseRows, error: casesError } = await supabase.from("construction_cases")
    .select("id, company_id, title, summary, area, price_min, price_max, construction_period")
    .eq("company_id", companyId)
    .eq("status", "PUBLISHED")
    .order("published_at", { ascending: false });
  if (casesError) throw casesError;

  const companyImage = await getSignedImageUrl("company-assets", company.cover_image_path ?? company.logo_path);
  return {
    company: {
      ...company,
      founded: company.founded_year ? `${company.founded_year}年` : "",
      website: company.website_url ?? "",
      businessHours: company.business_hours,
      image: companyImage ?? media.office,
      logoImage: await getSignedImageUrl("company-assets", company.logo_path),
      coverImage: companyImage ?? undefined,
      features: [],
    },
    cases: await fetchCasesByRows((caseRows ?? []) as CaseRow[]),
  };
}

export async function fetchPublishedCompanies(): Promise<CompanySummary[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("companies")
    .select("id, name, address, description, logo_path, cover_image_path")
    .neq("status", "SUSPENDED")
    .order("name");
  if (error) throw error;
  return Promise.all((data ?? []).map(async (company) => ({
    id: company.id,
    name: company.name,
    address: company.address,
    description: company.description,
    image: await getSignedImageUrl("company-assets", company.cover_image_path ?? company.logo_path) ?? media.office,
  })));
}

export async function fetchFavoriteCases() {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("favorites").select("case_id");
  if (error) throw error;
  const ids = (data ?? []).map((favorite) => favorite.case_id);
  if (!ids.length) return [];
  const { data: rows, error: casesError } = await supabase.from("construction_cases")
    .select("id, company_id, title, summary, area, price_min, price_max, construction_period")
    .in("id", ids)
    .eq("status", "PUBLISHED");
  if (casesError) throw casesError;
  return fetchCasesByRows((rows ?? []) as CaseRow[]);
}

export async function fetchManagedCompany(companyId: string) {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseBrowserClient();
  const [{ data: company, error: companyError }, { data: caseRows, error: casesError }, { data: memberRows, error: membersError }] = await Promise.all([
    supabase.from("companies").select("id, name, address, phone, founded_year, business_hours, website_url, description, logo_path, cover_image_path").eq("id", companyId).maybeSingle(),
    supabase.from("construction_cases").select("id, company_id, title, summary, area, price_min, price_max, construction_period").eq("company_id", companyId).order("updated_at", { ascending: false }),
    supabase.from("company_members").select("user_id, role").eq("company_id", companyId),
  ]);
  if (companyError) throw companyError;
  if (casesError) throw casesError;
  if (membersError) throw membersError;
  if (!company) return null;

  const members = (memberRows ?? []) as Array<{ user_id: string; role: string }>;
  const userIds = members.map((member) => member.user_id);
  const { data: profiles, error: profilesError } = userIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
    : { data: [], error: null };
  if (profilesError) throw profilesError;
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));
  const companyRow = company as CompanyRow;
  const profile: CompanyProfile = {
    ...companyRow,
    founded: companyRow.founded_year ? `${companyRow.founded_year}年` : "",
    website: companyRow.website_url ?? "",
    businessHours: companyRow.business_hours,
    image: await getSignedImageUrl("company-assets", companyRow.cover_image_path ?? companyRow.logo_path) ?? media.office,
    logoImage: (await getSignedImageUrl("company-assets", companyRow.logo_path)) ?? undefined,
    coverImage: (await getSignedImageUrl("company-assets", companyRow.cover_image_path)) ?? undefined,
    features: [],
  };
  const memberList: CompanyMember[] = members.map((member) => ({
    id: member.user_id,
    name: names.get(member.user_id) ?? "ユーザー",
    role: member.role,
    email: "",
  }));

  const managedRows = (caseRows ?? []) as CaseRow[];
  const caseImageUrls = new Map<string, string[]>();
  if (managedRows.length) {
    const { data: imageRows, error: imageError } = await supabase.from("case_images")
      .select("case_id, storage_path, display_order")
      .in("case_id", managedRows.map((row) => row.id))
      .order("display_order");
    if (imageError) throw imageError;
    for (const image of imageRows ?? []) {
      const url = await getSignedImageUrl("case-images", image.storage_path);
      if (url) caseImageUrls.set(image.case_id, [...(caseImageUrls.get(image.case_id) ?? []), url]);
    }
  }

  return {
    company: profile,
    cases: managedRows.map((row, index) => {
      const item = toCaseStudy(row, companyRow, index);
      const images = caseImageUrls.get(row.id) ?? [];
      return { ...item, image: images[0] ?? item.image, images: images.length ? images : undefined };
    }),
    members: memberList,
  };
}
