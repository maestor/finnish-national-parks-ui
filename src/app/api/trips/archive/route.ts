import { proxyBackendRequest } from "@/lib/backend-proxy";

export const GET = async (request: Request) => {
  return proxyBackendRequest(request, "/api/trips/archive");
};
