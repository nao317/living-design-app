import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StorageImage } from "./storage-image";

const { getSignedImageUrl, markImageTransformUnavailable } = vi.hoisted(() => ({
  getSignedImageUrl: vi.fn(async () => "https://example.test/original.jpg"),
  markImageTransformUnavailable: vi.fn(),
}));

vi.mock("./image-storage.client", () => ({ getSignedImageUrl, markImageTransformUnavailable }));
beforeEach(() => {
  vi.clearAllMocks();
  getSignedImageUrl.mockResolvedValue("https://example.test/original.jpg");
});

describe("StorageImage", () => {
  it("loads a card image after rendering", async () => {
    render(<StorageImage width={150} height={150} storagePath="company/cover.jpg" bucket="company-assets" preset="card" alt="企業画像" />);
    const image = screen.getByRole("img", { name: "企業画像" });
    await waitFor(() => expect(image).toHaveAttribute("src", "https://example.test/original.jpg"));
    expect(getSignedImageUrl).toHaveBeenCalledWith("company-assets", "company/cover.jpg", "card");
  });

  it("uses the original image if a transformed image cannot be displayed", async () => {
    render(<StorageImage width={300} height={150} src="https://example.test/optimized.webp" storagePath="case/photo.jpg" bucket="case-images" alt="施工写真" />);
    const image = screen.getByRole("img", { name: "施工写真" });
    fireEvent.error(image);
    await waitFor(() => expect(image).toHaveAttribute("src", "https://example.test/original.jpg"));
    expect(getSignedImageUrl).toHaveBeenCalledWith("case-images", "case/photo.jpg");
    fireEvent.load(image);
    expect(markImageTransformUnavailable).toHaveBeenCalledOnce();
  });

  it("同じパスでもバケットが変わったら古い画像を表示し続けない", async () => {
    getSignedImageUrl.mockResolvedValueOnce("https://example.test/first.jpg").mockResolvedValueOnce("https://example.test/second.jpg");
    const { rerender } = render(<StorageImage width={150} height={150} bucket="case-images" storagePath="shared/photo.jpg" alt="画像" />);
    await waitFor(() => expect(screen.getByRole("img")).toHaveAttribute("src", "https://example.test/first.jpg"));
    rerender(<StorageImage width={150} height={150} bucket="company-assets" storagePath="shared/photo.jpg" alt="画像" />);
    expect(screen.getByRole("img")).not.toHaveAttribute("src", "https://example.test/first.jpg");
    await waitFor(() => expect(screen.getByRole("img")).toHaveAttribute("src", "https://example.test/second.jpg"));
  });
});
