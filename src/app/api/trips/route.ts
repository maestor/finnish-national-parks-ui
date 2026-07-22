import { proxyBackendRequest } from "@/lib/backend-proxy";

export const GET = async (request: Request) => {
  return proxyBackendRequest(request, "/api/trips");
};

export const POST = async (request: Request) => {
  return proxyBackendRequest(request, "/api/trips", { requireAdmin: true });
};
