import { proxyBackendRequest } from "@/lib/backend-proxy";

export const GET = async (request: Request) => proxyBackendRequest(request, "/auth/dev-login");
