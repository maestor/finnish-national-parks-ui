"use client";

import { useTranslations } from "next-intl";
import { ParkExplorer } from "@/components/map/park-explorer";

const MapError = () => {
  const t = useTranslations("errors.generic");
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ParkExplorer parks={[]} error={t("unknownError")} />
    </div>
  );
};

export default MapError;
