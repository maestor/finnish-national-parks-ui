"use client";

import { env } from "@/lib/env";
import {
  getCurrentPathWithSearchAndHash,
  storePostLoginRedirectPath,
} from "@/lib/post-login-redirect";

interface LoginLinkProps {
  ariaLabel?: string;
  children: React.ReactNode;
  className?: string;
}

export const LoginLink = ({ ariaLabel, children, className }: LoginLinkProps) => {
  const handleClick = () => {
    const currentPath = getCurrentPathWithSearchAndHash();
    if (currentPath) {
      storePostLoginRedirectPath(currentPath);
    }
  };

  return (
    <a
      href={`${env.NEXT_PUBLIC_API_URL}/auth/google`}
      className={className}
      aria-label={ariaLabel}
      onClick={handleClick}
    >
      {children}
    </a>
  );
};
