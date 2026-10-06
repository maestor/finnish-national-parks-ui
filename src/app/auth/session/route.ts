import { proxyBackendRequest } from "@/lib/backend-proxy";
import { readSessionToken } from "@/lib/session-auth";

const PRIVATE_CACHE_CONTROL = "private, no-store";

export const GET = async (request: Request) => {
  if (!readSessionToken(request.headers.get("cookie"))) {
    return Response.json({ user: null }, { headers: { "Cache-Control": PRIVATE_CACHE_CONTROL } });
  }

  const response = await proxyBackendRequest(request, "/auth/me");
  response.headers.set("Cache-Control", PRIVATE_CACHE_CONTROL);

  if (response.status === 401) {
    return Response.json({ user: null }, { headers: response.headers });
  }

  if (!response.ok) {
    return response;
  }

  return Response.json({ user: await response.json() }, { headers: response.headers });
};
