"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

interface SearchParamsObserverProps {
  onChange: (query: string) => void;
}

const QueryReader = ({ onChange }: SearchParamsObserverProps) => {
  const searchParams = useSearchParams();
  useEffect(() => onChange(searchParams.toString()), [onChange, searchParams]);
  return null;
};

// Query synchronization must not suspend the surrounding public page's HTML.
export const SearchParamsObserver = (props: SearchParamsObserverProps) => (
  <Suspense fallback={null}>
    <QueryReader {...props} />
  </Suspense>
);
