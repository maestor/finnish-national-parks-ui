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

const getApiKey = (): string | undefined => {
  if (typeof window !== "undefined") {
    const stored = getStoredApiKey();
    if (stored) return stored;
  }
  return env.API_KEY;
};

export const apiFetch = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const url = `${env.NEXT_PUBLIC_API_URL}${path}`;
  const apiKey = getApiKey();

  const headers = new Headers(options?.headers);
  headers.set("Content-Type", "application/json");

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
    throw new ApiError(response.status, `API error ${response.status}: ${body}`);
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength === "0" || response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
};

export { ApiError };
