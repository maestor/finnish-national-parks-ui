import { proxyBackendRequest } from "@/lib/backend-proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = async (request: Request, { params }: RouteContext) => {
  const { id } = await params;
  const requestUrl = new URL(request.url);
  const query = new URLSearchParams();
  for (const key of ["offset", "limit"]) {
    const value = requestUrl.searchParams.get(key);
    if (value !== null) query.set(key, value);
  }
  const sanitizedRequest = new Request(
    `${requestUrl.origin}${requestUrl.pathname}?${query.toString()}`,
    request,
  );
  return proxyBackendRequest(sanitizedRequest, `/api/admin/trips/${id}/images`, {
    requireAdmin: true,
  });
};
