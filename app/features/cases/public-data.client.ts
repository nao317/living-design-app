import { media } from "../../data/media";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../lib/supabase.client";
import type { CaseStudy, CompanyMember, CompanyProfile } from "./types";

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
};

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
    .eq("status", "PUBLISHED");
  if (error) throw error;

  const companies = new Map((data ?? []).map((company) => [company.id, company]));
  return rows.flatMap((row, index) => {
    const company = companies.get(row.company_id);
    return company ? [toCaseStudy(row, company, index)] : [];
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
  if (!isSupabaseConfigured()) return null;
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
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("companies")
    .select("id, name, address, phone, founded_year, business_hours, website_url, description")
    .eq("id", companyId)
    .eq("status", "PUBLISHED")
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

  return {
    company: {
      ...company,
      founded: company.founded_year ? `${company.founded_year}年` : "",
      website: company.website_url ?? "",
      businessHours: company.business_hours,
      image: media.office,
      features: [],
    },
    cases: await fetchCasesByRows((caseRows ?? []) as CaseRow[]),
  };
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
    supabase.from("companies").select("id, name, address, phone, founded_year, business_hours, website_url, description").eq("id", companyId).maybeSingle(),
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
    image: media.office,
    features: [],
  };
  const memberList: CompanyMember[] = members.map((member) => ({
    id: member.user_id,
    name: names.get(member.user_id) ?? "ユーザー",
    role: member.role,
    email: "",
  }));

  return {
    company: profile,
    cases: (caseRows ?? []).map((row, index) => toCaseStudy(row as CaseRow, companyRow, index)),
    members: memberList,
  };
}
