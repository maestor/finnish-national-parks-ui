"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ParkMap } from "@/components/map/park-map";
import { apiFetch } from "@/lib/api";
import { type AdminMapPark, type AdminVisibilityPark, toAdminMapParks } from "@/lib/parks";
import { revalidatePublicCache } from "@/lib/public-cache";

interface AdminParkMapProps {
  parks: AdminVisibilityPark[];
  removedParks: AdminVisibilityPark[];
}

export const AdminParkMap = ({ parks, removedParks }: AdminParkMapProps) => {
  const t = useTranslations("controlPanel.parks");
  const [localParks, setLocalParks] = useState(parks);
  const [localRemovedParks, setLocalRemovedParks] = useState(removedParks);

  useEffect(() => {
    setLocalParks(parks);
  }, [parks]);

  useEffect(() => {
    setLocalRemovedParks(removedParks);
  }, [removedParks]);

  const allParks: AdminMapPark[] = useMemo(
    () => toAdminMapParks(localParks, localRemovedParks),
    [localParks, localRemovedParks],
  );

  const removedSlugs = useMemo(
    () => new Set(localRemovedParks.map((park) => park.slug)),
    [localRemovedParks],
  );

  const handleToggleRemoved = useCallback(
    (slug: string, removed: boolean) => {
      const park = removed
        ? localParks.find((p) => p.slug === slug)
        : localRemovedParks.find((p) => p.slug === slug);
      if (!park) return;

      const confirmed = window.confirm(
        t(removed ? "confirmRemove" : "confirmRestore", {
          parkName: park.name,
        }),
      );
      if (!confirmed) return;

      apiFetch(`/api/parks/${slug}/removed`, {
        method: "PATCH",
        body: JSON.stringify({ removed }),
      })
        .then(() => revalidatePublicCache({ parkSlug: slug }))
        .then(() => {
          if (removed) {
            setLocalParks((current) => current.filter((currentPark) => currentPark.slug !== slug));
            setLocalRemovedParks((current) => [...current, park]);
          } else {
            setLocalRemovedParks((current) =>
              current.filter((currentPark) => currentPark.slug !== slug),
            );
            setLocalParks((current) => [...current, park]);
          }
        });
    },
    [localParks, localRemovedParks, t],
  );

  return (
    <ParkMap
      parks={allParks}
      removedSlugs={removedSlugs}
      onToggleRemoved={handleToggleRemoved}
      toggleLabels={{
        hide: t("map.hide"),
        show: t("map.show"),
      }}
      canManageVisits
    />
  );
};
