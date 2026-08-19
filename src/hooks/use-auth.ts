"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  picture: string;
};

const AUTH_CACHE_TTL_MS = 30_000;

// Concurrent hook instances (header, map, visit history, admin controls) mount
// together and share the in-flight request. Keep the settled result briefly too,
// so client-side navigation does not refetch the same session for every page.
let authMeRequest: Promise<AuthUser | null> | null = null;
let authMeCache: { expiresAt: number; user: AuthUser | null } | null = null;

const fetchAuthUser = () => {
  if (authMeCache && authMeCache.expiresAt > Date.now()) {
    return Promise.resolve(authMeCache.user);
  }

  authMeRequest ??= apiFetch<AuthUser>("/auth/me")
    .then((user) => {
      authMeCache = { expiresAt: Date.now() + AUTH_CACHE_TTL_MS, user };
      return user;
    })
    .catch(() => {
      authMeCache = { expiresAt: Date.now() + AUTH_CACHE_TTL_MS, user: null };
      return null;
    })
    .finally(() => {
      authMeRequest = null;
    });
  return authMeRequest;
};

export const clearAuthCache = () => {
  authMeCache = null;
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
