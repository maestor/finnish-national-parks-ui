"use client";

import { appRoutes, normalizeAppPath } from "@/lib/routes";
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
  clearHomeParkFocusRequest: (requestId?: number) => void;
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
  const normalizedPathname = normalizeAppPath(pathname);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [homeParkFocusRequest, setHomeParkFocusRequest] = useState<HomeParkFocusRequest | null>(
    null,
  );
  const nextHomeParkFocusRequestIdRef = useRef(0);
  const lastHandledParkParamRef = useRef<string | null>(null);
  const pendingParkParamCleanupRef = useRef<string | null>(null);

  const toggleMobileFilters = () => {
    setIsMobileFiltersOpen((current) => !current);
  };

  const closeMobileFilters = () => {
    setIsMobileFiltersOpen(false);
  };

  const focusParkOnHome = useCallback((slug: string) => {
    nextHomeParkFocusRequestIdRef.current += 1;

    setHomeParkFocusRequest({
      requestId: nextHomeParkFocusRequestIdRef.current,
      slug,
    });
  }, []);

  const clearHomeParkFocusRequest = useCallback(
    (requestId?: number) => {
      if (requestId !== undefined && homeParkFocusRequest?.requestId !== requestId) {
        return;
      }

      setHomeParkFocusRequest(null);

      if (normalizedPathname !== appRoutes.parks || !pendingParkParamCleanupRef.current) {
        return;
      }

      const nextSearchParams = new URLSearchParams(searchParams.toString());
      nextSearchParams.delete("park");
      const nextSearch = nextSearchParams.toString();

      pendingParkParamCleanupRef.current = null;
      router.replace(nextSearch ? `${appRoutes.parks}?${nextSearch}` : appRoutes.parks, {
        scroll: false,
      });
    },
    [homeParkFocusRequest, normalizedPathname, router, searchParams],
  );

  useEffect(() => {
    const parkSlug = normalizedPathname === appRoutes.parks ? searchParams.get("park") : null;

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
  }, [focusParkOnHome, normalizedPathname, searchParams]);

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
