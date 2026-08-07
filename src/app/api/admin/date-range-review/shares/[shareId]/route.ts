import { proxyBackendRequest } from "@/lib/backend-proxy";

interface DeleteAdminDateRangeReviewShareRouteProps {
  params: Promise<{
    shareId: string;
  }>;
}

export const DELETE = async (
  request: Request,
  { params }: DeleteAdminDateRangeReviewShareRouteProps,
) => {
  const { shareId } = await params;

  return proxyBackendRequest(request, `/api/admin/date-range-review/shares/${shareId}`, {
    requireAdmin: true,
  });
};
