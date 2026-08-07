import { proxyBackendRequest } from "@/lib/backend-proxy";

export const POST = async (request: Request) =>
  proxyBackendRequest(request, "/api/date-range-review/publish", {
    requireAdmin: true,
  });

export const DELETE = async (request: Request) =>
  proxyBackendRequest(request, "/api/date-range-review/publish", {
    requireAdmin: true,
  });
