import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("search", "routes/search.tsx"),
  route("contact", "routes/contact.tsx"),
  route("cases/:caseId", "routes/case-detail.tsx"),
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("auth/callback", "routes/auth-callback.tsx"),
  route("admin", "routes/admin-dashboard.tsx"),
  route("admin/cases/:caseId/edit", "routes/admin-case-edit.tsx"),
  route("mypage", "routes/mypage.tsx"),
  route("mypage/favorites", "routes/favorites.tsx"),
  route("company", "routes/company-dashboard.tsx"),
  route("company/apply", "routes/company-apply.tsx"),
  route("company/profile/edit", "routes/company-profile-edit.tsx"),
  route("company/cases/new", "routes/company-case-new.tsx"),
  route("company/cases/:caseId/edit", "routes/company-case-edit.tsx"),
  route("companies/:companyId", "routes/company-detail.tsx"),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
