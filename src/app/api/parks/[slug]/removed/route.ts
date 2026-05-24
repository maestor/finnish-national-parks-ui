import { proxyBackendRequest } from "@/lib/backend-proxy";

interface RouteContext {
  params: Promise<{
    slug: string;
  }>;
}

export const PATCH = async (request: Request, { params }: RouteContext) => {
  const { slug } = await params;
  return proxyBackendRequest(request, `/api/parks/${slug}/removed`);
};
