import { ImageResponse } from "next/og";
import type { ReactElement } from "react";

export const PwaIcon = (): ReactElement => {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="96" y1="64" x2="416" y2="448" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#166534" />
          <stop offset="0.52" stopColor="#0f766e" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="sky" x1="212" x2="300" y1="132" y2="264" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#dcfce7" />
          <stop offset="1" stopColor="#bbf7d0" />
        </linearGradient>
      </defs>
      <rect fill="url(#bg)" height="512" rx="128" width="512" />
      <circle cx="256" cy="256" fill="#ffffff" opacity="0.14" r="176" />
      <path
        d="M256 68c-73.3 0-132.8 59.5-132.8 132.8 0 96.5 88.6 165.7 118.8 232.8 2.7 6 8.7 9.9 15.2 9.9s12.5-3.9 15.2-9.9C300.2 366.5 388.8 297.3 388.8 200.8 388.8 127.5 329.3 68 256 68Z"
        fill="#f8fafc"
      />
      <circle cx="256" cy="204" fill="url(#sky)" r="86" />
      <path d="M188 210c18-31 41-49 68-49s50 18 68 49l18 30H170l18-30Z" fill="#34d399" />
      <path
        d="m211 205 18-28 18 28h-12l16 26h-44l16-26h-12Zm70 2 22-34 22 34h-14l18 29h-52l18-29h-14Z"
        fill="#15803d"
      />
      <path
        d="M176 246c17-10 34-15 52-15 25 0 38 12 58 12 17 0 30-6 50-6 18 0 31 5 44 10-8 27-26 46-52 56-15 6-33 9-58 9-39 0-67-20-94-66Z"
        fill="#38bdf8"
      />
      <path
        d="M190 266c16 6 30 12 52 12 19 0 32-4 43-8 17-6 30-11 50-11 9 0 18 1 27 3-14 22-41 38-79 38-42 0-71-15-93-34Z"
        fill="#eff6ff"
        opacity="0.9"
      />
    </svg>
  );
};

export const createPwaIconResponse = (size: number): ImageResponse => {
  return new ImageResponse(<PwaIcon />, {
    width: size,
    height: size,
  });
};
