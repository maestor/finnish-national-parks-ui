import { useTranslations } from "next-intl";
import { appRoutes, normalizeAppPath } from "@/lib/routes";
import { type BreadcrumbItem, Breadcrumbs } from "./breadcrumbs";

interface AppBreadcrumbsProps {
  path: string;
  entityName?: string;
  className?: string;
}

export const AppBreadcrumbs = ({ path, entityName, className }: AppBreadcrumbsProps) => {
  const t = useTranslations();
  const pathname = normalizeAppPath(path).split(/[?#]/)[0];
  const home = { label: t("layout.siteTitle"), href: appRoutes.home };
  const admin = { label: t("layout.nav.controlPanel"), href: appRoutes.controlPanel.root };
  const publicSections: Record<string, string> = {
    [appRoutes.trips]: "layout.nav.trips",
    [appRoutes.visits]: "layout.nav.visits",
    [appRoutes.tripPlanner]: "layout.nav.tripPlanner",
    [appRoutes.controlPanel.root]: "layout.nav.controlPanel",
  };
  const adminSections: Record<string, string> = {
    [appRoutes.controlPanel.parks]: "layout.nav.map",
    [appRoutes.controlPanel.trips]: "layout.nav.trips",
    [appRoutes.controlPanel.visits]: "layout.nav.visits",
    [appRoutes.controlPanel.dateRangeReview]: "controlPanel.dateRangeReview.title",
    [appRoutes.controlPanel.yearReview]: "controlPanel.yearReview.title",
    [appRoutes.controlPanel.admins]: "controlPanel.adminUsers.title",
  };

  let items: BreadcrumbItem[];
  if (publicSections[pathname]) {
    items = [home, { label: t(publicSections[pathname]) }];
  } else if (adminSections[pathname]) {
    items = [admin, { label: t(adminSections[pathname]) }];
  } else if (/^\/(paikka|retki)\/[^/]+$/.test(pathname) && entityName !== undefined) {
    const isPark = pathname.startsWith("/paikka/");
    items = [
      home,
      {
        label: t(isPark ? "layout.nav.map" : "layout.nav.trips"),
        href: isPark ? appRoutes.parks : appRoutes.trips,
      },
      { label: entityName },
    ];
  } else if (/^\/hallinta\/paikat\/[^/]+\/muokkaa$/.test(pathname) && entityName !== undefined) {
    items = [
      admin,
      { label: t("layout.nav.map"), href: appRoutes.controlPanel.parks },
      { label: entityName },
      { label: t("layout.breadcrumbs.edit") },
    ];
  } else {
    const editor = /^\/hallinta\/(retket|kaynnit)\/(uusi|([^/]+)\/(muokkaa|esikatselu))$/.exec(
      pathname,
    );
    if (!editor) return null;
    const isTrip = editor[1] === "retket";
    const section = isTrip ? "trips" : "visits";
    const action =
      editor[2] === "uusi" ? (isTrip ? "newTrip" : "newVisit") : isTrip ? "editTrip" : "editVisit";
    const isPreview = editor[4] === "esikatselu";
    items = [
      admin,
      {
        label: t(isTrip ? "layout.nav.trips" : "layout.nav.visits"),
        href: isTrip ? appRoutes.controlPanel.trips : appRoutes.controlPanel.visits,
      },
      {
        label: t(`controlPanel.${section}.${action}.title`),
        ...(isPreview
          ? {
              href: isTrip
                ? appRoutes.controlPanel.editTrip(editor[3])
                : appRoutes.controlPanel.editVisit(editor[3]),
            }
          : {}),
      },
      ...(isPreview ? [{ label: t("layout.breadcrumbs.preview") }] : []),
    ];
  }

  return <Breadcrumbs items={items} label={t("layout.breadcrumbs.label")} className={className} />;
};
