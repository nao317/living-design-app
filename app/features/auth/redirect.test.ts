import { describe, expect, it } from "vitest";
import { safeRedirectTo } from "./redirect";

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
});
