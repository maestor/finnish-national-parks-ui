"use client";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { Park } from "@/lib/parks";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface ParkListProps {
  parks: Park[];
}

export const ParkList = ({ parks }: ParkListProps) => {
  const t = useTranslations("controlPanel.parks");
  const router = useRouter();
  const [localParks, setLocalParks] = useState(parks);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setLocalParks(parks);
  }, [parks]);

  const sortedParks = useMemo(() => {
    return [...localParks].sort((left, right) => left.name.localeCompare(right.name, "fi-FI"));
  }, [localParks]);

  const handleRemove = async (park: Park) => {
    const confirmed = window.confirm(
      t("confirmRemove", {
        parkName: park.name,
      }),
    );

    if (!confirmed) {
      return;
    }

    setPendingSlug(park.slug);
    setActionError(null);

    try {
      await apiFetch(`/api/parks/${park.slug}/removed`, {
        method: "PATCH",
        body: JSON.stringify({ removed: true }),
      });

      setLocalParks((current) => current.filter((currentPark) => currentPark.slug !== park.slug));
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setPendingSlug(null);
    }
  };

  if (sortedParks.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
        {t("warning")}
      </p>

      {actionError && (
        <p
          className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {actionError}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">{t("parkName")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("parkType")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("location")}</th>
              <th className="px-4 py-3 text-right font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedParks.map((park) => {
              const isRemoving = pendingSlug === park.slug;

              return (
                <tr key={park.slug}>
                  <td className="px-4 py-3">
                    <Link href={`/park/${park.slug}`} className="font-medium hover:underline">
                      {park.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{park.type.name}</td>
                  <td className="px-4 py-3">{park.locationLabel}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemove(park)}
                      disabled={isRemoving}
                    >
                      {isRemoving ? t("removing") : t("removeAction")}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
