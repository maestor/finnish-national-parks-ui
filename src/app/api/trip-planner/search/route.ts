import { proxyBackendRequest } from "@/lib/backend-proxy";
import { TRIP_PLANNER_REQUEST_TIMEOUT_MS } from "@/lib/trip-planner-timeout";

export const POST = async (request: Request) =>
  proxyBackendRequest(request, "/api/trip-planner/search", {
    timeoutMs: TRIP_PLANNER_REQUEST_TIMEOUT_MS,
  });
