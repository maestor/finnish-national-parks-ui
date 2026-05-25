import { ImageResponse } from "next/og";
import type { ReactElement } from "react";

export const SiteIcon = (): ReactElement => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
      }}
    >
      <svg
        aria-hidden="true"
        fill="none"
        style={{ width: "100%", height: "100%" }}
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id="site-bg"
            x1="12"
            y1="8"
            x2="52"
            y2="56"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#166534" />
            <stop offset="0.52" stopColor="#0f766e" />
            <stop offset="1" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient
            id="site-sky"
            x1="26.5"
            x2="37.5"
            y1="16.5"
            y2="33"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#dcfce7" />
            <stop offset="1" stopColor="#bbf7d0" />
          </linearGradient>
        </defs>

        <rect width="64" height="64" rx="16" fill="url(#site-bg)" />
        <circle cx="32" cy="32" r="22" fill="#ffffff" opacity="0.14" />
        <path
          d="M32 8.5c-9.162 0-16.6 7.438-16.6 16.6 0 12.062 11.075 20.712 14.85 29.1.338.75 1.087 1.237 1.9 1.237.812 0 1.562-.487 1.9-1.237C37.525 45.812 48.6 37.162 48.6 25.1 48.6 15.938 41.162 8.5 32 8.5Z"
          fill="#f8fafc"
        />
        <circle cx="32" cy="25.5" r="10.75" fill="url(#site-sky)" />
        <path
          d="M23.5 26.25c2.25-3.875 5.125-6.125 8.5-6.125s6.25 2.25 8.5 6.125l2.25 3.75h-21.5l2.25-3.75Z"
          fill="#34d399"
        />
        <path
          d="m26.375 25.625 2.25-3.5 2.25 3.5h-1.5l2 3.25h-5.5l2-3.25h-1.5Zm8.75.25 2.75-4.25 2.75 4.25h-1.75l2.25 3.625h-6.5l2.25-3.625h-1.75Z"
          fill="#15803d"
        />
        <path
          d="M22 30.75c2.125-1.25 4.25-1.875 6.5-1.875 3.125 0 4.75 1.5 7.25 1.5 2.125 0 3.75-.75 6.25-.75 2.25 0 3.875.625 5.5 1.25-1 3.375-3.25 5.75-6.5 7-1.875.75-4.125 1.125-7.25 1.125-4.875 0-8.375-2.5-11.75-8.25Z"
          fill="#38bdf8"
        />
        <path
          d="M23.75 33.25c2 0.75 3.75 1.5 6.5 1.5 2.375 0 4-.5 5.375-1 2.125-.75 3.75-1.375 6.25-1.375 1.125 0 2.25.125 3.375.375-1.75 2.75-5.125 4.75-9.875 4.75-5.25 0-8.875-1.875-11.625-4.25Z"
          fill="#eff6ff"
          opacity="0.9"
        />
      </svg>
    </div>
  );
};

export const createSiteIconResponse = (size: number): ImageResponse => {
  return new ImageResponse(<SiteIcon />, {
    width: size,
    height: size,
  });
};
