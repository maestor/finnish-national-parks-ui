import { proxyBackendRequest } from "@/lib/backend-proxy";

export const POST = async (request: Request) => proxyBackendRequest(request, "/auth/logout");
