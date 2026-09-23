export function safeRedirectTo(
  value: FormDataEntryValue | string | null,
  fallback = "/mypage",
) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")
    ? value
    : fallback;
}
