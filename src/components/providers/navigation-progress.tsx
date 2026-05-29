"use client";

import NextTopLoader from "nextjs-toploader";

export const NavigationProgress = () => {
  return (
    <NextTopLoader
      color="hsl(142 76% 36%)"
      height={2}
      showSpinner={false}
      shadow="0 0 10px hsl(142 76% 36%),0 0 5px hsl(142 76% 36%)"
      zIndex={1600}
    />
  );
};
