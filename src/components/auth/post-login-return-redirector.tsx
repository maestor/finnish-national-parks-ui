"use client";

import { useAuth } from "@/hooks/use-auth";
import { consumePostLoginRedirectPath } from "@/lib/post-login-redirect";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export const PostLoginReturnRedirector = () => {
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (auth.isLoading || !auth.isAuthenticated || pathname !== "/control-panel") {
      return;
    }

    const returnPath = consumePostLoginRedirectPath();
    if (!returnPath || returnPath === pathname) {
      return;
    }

    router.replace(returnPath);
  }, [auth.isAuthenticated, auth.isLoading, pathname, router]);

  return null;
};
