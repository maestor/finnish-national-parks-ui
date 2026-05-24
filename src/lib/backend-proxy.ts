import { env } from "@/lib/env";

interface ProxyRequestOptions {
  includeApiKey?: boolean;
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

const buildProxyRequestHeaders = (request: Request, includeApiKey: boolean): Headers => {
  const headers = new Headers(request.headers);

  headers.delete("host");
  headers.delete("content-length");

  if (includeApiKey && env.API_KEY) {
    headers.set("authorization", `Bearer ${env.API_KEY}`);
  }

  return headers;
};

const buildProxyResponseHeaders = (response: Response, request: Request): Headers => {
  const headers = new Headers();
  const backendOrigin = getBackendOrigin();

  response.headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey === "content-length" || normalizedKey === "set-cookie") {
      return;
    }

    if (normalizedKey === "location" && value.startsWith(backendOrigin)) {
      const requestOrigin = new URL(request.url).origin;
      headers.set(key, `${requestOrigin}${value.slice(backendOrigin.length)}`);
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

export const proxyBackendRequest = async (
  request: Request,
  backendPath: string,
  { includeApiKey = true }: ProxyRequestOptions = {},
): Promise<Response> => {
  const backendUrl = getBackendUrl(request, backendPath);
  const body = await getRequestBody(request);
  const response = await fetch(backendUrl, {
    method: request.method,
    headers: buildProxyRequestHeaders(request, includeApiKey),
    body,
    redirect: "manual",
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: buildProxyResponseHeaders(response, request),
  });
};
