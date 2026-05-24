import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/backend-proxy", () => ({
  proxyBackendRequest: vi.fn(async () => new Response(null, { status: 204 })),
}));

import { proxyBackendRequest } from "@/lib/backend-proxy";

describe("auth google callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("proxies the callback request to the backend auth endpoint", async () => {
    const request = new Request("https://frontend.example/auth/google/callback?code=abc");

    await GET(request);

    expect(proxyBackendRequest).toHaveBeenCalledWith(request, "/auth/google/callback");
  });
});
