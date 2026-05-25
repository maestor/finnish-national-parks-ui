"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  clearHomeParkFocusRequest: () => void;
}

const HomeMapControlsContext = createContext<HomeMapControlsContextValue>({
  isMobileFiltersOpen: false,
  homeParkFocusRequest: null,
  toggleMobileFilters: () => {},
  closeMobileFilters: () => {},
  focusParkOnHome: () => {},
  clearHomeParkFocusRequest: () => {},
});

export const HomeMapControlsProvider = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [homeParkFocusRequest, setHomeParkFocusRequest] = useState<HomeParkFocusRequest | null>(
    null,
  );
  const lastHandledParkParamRef = useRef<string | null>(null);
  const pendingParkParamCleanupRef = useRef<string | null>(null);

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

  const clearHomeParkFocusRequest = useCallback(() => {
    setHomeParkFocusRequest(null);

    if (pathname !== "/parks" || !pendingParkParamCleanupRef.current) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete("park");
    const nextSearch = nextSearchParams.toString();

    pendingParkParamCleanupRef.current = null;
    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const parkSlug = pathname === "/parks" ? searchParams.get("park") : null;

    if (!parkSlug) {
      lastHandledParkParamRef.current = null;
      pendingParkParamCleanupRef.current = null;
      return;
    }

    if (lastHandledParkParamRef.current === parkSlug) {
      return;
    }

    lastHandledParkParamRef.current = parkSlug;
    pendingParkParamCleanupRef.current = parkSlug;
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
        clearHomeParkFocusRequest,
      }}
    >
      {children}
    </HomeMapControlsContext.Provider>
  );
};

export const useHomeMapControls = () => useContext(HomeMapControlsContext);
