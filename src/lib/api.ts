import { env } from "./env";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const getMessageFromErrorBody = (body: string): string | null => {
  const trimmedBody = body.trim();
  if (!trimmedBody) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmedBody) as unknown;

    if (typeof parsed === "string" && parsed.trim()) {
      return parsed.trim();
    }

    if (parsed && typeof parsed === "object") {
      const message =
        "message" in parsed && typeof parsed.message === "string"
          ? parsed.message
          : "error" in parsed && typeof parsed.error === "string"
            ? parsed.error
            : null;

      if (message?.trim()) {
        return message.trim();
      }
    }
  } catch {
    return trimmedBody;
  }

  return trimmedBody;
};

const getApiKey = (): string | undefined => {
  if (typeof window !== "undefined") {
    return undefined;
  }

  return env.API_KEY;
};

const isFormDataBody = (body: BodyInit | null | undefined): body is FormData => {
  return typeof FormData !== "undefined" && body instanceof FormData;
};

const getServerCookieHeader = async (): Promise<string | null> => {
  if (typeof window !== "undefined") {
    return null;
  }

  try {
    const { headers } = await import("next/headers");
    const requestHeaders = await headers();
    return requestHeaders.get("cookie");
  } catch {
    return null;
  }
};

interface ApiFetchOptions extends RequestInit {
  includeApiKey?: boolean;
  includeBrowserCredentials?: boolean;
  includeServerCookies?: boolean;
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
}

const DEFAULT_BACKEND_TIMEOUT_MS = 10_000;

const performApiFetch = async <T>(
  path: string,
  {
    includeApiKey = true,
    includeBrowserCredentials = true,
    includeServerCookies = false,
    ...options
  }: ApiFetchOptions = {},
): Promise<T> => {
  const url = typeof window === "undefined" ? `${env.NEXT_PUBLIC_API_URL}${path}` : path;
  const body = options?.body;

  const headers = new Headers(options?.headers);
  if (body && !isFormDataBody(body) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const apiKey = includeApiKey ? getApiKey() : undefined;
  if (apiKey) {
    headers.set("Authorization", `Bearer ${apiKey}`);
  }

  const cookieHeader = includeServerCookies ? await getServerCookieHeader() : null;
  if (cookieHeader && !headers.has("cookie")) {
    headers.set("cookie", cookieHeader);
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    // A hung backend must not pin server components or route handlers
    // indefinitely; a caller-provided signal still wins.
    signal: options.signal ?? AbortSignal.timeout(DEFAULT_BACKEND_TIMEOUT_MS),
  };

  if (typeof window !== "undefined" && includeBrowserCredentials) {
    fetchOptions.credentials = "include";
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const body = await response.text().catch(() => "Unknown error");
    const message = getMessageFromErrorBody(body);
    throw new ApiError(
      response.status,
      message ? `API error ${response.status}: ${message}` : `API error ${response.status}`,
    );
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength === "0" || response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
};

export const apiFetch = async <T>(path: string, options?: ApiFetchOptions): Promise<T> =>
  performApiFetch<T>(path, options);

export const apiAuthFetch = async <T>(path: string, options?: ApiFetchOptions): Promise<T> =>
  performApiFetch<T>(path, {
    ...options,
    includeServerCookies: true,
  });

export const apiPublicFetch = async <T>(path: string, options?: ApiFetchOptions): Promise<T> =>
  performApiFetch<T>(path, {
    ...options,
    includeBrowserCredentials: false,
    includeServerCookies: false,
  });

export { ApiError };
