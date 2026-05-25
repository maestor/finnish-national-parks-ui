"use client";

import {
  getCurrentPathWithSearchAndHash,
  storePostLoginRedirectPath,
} from "@/lib/post-login-redirect";

interface LoginLinkProps {
  ariaLabel?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  title?: string;
}

const LOGIN_START_PATH = "/auth/login";

export const LoginLink = ({ ariaLabel, children, className, onClick, title }: LoginLinkProps) => {
  const handleClick = () => {
    const currentPath = getCurrentPathWithSearchAndHash();
    if (currentPath) {
      storePostLoginRedirectPath(currentPath);
    }

    onClick?.();
  };

  return (
    <a
      href={LOGIN_START_PATH}
      className={className}
      aria-label={ariaLabel}
      onClick={handleClick}
      title={title}
    >
      {children}
    </a>
  );
};
