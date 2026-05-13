"use client";

import { apiFetch } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  picture: string;
};

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    apiFetch<AuthUser>("/auth/me")
      .then((data) => {
        if (mounted) setUser(data);
      })
      .catch(() => {
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
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
