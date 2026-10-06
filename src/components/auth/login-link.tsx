"use client";

import { usePathname } from "next/navigation";
import { type MouseEvent, useEffect, useState } from "react";
import { normalizePostLoginRedirectPath } from "@/lib/post-login-redirect";

interface LoginLinkProps {
  ariaLabel?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  returnToCurrentPage?: boolean;
  title?: string;
}

const LOGIN_START_PATH = "/auth/login";

const getLoginHref = (returnToCurrentPage: boolean, path: string) => {
  if (!returnToCurrentPage) return LOGIN_START_PATH;
  const returnPath = normalizePostLoginRedirectPath(path);
  return returnPath
    ? `${LOGIN_START_PATH}?${new URLSearchParams({ returnTo: returnPath })}`
    : LOGIN_START_PATH;
};

export const LoginLink = ({
  ariaLabel,
  children,
  className,
  onClick,
  returnToCurrentPage = false,
  title,
}: LoginLinkProps) => {
  const pathname = usePathname();
  const [href, setHref] = useState(() => getLoginHref(returnToCurrentPage, pathname));

  useEffect(() => {
    const { search, hash } = window.location;
    setHref(getLoginHref(returnToCurrentPage, `${pathname}${search}${hash}`));
  }, [pathname, returnToCurrentPage]);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Keep native link activation (including modified/middle clicks) and capture
    // any query or fragment change since the link last rendered.
    const { pathname, search, hash } = window.location;
    event.currentTarget.setAttribute(
      "href",
      getLoginHref(returnToCurrentPage, `${pathname}${search}${hash}`),
    );
    onClick?.();
  };

  return (
    <a
      href={href}
      className={className}
      aria-label={ariaLabel}
      onClick={handleClick}
      onAuxClick={handleClick}
      title={title}
    >
      {children}
    </a>
  );
};
