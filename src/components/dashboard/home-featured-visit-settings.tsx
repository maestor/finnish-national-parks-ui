"use client";

import type { paths } from "@/lib/api-types";
import { formatFinnishDate } from "@/lib/fi-date";
import { HomeFeaturedSelectionSettings } from "./home-featured-selection-settings";

export type HomeFeaturedVisitSelection =
  paths["/api/admin/home-featured-visit"]["get"]["responses"][200]["content"]["application/json"];

export const HomeFeaturedVisitSettings = ({
  initialSelection,
}: {
  initialSelection: HomeFeaturedVisitSelection;
}) => (
  <HomeFeaturedSelectionSettings
    kind="visit"
    initialId={initialSelection.visitId}
    candidates={initialSelection.candidates.map((visit) => ({
      id: visit.id,
      name: visit.park.name,
      detail: formatFinnishDate(visit.visitedOn),
      searchText: `${visit.park.name} ${visit.visitedOn} ${formatFinnishDate(visit.visitedOn)}`,
    }))}
  />
);
