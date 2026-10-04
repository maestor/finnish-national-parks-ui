import { proxyBackendRequest } from "@/lib/backend-proxy";

export const GET = async (request: Request) =>
  proxyBackendRequest(request, "/api/admin/home-featured-visit", { requireAdmin: true });

export const PATCH = async (request: Request) =>
  proxyBackendRequest(request, "/api/admin/home-featured-visit", { requireAdmin: true });
