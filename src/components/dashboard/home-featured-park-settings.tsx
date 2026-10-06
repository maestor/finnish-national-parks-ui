"use client";

import { useTranslations } from "next-intl";
import type { paths } from "@/lib/api-types";
import { HomeFeaturedSelectionSettings } from "./home-featured-selection-settings";

export type HomeFeaturedParkSelection =
  paths["/api/admin/home-featured-park"]["get"]["responses"][200]["content"]["application/json"];

export const HomeFeaturedParkSettings = ({
  initialSelection,
}: {
  initialSelection: HomeFeaturedParkSelection;
}) => {
  const t = useTranslations("controlPanel.dashboard.featuredPark");
  return (
    <HomeFeaturedSelectionSettings
      kind="park"
      initialId={initialSelection.parkSlug}
      candidates={initialSelection.candidates.map((park) => ({
        id: park.slug,
        name: park.name,
        detail: t("visitCount", { count: park.visitCount }),
        searchText: park.name,
      }))}
    />
  );
};
