"use client";

import { createContext, useContext, useState } from "react";

interface HomeMapControlsContextValue {
  isMobileFiltersOpen: boolean;
  toggleMobileFilters: () => void;
  closeMobileFilters: () => void;
}

const HomeMapControlsContext = createContext<HomeMapControlsContextValue>({
  isMobileFiltersOpen: false,
  toggleMobileFilters: () => {},
  closeMobileFilters: () => {},
});

export const HomeMapControlsProvider = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const toggleMobileFilters = () => {
    setIsMobileFiltersOpen((current) => !current);
  };

  const closeMobileFilters = () => {
    setIsMobileFiltersOpen(false);
  };

  return (
    <HomeMapControlsContext.Provider
      value={{ isMobileFiltersOpen, toggleMobileFilters, closeMobileFilters }}
    >
      {children}
    </HomeMapControlsContext.Provider>
  );
};

export const useHomeMapControls = () => useContext(HomeMapControlsContext);
