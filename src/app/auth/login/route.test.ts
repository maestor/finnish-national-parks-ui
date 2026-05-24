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

  it("redirects to the local Google auth proxy route", async () => {
    const request = new Request("https://frontend.example/auth/login");
    const response = await GET(request);

    expect(redirectMock).toHaveBeenCalledWith(new URL("/auth/google", request.url));
    expect(response).toEqual({ redirectedTo: new URL("/auth/google", request.url) });
  });
});
