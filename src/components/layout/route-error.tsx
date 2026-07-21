"use client";

import { useTranslations } from "next-intl";

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const RouteError = ({ reset }: RouteErrorProps) => {
  const t = useTranslations("errors.generic");

  return (
    <div
      role="alert"
      className="container mx-auto flex flex-1 flex-col items-center justify-center py-16 text-center"
    >
      <h1 className="text-4xl font-bold tracking-tight">{t("routeErrorTitle")}</h1>
      <p className="mt-4 text-lg text-muted-foreground">{t("routeErrorDescription")}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t("routeErrorRetry")}
      </button>
    </div>
  );
};

export { RouteError };
