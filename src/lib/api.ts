import { getStoredApiKey } from "./auth";
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
    const stored = getStoredApiKey();
    if (stored) return stored;
  }
  return env.API_KEY;
};

const isFormDataBody = (body: BodyInit | null | undefined): body is FormData => {
  return typeof FormData !== "undefined" && body instanceof FormData;
};

export const apiFetch = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const url = `${env.NEXT_PUBLIC_API_URL}${path}`;
  const apiKey = getApiKey();
  const body = options?.body;

  const headers = new Headers(options?.headers);
  if (body && !isFormDataBody(body) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (apiKey) {
    headers.set("Authorization", `Bearer ${apiKey}`);
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };

  if (typeof window !== "undefined") {
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

export { ApiError };
