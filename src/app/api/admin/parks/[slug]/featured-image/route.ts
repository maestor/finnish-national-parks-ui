import { proxyBackendRequest } from "@/lib/backend-proxy";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export const GET = async (request: Request, { params }: RouteContext) => {
  const { slug } = await params;
  return proxyBackendRequest(
    request,
    `/api/admin/parks/${encodeURIComponent(slug)}/featured-image`,
    {
      requireAdmin: true,
    },
  );
};

export const PATCH = async (request: Request, { params }: RouteContext) => {
  const { slug } = await params;
  return proxyBackendRequest(
    request,
    `/api/admin/parks/${encodeURIComponent(slug)}/featured-image`,
    {
      requireAdmin: true,
    },
  );
};
