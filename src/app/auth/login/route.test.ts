import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((url: string) => ({ redirectedTo: url })),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    redirect: redirectMock,
  },
}));

describe("auth login route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to the backend Google auth endpoint", async () => {
    const response = await GET();

    expect(redirectMock).toHaveBeenCalledWith("http://localhost:3004/auth/google");
    expect(response).toEqual({ redirectedTo: "http://localhost:3004/auth/google" });
  });
});
