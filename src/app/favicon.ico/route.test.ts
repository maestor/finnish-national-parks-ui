import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((url: URL | string, status?: number) => ({ redirectedTo: url, status })),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    redirect: redirectMock,
  },
}));

describe("favicon route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects the browser favicon path to the generated png icon", async () => {
    const request = new Request("https://frontend.example/favicon.ico");
    const response = await GET(request);

    expect(redirectMock).toHaveBeenCalledWith(
      new URL("/icons/favicon-32x32.png", request.url),
      308,
    );
    expect(response).toEqual({
      redirectedTo: new URL("/icons/favicon-32x32.png", request.url),
      status: 308,
    });
  });
});
