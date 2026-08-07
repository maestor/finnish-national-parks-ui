import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "./api";
import {
  buildDateRangeReviewShareDescription,
  isDateRangeReviewShareId,
  readDateRangeReviewShareOrNull,
} from "./date-range-review";

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");

  return {
    ...actual,
    apiAuthFetch: vi.fn(),
    apiFetch: vi.fn(),
  };
});

describe("date-range-review helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts UUID share ids and rejects malformed values", () => {
    expect(isDateRangeReviewShareId("93d27350-b7a4-48ba-a93f-16f38d44aa03")).toBe(true);
    expect(isDateRangeReviewShareId("not-a-share-id")).toBe(false);
    expect(isDateRangeReviewShareId("kesaloma-2026")).toBe(false);
  });

  it("returns null when the share snapshot is not published", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new ApiError(404, "missing"));

    await expect(
      readDateRangeReviewShareOrNull("93d27350-b7a4-48ba-a93f-16f38d44aa03"),
    ).resolves.toBeNull();
  });

  it("rethrows unexpected share read failures", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("boom"));

    await expect(
      readDateRangeReviewShareOrNull("93d27350-b7a4-48ba-a93f-16f38d44aa03"),
    ).rejects.toThrow("boom");
  });

  it("builds a metadata description through the provided translation callback", () => {
    const description = buildDateRangeReviewShareDescription({
      imageCount: 12,
      name: "Kesaloma 2026",
      t: (key, values) =>
        `${key}:${values?.name}:${values?.visitCount}:${values?.tripCount}:${values?.imageCount}`,
      tripCount: 2,
      visitCount: 5,
    });

    expect(description).toBe("shareDescription:Kesaloma 2026:5:2:12");
  });
});
