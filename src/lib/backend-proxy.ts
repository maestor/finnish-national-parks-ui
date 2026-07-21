import { env } from "@/lib/env";
import { normalizeAppPath } from "@/lib/routes";
import { isAdminSession, readSessionToken, verifySessionToken } from "@/lib/session-auth";

interface ProxyRequestOptions {
  includeApiKey?: boolean;
  requireAdmin?: boolean;
}

const getBackendOrigin = (): string => new URL(env.NEXT_PUBLIC_API_URL).origin;

const getBackendUrl = (request: Request, backendPath: string): URL => {
  const requestUrl = new URL(request.url);
  return new URL(`${backendPath}${requestUrl.search}`, env.NEXT_PUBLIC_API_URL);
};

const getRequestBody = async (request: Request): Promise<ArrayBuffer | undefined> => {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  return request.arrayBuffer();
};

// Forward only what the backend needs. In particular, a client-supplied
// authorization header is never forwarded — the server-side API key is the
// only credential this proxy attaches.
const FORWARDED_HEADER_NAMES = ["accept", "content-type", "cookie"];

const buildProxyRequestHeaders = (request: Request, includeApiKey: boolean): Headers => {
  const headers = new Headers();

  for (const name of FORWARDED_HEADER_NAMES) {
    const value = request.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }

  if (includeApiKey && env.API_KEY) {
    headers.set("authorization", `Bearer ${env.API_KEY}`);
  }

  return headers;
};

// CSRF defense-in-depth on top of the session cookie's SameSite=Lax: state-
// changing requests must originate from this app. Server-side and same-origin
// browser fetches either omit Origin or match the request host.
const hasMismatchedOrigin = (request: Request): boolean => {
  if (request.method === "GET" || request.method === "HEAD") {
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return false;
  }

  try {
    return new URL(origin).host !== new URL(request.url).host;
  } catch {
    return true;
  }
};

const jsonError = (status: number, error: string) =>
  Response.json({ ok: false, error }, { status });

const buildProxyResponseHeaders = (response: Response, request: Request): Headers => {
  const headers = new Headers();
  const backendOrigin = getBackendOrigin();

  response.headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey === "content-length" ||
      normalizedKey === "content-encoding" ||
      normalizedKey === "transfer-encoding" ||
      normalizedKey === "set-cookie"
    ) {
      return;
    }

    if (normalizedKey === "location" && value.startsWith(backendOrigin)) {
      const requestOrigin = new URL(request.url).origin;
      headers.set(key, `${requestOrigin}${normalizeAppPath(value.slice(backendOrigin.length))}`);
      return;
    }

    if (normalizedKey === "location" && value.startsWith("/")) {
      const requestOrigin = new URL(request.url).origin;
      headers.set(key, `${requestOrigin}${normalizeAppPath(value)}`);
      return;
    }

    headers.set(key, value);
  });

  const setCookies = response.headers.getSetCookie?.() ?? [];
  if (setCookies.length > 0) {
    for (const cookie of setCookies) {
      headers.append("set-cookie", cookie);
    }
  } else {
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      headers.append("set-cookie", setCookie);
    }
  }

  return headers;
};

const BACKEND_TIMEOUT_MS = 10_000;

const isTimeoutError = (error: unknown) =>
  error instanceof DOMException && error.name === "TimeoutError";

export const proxyBackendRequest = async (
  request: Request,
  backendPath: string,
  { includeApiKey = true, requireAdmin = false }: ProxyRequestOptions = {},
): Promise<Response> => {
  if (hasMismatchedOrigin(request)) {
    return jsonError(403, "Forbidden");
  }

  if (requireAdmin) {
    const token = readSessionToken(request.headers.get("cookie"));
    const payload = token ? await verifySessionToken(token) : null;

    if (!payload) {
      return jsonError(401, "Unauthorized");
    }

    if (!isAdminSession(payload)) {
      return jsonError(403, "Forbidden");
    }
  }

  const backendUrl = getBackendUrl(request, backendPath);
  const body = await getRequestBody(request);

  let response: Response;
  try {
    response = await fetch(backendUrl, {
      method: request.method,
      headers: buildProxyRequestHeaders(request, includeApiKey),
      body,
      redirect: "manual",
      // A hung backend must not pin the route handler indefinitely.
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      return new Response(null, { status: 504 });
    }
    throw error;
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: buildProxyResponseHeaders(response, request),
  });
};
