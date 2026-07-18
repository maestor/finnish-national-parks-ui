const CONTROL_PANEL_ROOT = "/hallinta";

export const appRoutes = {
  home: "/",
  login: "/kirjaudu",
  parks: "/paikat",
  park: (slug: string) => `/paikka/${slug}`,
  visits: "/kaynnit",
  tripPlanner: "/reissusuunnittelu",
  controlPanel: {
    root: CONTROL_PANEL_ROOT,
    parks: `${CONTROL_PANEL_ROOT}/paikat`,
    parkEdit: (slug: string) => `${CONTROL_PANEL_ROOT}/paikat/${slug}/muokkaa`,
    visits: `${CONTROL_PANEL_ROOT}/kaynnit`,
    newVisit: `${CONTROL_PANEL_ROOT}/kaynnit/uusi`,
    editVisit: (visitId: string | number) => `${CONTROL_PANEL_ROOT}/kaynnit/${visitId}/muokkaa`,
  },
} as const;

export const legacyAppRedirects = [
  { source: "/login", destination: appRoutes.login, permanent: true },
  { source: "/parks", destination: appRoutes.parks, permanent: true },
  { source: "/park/:slug", destination: "/paikka/:slug", permanent: true },
  { source: "/visits", destination: appRoutes.visits, permanent: true },
  { source: "/trip-planner", destination: appRoutes.tripPlanner, permanent: true },
  { source: "/control-panel", destination: appRoutes.controlPanel.root, permanent: true },
  {
    source: "/control-panel/parks",
    destination: appRoutes.controlPanel.parks,
    permanent: true,
  },
  {
    source: "/control-panel/parks/:slug/edit",
    destination: "/hallinta/paikat/:slug/muokkaa",
    permanent: true,
  },
  {
    source: "/control-panel/visits",
    destination: appRoutes.controlPanel.visits,
    permanent: true,
  },
  {
    source: "/control-panel/visits/new",
    destination: appRoutes.controlPanel.newVisit,
    permanent: true,
  },
  {
    source: "/control-panel/visits/:id/edit",
    destination: "/hallinta/kaynnit/:id/muokkaa",
    permanent: true,
  },
] as const;

const splitPathAndSuffix = (path: string) => {
  const suffixIndex = path.search(/[?#]/);

  if (suffixIndex === -1) {
    return {
      pathname: path,
      suffix: "",
    };
  }

  return {
    pathname: path.slice(0, suffixIndex),
    suffix: path.slice(suffixIndex),
  };
};

const normalizePathname = (pathname: string) => {
  if (pathname === "/login") {
    return appRoutes.login;
  }

  if (pathname === "/parks") {
    return appRoutes.parks;
  }

  if (pathname === "/visits") {
    return appRoutes.visits;
  }

  if (pathname === "/trip-planner") {
    return appRoutes.tripPlanner;
  }

  if (pathname === "/control-panel") {
    return appRoutes.controlPanel.root;
  }

  if (pathname === "/control-panel/parks") {
    return appRoutes.controlPanel.parks;
  }

  if (pathname === "/control-panel/visits") {
    return appRoutes.controlPanel.visits;
  }

  if (pathname === "/control-panel/visits/new") {
    return appRoutes.controlPanel.newVisit;
  }

  const parkMatch = /^\/park\/([^/]+)$/.exec(pathname);
  if (parkMatch) {
    return appRoutes.park(parkMatch[1]);
  }

  const controlPanelParkEditMatch = /^\/control-panel\/parks\/([^/]+)\/edit$/.exec(pathname);
  if (controlPanelParkEditMatch) {
    return appRoutes.controlPanel.parkEdit(controlPanelParkEditMatch[1]);
  }

  const controlPanelVisitEditMatch = /^\/control-panel\/visits\/([^/]+)\/edit$/.exec(pathname);
  if (controlPanelVisitEditMatch) {
    return appRoutes.controlPanel.editVisit(controlPanelVisitEditMatch[1]);
  }

  return pathname;
};

export const normalizeAppPath = (path: string) => {
  const { pathname, suffix } = splitPathAndSuffix(path);
  return `${normalizePathname(pathname)}${suffix}`;
};

const isExactOrNestedPath = (pathname: string, route: string) =>
  pathname === route || pathname.startsWith(`${route}/`);

export const appRoutePatterns = {
  isControlPanelPath: (path: string) =>
    isExactOrNestedPath(normalizePathname(path), appRoutes.controlPanel.root),
  isLoginPath: (path: string) => normalizePathname(path) === appRoutes.login,
  isParksPath: (path: string) => normalizePathname(path) === appRoutes.parks,
  isTripPlannerPath: (path: string) => normalizePathname(path) === appRoutes.tripPlanner,
  isVisitsPath: (path: string) => normalizePathname(path) === appRoutes.visits,
} as const;

export const createPathWithSearchParams = (
  pathname: string,
  params: Record<string, string | number | boolean | null | undefined>,
) => {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
};
