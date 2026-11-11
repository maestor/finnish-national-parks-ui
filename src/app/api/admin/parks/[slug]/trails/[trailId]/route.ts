import { proxyBackendRequest } from "@/lib/backend-proxy";

type Context = { params: Promise<{ slug: string; trailId: string }> };

const update = async (request: Request, { params }: Context) => {
  const { slug, trailId } = await params;
  return proxyBackendRequest(
    request,
    `/api/admin/parks/${encodeURIComponent(slug)}/trails/${encodeURIComponent(trailId)}`,
    { requireAdmin: true },
  );
};

export const PUT = update;
export const DELETE = update;
