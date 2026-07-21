import { type JWTPayload, jwtVerify } from "jose";

// Session JWT claim contract with the Hono backend (see docs/DEVELOPMENT.md).
// The defaults match the backend; override only via env when both sides change.
const DEFAULT_JWT_ISSUER = "reissuvihko-api";
const DEFAULT_JWT_AUDIENCE = "reissuvihko-ui";

export const getSessionCookieName = () => process.env.AUTH_COOKIE_NAME || "__session";

export const readSessionToken = (cookieHeader: string | null): string | null => {
  if (!cookieHeader) {
    return null;
  }

  const cookieName = getSessionCookieName();
  for (const part of cookieHeader.split(";")) {
    const trimmedPart = part.trim();
    if (trimmedPart.startsWith(`${cookieName}=`)) {
      return decodeURIComponent(trimmedPart.slice(cookieName.length + 1));
    }
  }

  return null;
};

// Verifies signature, expiry, issuer, and audience. Returns the payload for
// valid sessions and null for anything else (missing secret included), so
// callers fail closed without try/catch noise.
export const verifySessionToken = async (token: string): Promise<JWTPayload | null> => {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
      issuer: process.env.AUTH_JWT_ISSUER || DEFAULT_JWT_ISSUER,
      audience: process.env.AUTH_JWT_AUDIENCE || DEFAULT_JWT_AUDIENCE,
    });
    return payload;
  } catch {
    return null;
  }
};

export const isAdminSession = (payload: JWTPayload | null): boolean => payload?.role === "admin";
