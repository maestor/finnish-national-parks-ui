import { proxyBackendRequest } from "@/lib/backend-proxy";

export const GET = async (request: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const response = await proxyBackendRequest(
    request,
    `/api/parks/${encodeURIComponent(slug)}/weather`,
    { timeoutMs: 5_000 },
  );
  response.headers.set("Cache-Control", "private, no-store");
  return response;
};
