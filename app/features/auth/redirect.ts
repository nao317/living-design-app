export function safeRedirectTo(
  value: FormDataEntryValue | string | null,
  fallback = "/mypage",
) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")
    ? value
    : fallback;
}

const authRedirectStorageKey = "lvd.auth.redirectTo";

export function rememberAuthRedirectTo(value: FormDataEntryValue | string | null) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(authRedirectStorageKey, safeRedirectTo(value));
  } catch {
    // Storage can be unavailable in private mode or locked-down browsers.
  }
}

export function resolveAuthCallbackRedirectTo(value: FormDataEntryValue | string | null) {
  if (typeof value === "string" && value) return safeRedirectTo(value);
  if (typeof window === "undefined") return safeRedirectTo(null);

  try {
    const storedValue = window.sessionStorage.getItem(authRedirectStorageKey);
    window.sessionStorage.removeItem(authRedirectStorageKey);
    return safeRedirectTo(storedValue);
  } catch {
    return safeRedirectTo(null);
  }
}
