"use client";

import { EditVisitLink } from "@/components/visits/edit-visit-link";
import type { PersonalPark, VisitWithPark } from "@/lib/parks";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo } from "react";

interface VisitListProps {
  parks: PersonalPark[];
}

export const VisitList = ({ parks }: VisitListProps) => {
  const t = useTranslations("controlPanel.visits.list");

  const visits: VisitWithPark[] = useMemo(() => {
    const result: VisitWithPark[] = [];
    for (const park of parks) {
      for (const visit of park.visits) {
        result.push({
          ...visit,
          parkSlug: park.slug,
          parkName: park.name,
        });
      }
    }
    return result.sort((a, b) => new Date(b.visitedOn).getTime() - new Date(a.visitedOn).getTime());
  }, [parks]);

  if (visits.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">{t("noVisits")}</p>
        <Link
          href="/control-panel/visits/new"
          className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t("addFirstVisit")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="px-4 py-3 text-left font-medium">{t("parkName")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("route")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("visitDate")}</th>
            <th className="px-4 py-3 text-right font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {visits.map((visit) => (
            <tr key={visit.id}>
              <td className="px-4 py-3">
                <Link href={`/park/${visit.parkSlug}`} className="hover:underline">
                  {visit.parkName}
                </Link>
              </td>
              <td className="px-4 py-3">{visit.route ?? "–"}</td>
              <td className="px-4 py-3">{visit.visitedOn}</td>
              <td className="px-4 py-3 text-right">
                <EditVisitLink
                  visitId={visit.id}
                  className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  iconClassName="h-4 w-4"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
