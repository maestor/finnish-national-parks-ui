"use client";

import { useAuth } from "@/hooks/use-auth";
import { consumePostLoginRedirectPath } from "@/lib/post-login-redirect";
import { appRoutes, normalizeAppPath } from "@/lib/routes";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export const PostLoginReturnRedirector = () => {
  const auth = useAuth();
  const pathname = usePathname();
  const normalizedPathname = normalizeAppPath(pathname);
  const router = useRouter();

  useEffect(() => {
    if (
      auth.isLoading ||
      !auth.isAuthenticated ||
      normalizedPathname !== appRoutes.controlPanel.root
    ) {
      return;
    }

    const returnPath = consumePostLoginRedirectPath();
    if (!returnPath || returnPath === normalizedPathname) {
      return;
    }

    router.replace(returnPath);
  }, [auth.isAuthenticated, auth.isLoading, normalizedPathname, router]);

  return null;
};
