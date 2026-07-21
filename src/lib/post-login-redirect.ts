import { appRoutePatterns, normalizeAppPath } from "./routes";

const POST_LOGIN_REDIRECT_STORAGE_KEY = "post-login-redirect-path";

// Only same-origin absolute paths may be returned to after login; anything
// else (absolute URLs, protocol-relative URLs) would become an open redirect.
const SAME_ORIGIN_PATH_PATTERN = /^\/(?!\/)/;

const isReturnablePath = (path: string): boolean => {
  if (!SAME_ORIGIN_PATH_PATTERN.test(path)) {
    return false;
  }

  const normalizedPath = normalizeAppPath(path);
  return (
    !appRoutePatterns.isLoginPath(normalizedPath) &&
    !appRoutePatterns.isControlPanelPath(normalizedPath)
  );
};

export const storePostLoginRedirectPath = (path: string): void => {
  if (typeof window === "undefined" || !isReturnablePath(path)) {
    return;
  }

  try {
    window.sessionStorage.setItem(POST_LOGIN_REDIRECT_STORAGE_KEY, normalizeAppPath(path));
  } catch {}
};

export const consumePostLoginRedirectPath = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const path = window.sessionStorage.getItem(POST_LOGIN_REDIRECT_STORAGE_KEY);
    if (path) {
      window.sessionStorage.removeItem(POST_LOGIN_REDIRECT_STORAGE_KEY);
    }
    return path && SAME_ORIGIN_PATH_PATTERN.test(path) ? normalizeAppPath(path) : null;
  } catch {
    return null;
  }
};

export const getCurrentPathWithSearchAndHash = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const { pathname, search, hash } = window.location;
  return normalizeAppPath(`${pathname}${search}${hash}`);
};
