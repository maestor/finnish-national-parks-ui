import { proxyBackendRequest } from "@/lib/backend-proxy";

export const GET = async (request: Request) =>
  proxyBackendRequest(request, "/api/admin/admins", { requireAdmin: true });
