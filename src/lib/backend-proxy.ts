import { env } from "@/lib/env";
import { normalizeAppPath } from "@/lib/routes";
import { isAdminSession, readSessionToken, verifySessionToken } from "@/lib/session-auth";

interface ProxyRequestOptions {
  includeApiKey?: boolean;
  includeTripPlannerBudget?: boolean;
  requireAdmin?: boolean;
  timeoutMs?: number;
}

const getBackendOrigin = (): string => new URL(env.NEXT_PUBLIC_API_URL).origin;

const getBackendUrl = (request: Request, backendPath: string): URL => {
  const requestUrl = new URL(request.url);
  return new URL(`${backendPath}${requestUrl.search}`, env.NEXT_PUBLIC_API_URL);
};

export const MAX_TRIP_PLANNER_REQUEST_BODY_BYTES = 16 * 1024;
const TRIP_PLANNER_CLIENT_COOKIE_NAME = "__planner_client";
const TRIP_PLANNER_CLIENT_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

class RequestBodyTooLargeError extends Error {}

const getCookieValue = (cookieHeader: string | null, cookieName: string): string | null => {
  for (const part of cookieHeader?.split(";") ?? []) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex < 0) continue;

    const name = part.slice(0, separatorIndex).trim();
    if (name !== cookieName) continue;

    return part.slice(separatorIndex + 1).trim() || null;
  }

  return null;
};

const createTripPlannerClientId = () => globalThis.crypto.randomUUID();

const getTripPlannerClient = (request: Request) => {
  const cookieValue = getCookieValue(
    request.headers.get("cookie"),
    TRIP_PLANNER_CLIENT_COOKIE_NAME,
  );

  if (cookieValue && TRIP_PLANNER_CLIENT_ID_PATTERN.test(cookieValue)) {
    return { id: cookieValue, setCookie: false };
  }

  return { id: createTripPlannerClientId(), setCookie: true };
};

const getRequestBody = async (
  request: Request,
  maxBytes?: number,
): Promise<ArrayBuffer | undefined> => {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (maxBytes !== undefined && Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RequestBodyTooLargeError();
  }

  if (!request.body) {
    return new ArrayBuffer(0);
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalBytes += value.byteLength;
    if (maxBytes !== undefined && totalBytes > maxBytes) {
      await reader.cancel();
      throw new RequestBodyTooLargeError();
    }

    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return body.buffer;
};

// Forward only what the backend needs. In particular, a client-supplied
// authorization header is never forwarded — the server-side API key is the
// only credential this proxy attaches.
const FORWARDED_HEADER_NAMES = ["accept", "content-type", "cookie"];

const buildProxyRequestHeaders = (
  request: Request,
  includeApiKey: boolean,
  tripPlannerClientId?: string,
): Headers => {
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

  if (tripPlannerClientId) {
    headers.set("x-trip-planner-client-id", tripPlannerClientId);
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

const buildProxyResponseHeaders = (
  response: Response,
  request: Request,
  tripPlannerClientId?: string,
): Headers => {
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

  if (tripPlannerClientId) {
    const secureAttribute = process.env.NODE_ENV === "production" ? "; Secure" : "";
    headers.append(
      "set-cookie",
      `${TRIP_PLANNER_CLIENT_COOKIE_NAME}=${tripPlannerClientId}; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax${secureAttribute}`,
    );
  }

  return headers;
};

const BACKEND_TIMEOUT_MS = 10_000;

const isTimeoutError = (error: unknown) =>
  error instanceof DOMException && error.name === "TimeoutError";

export const proxyBackendRequest = async (
  request: Request,
  backendPath: string,
  {
    includeApiKey = true,
    includeTripPlannerBudget = false,
    requireAdmin = false,
    timeoutMs = BACKEND_TIMEOUT_MS,
  }: ProxyRequestOptions = {},
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
  const tripPlannerClient = includeTripPlannerBudget ? getTripPlannerClient(request) : null;

  let body: ArrayBuffer | undefined;
  try {
    body = await getRequestBody(
      request,
      includeTripPlannerBudget ? MAX_TRIP_PLANNER_REQUEST_BODY_BYTES : undefined,
    );
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return jsonError(413, "Request body too large");
    }
    throw error;
  }

  let response: Response;
  try {
    response = await fetch(backendUrl, {
      method: request.method,
      headers: buildProxyRequestHeaders(request, includeApiKey, tripPlannerClient?.id),
      body,
      redirect: "manual",
      // A hung backend must not pin the route handler indefinitely.
      signal: AbortSignal.timeout(timeoutMs),
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
    headers: buildProxyResponseHeaders(
      response,
      request,
      tripPlannerClient?.setCookie === true ? tripPlannerClient.id : undefined,
    ),
  });
};
