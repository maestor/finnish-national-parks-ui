import { proxyBackendRequest } from "@/lib/backend-proxy";
import { normalizePostLoginRedirectPath } from "@/lib/post-login-redirect";

export const GET = async (request: Request) => {
  const backendRequestUrl = new URL(request.url);
  const returnPath = normalizePostLoginRedirectPath(backendRequestUrl.searchParams.get("returnTo"));
  if (returnPath) {
    backendRequestUrl.searchParams.set("returnTo", returnPath);
  } else {
    backendRequestUrl.searchParams.delete("returnTo");
  }
  return proxyBackendRequest(new Request(backendRequestUrl, request), "/auth/google");
};
