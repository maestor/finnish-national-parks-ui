import { appRoutePatterns, normalizeAppPath } from "./routes";

const POST_LOGIN_REDIRECT_STORAGE_KEY = "post-login-redirect-path";

const isReturnablePath = (path: string): boolean => {
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
    return path ? normalizeAppPath(path) : null;
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
