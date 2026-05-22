"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export interface HomeParkFocusRequest {
  requestId: number;
  slug: string;
}

interface HomeMapControlsContextValue {
  isMobileFiltersOpen: boolean;
  homeParkFocusRequest: HomeParkFocusRequest | null;
  toggleMobileFilters: () => void;
  closeMobileFilters: () => void;
  focusParkOnHome: (slug: string) => void;
}

const HomeMapControlsContext = createContext<HomeMapControlsContextValue>({
  isMobileFiltersOpen: false,
  homeParkFocusRequest: null,
  toggleMobileFilters: () => {},
  closeMobileFilters: () => {},
  focusParkOnHome: () => {},
});

export const HomeMapControlsProvider = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [homeParkFocusRequest, setHomeParkFocusRequest] = useState<HomeParkFocusRequest | null>(
    null,
  );
  const lastHandledParkParamRef = useRef<string | null>(null);

  const toggleMobileFilters = () => {
    setIsMobileFiltersOpen((current) => !current);
  };

  const closeMobileFilters = () => {
    setIsMobileFiltersOpen(false);
  };

  const focusParkOnHome = useCallback((slug: string) => {
    setHomeParkFocusRequest((current) => ({
      requestId: (current?.requestId ?? 0) + 1,
      slug,
    }));
  }, []);

  useEffect(() => {
    const parkSlug = pathname === "/" ? searchParams.get("park") : null;

    if (!parkSlug) {
      lastHandledParkParamRef.current = null;
      return;
    }

    if (lastHandledParkParamRef.current === parkSlug) {
      return;
    }

    lastHandledParkParamRef.current = parkSlug;
    focusParkOnHome(parkSlug);
  }, [focusParkOnHome, pathname, searchParams]);

  return (
    <HomeMapControlsContext.Provider
      value={{
        isMobileFiltersOpen,
        homeParkFocusRequest,
        toggleMobileFilters,
        closeMobileFilters,
        focusParkOnHome,
      }}
    >
      {children}
    </HomeMapControlsContext.Provider>
  );
};

export const useHomeMapControls = () => useContext(HomeMapControlsContext);
