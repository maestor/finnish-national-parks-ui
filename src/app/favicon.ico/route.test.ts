import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { createPwaIconResponseMock } = vi.hoisted(() => ({
  createPwaIconResponseMock: vi.fn((size: number) => ({ size })),
}));

vi.mock("@/lib/pwa-icon", () => ({
  createPwaIconResponse: createPwaIconResponseMock,
}));

describe("favicon route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serves the browser favicon path from the generated 32 pixel icon", async () => {
    const response = await GET();

    expect(createPwaIconResponseMock).toHaveBeenCalledWith(32);
    expect(response).toEqual({ size: 32 });
  });
});
