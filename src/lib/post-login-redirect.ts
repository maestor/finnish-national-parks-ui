import { appRoutePatterns, normalizeAppPath } from "./routes";

// Return destinations are public same-origin paths, never login/auth endpoints
// or control-panel pages. URL parsing also resolves dot segments before checks.
export const normalizePostLoginRedirectPath = (path: string | null): string | null => {
  if (!path || path.length > 2048 || !/^\/(?!\/)/.test(path) || /[\\\p{Cc}]/u.test(path)) {
    return null;
  }

  const url = new URL(path, "https://return.invalid");
  const pathname = normalizeAppPath(url.pathname);
  if (
    pathname.startsWith("//") ||
    appRoutePatterns.isLoginPath(pathname) ||
    appRoutePatterns.isControlPanelPath(pathname) ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/")
  ) {
    return null;
  }

  return `${pathname}${url.search}${url.hash}`;
};
