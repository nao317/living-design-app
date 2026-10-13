import { describe, expect, it } from "vitest";
import { MAX_CASE_IMAGES, MAX_IMAGE_BYTES, validateCaseImageCount, validateImageFile } from "./image-storage.client";

describe("image upload limits", () => {
  it("accepts a 1MB image and rejects one byte more", () => {
    const withinLimit = new File([new Uint8Array(MAX_IMAGE_BYTES)], "photo.jpg", { type: "image/jpeg" });
    const overLimit = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "photo.jpg", { type: "image/jpeg" });

    expect(validateImageFile(withinLimit, MAX_IMAGE_BYTES)).toBeNull();
    expect(validateImageFile(overLimit, MAX_IMAGE_BYTES)).toContain("1MB以内");
  });

  it("counts existing photos when new photos are added", () => {
    expect(validateCaseImageCount(MAX_CASE_IMAGES - 2, 2)).toBeNull();
    expect(validateCaseImageCount(MAX_CASE_IMAGES - 2, 3)).toContain("10枚まで");
  });
});
