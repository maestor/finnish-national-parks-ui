import { proxyBackendRequest } from "@/lib/backend-proxy";

export const GET = async (request: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const response = await proxyBackendRequest(
    request,
    `/api/admin/parks/${encodeURIComponent(slug)}/visit-trails`,
    {
      requireAdmin: true,
    },
  );
  response.headers.set("Cache-Control", "private, no-store");
  return response;
};
