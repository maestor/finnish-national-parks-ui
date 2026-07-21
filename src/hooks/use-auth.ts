"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  picture: string;
};

// Concurrent hook instances (header, map, visit history, admin controls) mount
// together and would each fire their own /auth/me. Share the in-flight request;
// once it settles, later mounts fetch again so session changes are picked up.
let authMeRequest: Promise<AuthUser | null> | null = null;

const fetchAuthUser = () => {
  authMeRequest ??= apiFetch<AuthUser>("/auth/me")
    .catch(() => null)
    .finally(() => {
      authMeRequest = null;
    });
  return authMeRequest;
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
    window.location.href = "/";
  }, []);

  return {
    isAuthenticated: !!user,
    isLoading,
    logout,
    user,
  };
};
