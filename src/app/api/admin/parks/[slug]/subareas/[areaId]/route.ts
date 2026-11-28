import { proxyBackendRequest } from "@/lib/backend-proxy";

type Context = { params: Promise<{ slug: string; areaId: string }> };

const update = async (request: Request, { params }: Context) => {
  const { slug, areaId } = await params;
  return proxyBackendRequest(
    request,
    `/api/admin/parks/${encodeURIComponent(slug)}/subareas/${encodeURIComponent(areaId)}`,
    { requireAdmin: true },
  );
};

export const PUT = update;
export const DELETE = update;
