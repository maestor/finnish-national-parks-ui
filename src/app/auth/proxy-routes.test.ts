import { beforeEach, describe, expect, it, vi } from "vitest";

const { proxyBackendRequestMock } = vi.hoisted(() => ({
  proxyBackendRequestMock: vi.fn(async () => new Response(null, { status: 204 })),
}));

vi.mock("@/lib/backend-proxy", () => ({
  proxyBackendRequest: proxyBackendRequestMock,
}));

import { GET as getCallback } from "./google/callback/route";
import { GET as getGoogle } from "./google/route";
import { POST as postLogout } from "./logout/route";
import { GET as getMe } from "./me/route";

describe("auth proxy routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("proxies google auth start", async () => {
    const request = new Request("https://frontend.example/auth/google");

    await getGoogle(request);

    expect(proxyBackendRequestMock).toHaveBeenCalledWith(request, "/auth/google");
  });

  it("proxies google auth callback", async () => {
    const request = new Request("https://frontend.example/auth/google/callback?code=abc");

    await getCallback(request);

    expect(proxyBackendRequestMock).toHaveBeenCalledWith(request, "/auth/google/callback");
  });

  it("proxies auth me", async () => {
    const request = new Request("https://frontend.example/auth/me");

    await getMe(request);

    expect(proxyBackendRequestMock).toHaveBeenCalledWith(request, "/auth/me");
  });

  it("proxies logout", async () => {
    const request = new Request("https://frontend.example/auth/logout", {
      method: "POST",
    });

    await postLogout(request);

    expect(proxyBackendRequestMock).toHaveBeenCalledWith(request, "/auth/logout");
  });
});
