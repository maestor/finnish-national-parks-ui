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

const getApiKey = (): string => {
  if (typeof window !== "undefined") {
    const stored = getStoredApiKey();
    if (stored) return stored;
  }
  return env.API_KEY;
};

export const apiFetch = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const url = `${env.NEXT_PUBLIC_API_URL}${path}`;
  const apiKey = getApiKey();

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "Unknown error");
    throw new ApiError(response.status, `API error ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
};

export { ApiError };
