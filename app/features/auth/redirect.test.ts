import { describe, expect, it } from "vitest";
import { rememberAuthRedirectTo, resolveAuthCallbackRedirectTo, safeRedirectTo } from "./redirect";

describe("safeRedirectTo", () => {
  it("アプリ内の相対パスを許可する", () => {
    expect(safeRedirectTo("/mypage/favorites")).toBe("/mypage/favorites");
  });

  it("外部URLとprotocol-relative URLを拒否する", () => {
    expect(safeRedirectTo("https://example.com")).toBe("/mypage");
    expect(safeRedirectTo("//example.com")).toBe("/mypage");
    expect(safeRedirectTo("/\\\\example.com")).toBe("/mypage");
  });

  it("値がない場合は指定したフォールバックを返す", () => {
    expect(safeRedirectTo(null, "/")).toBe("/");
  });

  it("認証前に保存した戻り先をcallbackで復元する", () => {
    rememberAuthRedirectTo("/favorites");

    expect(resolveAuthCallbackRedirectTo(null)).toBe("/favorites");
    expect(resolveAuthCallbackRedirectTo(null)).toBe("/mypage");
  });

  it("callback URLのredirectToがある場合は保存値より優先する", () => {
    rememberAuthRedirectTo("/favorites");

    expect(resolveAuthCallbackRedirectTo("/company/dashboard")).toBe("/company/dashboard");
  });

  it("認証用の保存値も外部URLを拒否する", () => {
    rememberAuthRedirectTo("https://example.com");

    expect(resolveAuthCallbackRedirectTo(null)).toBe("/mypage");
  });
});
