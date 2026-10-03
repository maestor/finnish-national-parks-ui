import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePublicCache } from "@/lib/public-cache";
import { PublicCacheRefreshNotice } from "./public-cache-refresh-notice";

vi.mock("@/lib/public-cache", () => ({
  revalidatePublicCache: vi.fn(),
}));

describe("PublicCacheRefreshNotice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retries each unique affected park and trip, then reports success", async () => {
    vi.mocked(revalidatePublicCache).mockResolvedValue(true);
    render(
      <PublicCacheRefreshNotice
        parkSlug="pallas"
        parkSlugs={["pallas", null, "nuuksio"]}
        tripSlugs={["kesaretki", undefined, "kesaretki", "syysretki"]}
        failureMessage="Päivitys epäonnistui"
        retryLabel="Yritä uudelleen"
        retryingLabel="Päivitetään"
        successMessage="Päivitys onnistui"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Yritä uudelleen" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Päivitys onnistui");
    });
    expect(revalidatePublicCache).toHaveBeenCalledTimes(4);
    expect(revalidatePublicCache).toHaveBeenCalledWith({
      expireImmediately: true,
      parkSlug: "pallas",
      tripSlug: "kesaretki",
    });
    expect(revalidatePublicCache).toHaveBeenCalledWith({
      expireImmediately: true,
      parkSlug: "nuuksio",
      tripSlug: "syysretki",
    });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("uses an unscoped retry when no park or trip is provided", async () => {
    vi.mocked(revalidatePublicCache).mockResolvedValue(false);
    render(
      <PublicCacheRefreshNotice
        failureMessage="Päivitys epäonnistui"
        retryLabel="Yritä uudelleen"
        retryingLabel="Päivitetään"
        successMessage="Päivitys onnistui"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Päivitys epäonnistui");
    fireEvent.click(screen.getByRole("button", { name: "Yritä uudelleen" }));

    await waitFor(() => expect(revalidatePublicCache).toHaveBeenCalledTimes(1));
    expect(revalidatePublicCache).toHaveBeenCalledWith({
      expireImmediately: true,
      parkSlug: null,
      tripSlug: null,
    });
    expect(screen.getByRole("button", { name: "Yritä uudelleen" })).toBeEnabled();
  });
});
