import { proxyBackendRequest } from "@/lib/backend-proxy";

export const GET = async (request: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const url = new URL(request.url);
  const query = new URLSearchParams();
  for (const key of ["q", "offset", "limit"]) {
    const value = url.searchParams.get(key);
    if (value !== null) query.set(key, value);
  }
  return proxyBackendRequest(
    new Request(`${url.origin}${url.pathname}?${query}`, request),
    `/api/admin/parks/${encodeURIComponent(slug)}/trail-candidates`,
    { requireAdmin: true },
  );
};
