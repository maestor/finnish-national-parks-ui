"use client";

import {
  getCurrentPathWithSearchAndHash,
  storePostLoginRedirectPath,
} from "@/lib/post-login-redirect";

interface LoginLinkProps {
  ariaLabel?: string;
  children: React.ReactNode;
  className?: string;
}

const LOGIN_START_PATH = "/auth/login";

export const LoginLink = ({ ariaLabel, children, className }: LoginLinkProps) => {
  const handleClick = () => {
    const currentPath = getCurrentPathWithSearchAndHash();
    if (currentPath) {
      storePostLoginRedirectPath(currentPath);
    }
  };

  return (
    <a href={LOGIN_START_PATH} className={className} aria-label={ariaLabel} onClick={handleClick}>
      {children}
    </a>
  );
};
