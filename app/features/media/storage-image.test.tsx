import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StorageImage } from "./storage-image";

const { getSignedImageUrl, markImageTransformUnavailable } = vi.hoisted(() => ({
  getSignedImageUrl: vi.fn(async () => "https://example.test/original.jpg"),
  markImageTransformUnavailable: vi.fn(),
}));

vi.mock("./image-storage.client", () => ({ getSignedImageUrl, markImageTransformUnavailable }));

describe("StorageImage", () => {
  it("loads a card image after rendering", async () => {
    render(<StorageImage storagePath="company/cover.jpg" bucket="company-assets" preset="card" alt="企業画像" />);
    const image = screen.getByRole("img", { name: "企業画像" });
    await waitFor(() => expect(image).toHaveAttribute("src", "https://example.test/original.jpg"));
    expect(getSignedImageUrl).toHaveBeenCalledWith("company-assets", "company/cover.jpg", "card");
  });

  it("uses the original image if a transformed image cannot be displayed", async () => {
    render(<StorageImage src="https://example.test/optimized.webp" storagePath="case/photo.jpg" bucket="case-images" alt="施工写真" />);
    const image = screen.getByRole("img", { name: "施工写真" });
    fireEvent.error(image);
    await waitFor(() => expect(image).toHaveAttribute("src", "https://example.test/original.jpg"));
    expect(getSignedImageUrl).toHaveBeenCalledWith("case-images", "case/photo.jpg");
    fireEvent.load(image);
    expect(markImageTransformUnavailable).toHaveBeenCalledOnce();
  });
});
