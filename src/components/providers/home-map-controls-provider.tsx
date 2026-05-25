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
  const router = useRouter();
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
    const parkSlug = pathname === "/parks" ? searchParams.get("park") : null;

    if (!parkSlug) {
      lastHandledParkParamRef.current = null;
      return;
    }

    if (lastHandledParkParamRef.current === parkSlug) {
      return;
    }

    lastHandledParkParamRef.current = parkSlug;
    focusParkOnHome(parkSlug);

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete("park");
    const nextSearch = nextSearchParams.toString();

    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false });
  }, [focusParkOnHome, pathname, router, searchParams]);

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
