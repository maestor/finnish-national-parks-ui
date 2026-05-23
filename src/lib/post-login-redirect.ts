const POST_LOGIN_REDIRECT_STORAGE_KEY = "post-login-redirect-path";

const isReturnablePath = (path: string): boolean => {
  return path !== "/login" && !path.startsWith("/control-panel");
};

export const storePostLoginRedirectPath = (path: string): void => {
  if (typeof window === "undefined" || !isReturnablePath(path)) {
    return;
  }

  try {
    window.sessionStorage.setItem(POST_LOGIN_REDIRECT_STORAGE_KEY, path);
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
    return path;
  } catch {
    return null;
  }
};

export const getCurrentPathWithSearchAndHash = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const { pathname, search, hash } = window.location;
  return `${pathname}${search}${hash}`;
};
