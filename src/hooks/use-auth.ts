"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { paths } from "@/lib/api-types";

export type AuthUser = paths["/auth/me"]["get"]["responses"][200]["content"]["application/json"];

export type AuthSessionResponse = { user: AuthUser | null };

const AUTH_CACHE_TTL_MS = 30_000;

// Concurrent hook instances (header, map, visit history, admin controls) mount
// together and share the in-flight request. Keep the settled result briefly too,
// so client-side navigation does not refetch the same session for every page.
let authSessionRequest: Promise<AuthUser | null> | null = null;
let authSessionCache: { expiresAt: number; user: AuthUser | null } | null = null;

const fetchAuthUser = () => {
  if (authSessionCache && authSessionCache.expiresAt > Date.now()) {
    return Promise.resolve(authSessionCache.user);
  }

  authSessionRequest ??= apiFetch<AuthSessionResponse>("/auth/session")
    .then(({ user }) => {
      authSessionCache = { expiresAt: Date.now() + AUTH_CACHE_TTL_MS, user };
      return user;
    })
    .catch(() => {
      authSessionCache = { expiresAt: Date.now() + AUTH_CACHE_TTL_MS, user: null };
      return null;
    })
    .finally(() => {
      authSessionRequest = null;
    });
  return authSessionRequest;
};

export const clearAuthCache = () => {
  authSessionCache = null;
};

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    fetchAuthUser().then((data) => {
      if (!mounted) return;
      setUser(data);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const logout = useCallback(async () => {
    await apiFetch("/auth/logout", { method: "POST" });
    clearAuthCache();
    window.location.href = "/";
  }, []);

  return {
    isAuthenticated: !!user,
    isLoading,
    logout,
    user,
  };
};
