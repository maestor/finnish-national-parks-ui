import { proxyBackendRequest } from "@/lib/backend-proxy";
import { TRIP_PLANNER_SEARCH_REQUEST_TIMEOUT_MS } from "@/lib/trip-planner-timeout";

export const POST = async (request: Request) =>
  proxyBackendRequest(request, "/api/trip-planner/search", {
    includeTripPlannerBudget: true,
    timeoutMs: TRIP_PLANNER_SEARCH_REQUEST_TIMEOUT_MS,
  });
