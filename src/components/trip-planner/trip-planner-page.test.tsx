import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/lib/api";
import type {
  TripPlannerNearbyResponse,
  TripPlannerSearchResponse,
  TripPlannerSuggestionsResponse,
} from "@/lib/trip-planner";
import { TripPlannerPage } from "./trip-planner-page";

vi.mock("./trip-planner-map", () => ({
  TripPlannerMap: ({
    destination,
    mode,
    parks,
    visibleDistanceKm,
  }: {
    destination?: { label: string } | null;
    mode: "nearby" | "route";
    parks: Array<{ slug: string }>;
    visibleDistanceKm?: number;
  }) => (
    <div
      data-testid="trip-planner-map"
      data-destination={destination?.label ?? ""}
      data-mode={mode}
      data-visible-distance-km={visibleDistanceKm ?? ""}
    >
      map:{parks.map((park) => park.slug).join(",")}
    </div>
  ),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");

  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

const setTripPlannerResultsViewport = (isMobileResultsLayout: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(max-width: 767px)" ? isMobileResultsLayout : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe("TripPlannerPage", () => {
  type SearchResponse = TripPlannerSearchResponse;
  type NearbyResponse = TripPlannerNearbyResponse;
  type SuggestionResponse = TripPlannerSuggestionsResponse;

  const createSearchResponse = (): SearchResponse => ({
    defaultDistanceKm: 25,
    destination: {
      coordinate: { lat: 61.5, lon: 23.7 },
      label: "Tampere",
    },
    maxDistanceKm: 60,
    origin: {
      coordinate: { lat: 60.17, lon: 24.94 },
      label: "Helsinki",
    },
    parks: [
      {
        address: "Nuuksiontie 83, 02820 Espoo",
        boundingBox: { minLat: 60.26, minLon: 24.48, maxLat: 60.35, maxLon: 24.58 },
        category: { name: "Kansallispuistot", slug: "national-park" as const },
        distanceFromRouteKm: 4.2,
        locationLabel: "Nuuksiontie 83",
        markerPoint: { lat: 60.31, lon: 24.53 },
        name: "Nuuksion kansallispuisto",
        postalCode: "02820",
        postalOffice: "Espoo",
        slug: "nuuksio",
        type: { code: 111, id: 1, name: "Kansallispuisto", slug: "national-park" as const },
        visitedSummary: { lastVisitedOn: null, visitCount: 0, visited: false },
      },
      {
        address: "Hossantie 278A, 89920 Suomussalmi",
        boundingBox: { minLat: 65.15, minLon: 29.05, maxLat: 65.25, maxLon: 29.15 },
        category: { name: "Polut ja reitit", slug: "trails-and-routes" as const },
        distanceFromRouteKm: 22.3,
        locationLabel: "Hossantie 278A",
        markerPoint: { lat: 65.2, lon: 29.1 },
        name: "Hossan polku",
        postalCode: "89920",
        postalOffice: "Suomussalmi",
        slug: "hossan-polku",
        type: { code: 220, id: 8, name: "Retkeilyreitti", slug: "hiking-trail" as const },
        visitedSummary: { lastVisitedOn: null, visitCount: 0, visited: false },
      },
      {
        address: "Seurasaari, 00250 Helsinki",
        boundingBox: { minLat: 60.15, minLon: 24.84, maxLat: 60.21, maxLon: 24.92 },
        category: { name: "Historia-alueet", slug: "cultural-history-area" as const },
        distanceFromRouteKm: 8.1,
        locationLabel: "Seurasaari",
        markerPoint: { lat: 60.18, lon: 24.88 },
        name: "Seurasaari",
        postalCode: "00250",
        postalOffice: "Helsinki",
        slug: "seurasaari",
        type: {
          code: 330,
          id: 12,
          name: "Historiakohde",
          slug: "cultural-history-area" as const,
        },
        visitedSummary: { lastVisitedOn: "2025-07-10", visitCount: 3, visited: true },
      },
    ],
    route: {
      boundingBox: {
        minLat: 60.17,
        minLon: 23.7,
        maxLat: 61.5,
        maxLon: 24.94,
      },
      distanceMeters: 180_000,
      durationSeconds: 9_000,
      geometry: {
        coordinates: [
          [24.94, 60.17],
          [24.3, 60.55],
          [23.7, 61.5],
        ],
        type: "LineString" as const,
      },
      mode: "drive" as const,
    },
  });

  const createLargeSearchResponse = (): SearchResponse => ({
    ...createSearchResponse(),
    parks: [
      ...createSearchResponse().parks,
      ...Array.from({ length: 19 }, (_, index) => ({
        address: `Lisatie ${index + 1}, 0010${index} Helsinki`,
        boundingBox: {
          minLat: 60.18 + index * 0.01,
          minLon: 24.78 + index * 0.01,
          maxLat: 60.22 + index * 0.01,
          maxLon: 24.82 + index * 0.01,
        },
        category: {
          name: index % 2 === 0 ? "Kansallispuistot" : "Historia-alueet",
          slug: index % 2 === 0 ? ("national-park" as const) : ("cultural-history-area" as const),
        },
        distanceFromRouteKm: 5 + (index % 10),
        locationLabel: `Lisatie ${index + 1}`,
        markerPoint: { lat: 60.2 + index * 0.01, lon: 24.8 + index * 0.01 },
        name: `Lisäpaikka ${index + 1}`,
        postalCode: `0010${index}`,
        postalOffice: "Helsinki",
        slug: `lisapaikka-${index + 1}`,
        type:
          index % 2 === 0
            ? {
                code: 111,
                id: 100 + index,
                name: "Kansallispuisto",
                slug: "national-park" as const,
              }
            : {
                code: 330,
                id: 100 + index,
                name: "Historiakohde",
                slug: "cultural-history-area" as const,
              },
        visitedSummary: {
          lastVisitedOn: index % 3 === 0 ? "2025-01-01" : null,
          visitCount: index % 3 === 0 ? 1 : 0,
          visited: index % 3 === 0,
        },
      })),
    ],
  });

  const createNearbyResponse = (): NearbyResponse => {
    const routeResponse = createSearchResponse();

    return {
      defaultDistanceKm: 25,
      maxDistanceKm: 40,
      origin: routeResponse.origin,
      parks: routeResponse.parks.map(({ distanceFromRouteKm, ...park }) => ({
        ...park,
        distanceFromOriginKm: distanceFromRouteKm,
      })),
      searchArea: {
        boundingBox: {
          minLat: 59.95,
          minLon: 24.69,
          maxLat: 60.39,
          maxLon: 25.19,
        },
        center: routeResponse.origin.coordinate,
        maxDistanceKm: 25,
      },
    };
  };

  const createLargeNearbyResponse = (): NearbyResponse => {
    const routeResponse = createLargeSearchResponse();

    return {
      defaultDistanceKm: 18,
      maxDistanceKm: 40,
      origin: routeResponse.origin,
      parks: routeResponse.parks.map(({ distanceFromRouteKm, ...park }) => ({
        ...park,
        distanceFromOriginKm: distanceFromRouteKm,
      })),
      searchArea: {
        boundingBox: {
          minLat: 59.95,
          minLon: 24.69,
          maxLat: 60.39,
          maxLon: 25.19,
        },
        center: routeResponse.origin.coordinate,
        maxDistanceKm: 25,
      },
    };
  };

  const createSuggestionResponse = (query: string): SuggestionResponse => ({
    suggestions: Array.from({ length: 3 }, (_, index) => ({
      coordinate: {
        lat: 60.17 + index * 0.01,
        lon: 24.94 + index * 0.01,
      },
      label: `${query} suggestion ${index + 1}`,
    })),
  });

  const createAbortError = () => {
    const error = new Error("The operation was aborted.");
    error.name = "AbortError";
    return error;
  };

  const createDeferred = <T,>() => {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;

    const promise = new Promise<T>((nextResolve, nextReject) => {
      resolve = nextResolve;
      reject = nextReject;
    });

    return { promise, reject, resolve };
  };

  const currentLocationCoordinateQuery = "60.192059,24.945831";
  const currentLocationSuggestion = {
    coordinate: {
      lat: 60.192033,
      lon: 24.9455609,
    },
    label: "Aleksis Kiven katu 52-54, 00510 Helsinki, Suomi",
  } satisfies SuggestionResponse["suggestions"][number];

  const mockCurrentLocation = (
    implementation: (
      onSuccess: PositionCallback,
      onError?: PositionErrorCallback | null,
      options?: PositionOptions,
    ) => void,
  ) => {
    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn(implementation),
      },
    });

    return vi.mocked(window.navigator.geolocation.getCurrentPosition);
  };

  const getApiCallsForPath = (path: string) =>
    vi.mocked(apiFetch).mock.calls.filter(([calledPath]) => calledPath === path);

  const getSearchRequestBodies = () =>
    getApiCallsForPath("/api/trip-planner/search").map(([, options]) =>
      JSON.parse(String(options?.body ?? "{}")),
    );

  const getNearbyRequestBodies = () =>
    getApiCallsForPath("/api/trip-planner/nearby").map(([, options]) =>
      JSON.parse(String(options?.body ?? "{}")),
    );

  const mockTripPlannerApi = ({
    nearbyResponses = [createNearbyResponse()],
    searchResponses = [createSearchResponse()],
    suggestionHandler = async (query: string) => createSuggestionResponse(query),
  }: {
    nearbyResponses?: Array<NearbyResponse | Error>;
    searchResponses?: Array<SearchResponse | Error>;
    suggestionHandler?: (query: string, signal?: AbortSignal) => Promise<SuggestionResponse>;
  } = {}) => {
    const queuedNearbyResponses = [...nearbyResponses];
    const queuedSearchResponses = [...searchResponses];

    vi.mocked(apiFetch).mockImplementation(async (path, options) => {
      if (path === "/api/trip-planner/suggestions") {
        const body = JSON.parse(String(options?.body ?? "{}")) as { query: string };
        return suggestionHandler(body.query, options?.signal as AbortSignal | undefined) as never;
      }

      if (path === "/api/trip-planner/nearby") {
        const nextResponse = queuedNearbyResponses.shift();

        if (nextResponse instanceof Error) {
          throw nextResponse;
        }

        if (!nextResponse) {
          throw new Error("No trip planner nearby response queued");
        }

        return nextResponse as never;
      }

      if (path === "/api/trip-planner/search") {
        const nextResponse = queuedSearchResponses.shift();

        if (nextResponse instanceof Error) {
          throw nextResponse;
        }

        if (!nextResponse) {
          throw new Error("No trip planner search response queued");
        }

        return nextResponse as never;
      }

      throw new Error(`Unexpected apiFetch path: ${path}`);
    });
  };

  beforeEach(() => {
    vi.resetAllMocks();
    setTripPlannerResultsViewport(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("renders backend suggestions after a debounce and applies a clicked suggestion", async () => {
    vi.useFakeTimers();
    mockTripPlannerApi({
      searchResponses: [createSearchResponse()],
      suggestionHandler: async (query) => ({
        suggestions: [
          {
            coordinate: { lat: 60.17, lon: 24.94 },
            label: `${query}, Suomi`,
          },
          {
            coordinate: { lat: 60.18, lon: 24.95 },
            label: `${query} keskusta`,
          },
        ],
      }),
    });

    render(<TripPlannerPage />);

    const originInput = screen.getByRole("combobox", { name: "tripPlanner.originLabel" });
    fireEvent.focus(originInput);
    fireEvent.change(originInput, { target: { value: "Helsinki" } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
      await Promise.resolve();
    });

    expect(screen.getByRole("option", { name: "Helsinki, Suomi" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: "Helsinki, Suomi" }));

    expect(originInput).toHaveValue("Helsinki, Suomi");
    expect(screen.queryByRole("option", { name: "Helsinki keskusta" })).not.toBeInTheDocument();
    expect(getApiCallsForPath("/api/trip-planner/search")).toHaveLength(0);
  });

  it("does not submit the form when clicking a destination suggestion", async () => {
    vi.useFakeTimers();
    mockTripPlannerApi({
      searchResponses: [createSearchResponse()],
      suggestionHandler: async (query) => ({
        suggestions: [
          {
            coordinate: { lat: 61.5, lon: 23.76 },
            label: `${query}, Suomi`,
          },
        ],
      }),
    });

    render(<TripPlannerPage />);

    const originInput = screen.getByRole("combobox", { name: "tripPlanner.originLabel" });
    const destinationInput = screen.getByRole("combobox", {
      name: "tripPlanner.destinationLabel",
    });

    fireEvent.change(originInput, { target: { value: "Helsinki" } });
    fireEvent.focus(destinationInput);
    fireEvent.change(destinationInput, { target: { value: "Tampere" } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
      await Promise.resolve();
    });

    expect(screen.getByRole("button", { name: "tripPlanner.submit" })).toBeEnabled();
    expect(screen.getByRole("option", { name: "Tampere, Suomi" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("option", { name: "Tampere, Suomi" }));

    expect(destinationInput).toHaveValue("Tampere, Suomi");
    expect(screen.queryByRole("option", { name: "Tampere, Suomi" })).not.toBeInTheDocument();
    expect(getApiCallsForPath("/api/trip-planner/search")).toHaveLength(0);
    expect(screen.queryByTestId("trip-planner-map")).not.toBeInTheDocument();
  });

  it("requires only the origin before enabling submit", async () => {
    mockTripPlannerApi();

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    const submitButton = screen.getByRole("button", { name: "tripPlanner.submit" });

    expect(submitButton).toBeDisabled();

    await user.type(
      screen.getByRole("combobox", { name: "tripPlanner.destinationLabel" }),
      "Tampere",
    );
    expect(submitButton).toBeDisabled();

    await user.type(screen.getByRole("combobox", { name: "tripPlanner.originLabel" }), "Helsinki");
    expect(submitButton).toBeEnabled();
  });

  it("shows an origin-required validation message after blur when the field is left empty", async () => {
    mockTripPlannerApi();

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    const originInput = screen.getByRole("combobox", { name: "tripPlanner.originLabel" });

    expect(screen.queryByText("tripPlanner.errors.originRequired")).not.toBeInTheDocument();
    expect(originInput).not.toHaveAttribute("aria-invalid", "true");

    await user.click(originInput);
    await user.tab();

    expect(screen.getByText("tripPlanner.errors.originRequired")).toBeInTheDocument();
    expect(originInput).toHaveAttribute("aria-invalid", "true");
  });

  it("shows and clears the origin-required validation when the user clears the field", async () => {
    mockTripPlannerApi();

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    const originInput = screen.getByRole("combobox", { name: "tripPlanner.originLabel" });

    await user.type(originInput, "Helsinki");

    expect(screen.queryByText("tripPlanner.errors.originRequired")).not.toBeInTheDocument();
    expect(originInput).not.toHaveAttribute("aria-invalid", "true");

    await user.clear(originInput);

    expect(screen.getByText("tripPlanner.errors.originRequired")).toBeInTheDocument();
    expect(originInput).toHaveAttribute("aria-invalid", "true");

    await user.type(originInput, "Espoo");

    expect(screen.queryByText("tripPlanner.errors.originRequired")).not.toBeInTheDocument();
    expect(originInput).not.toHaveAttribute("aria-invalid", "true");
  });

  it("uses the nearby endpoint when only an origin is submitted", async () => {
    mockTripPlannerApi({ nearbyResponses: [createLargeNearbyResponse()] });

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    await user.type(screen.getByRole("combobox", { name: "tripPlanner.originLabel" }), "Helsinki");
    await user.click(screen.getByRole("button", { name: "tripPlanner.submit" }));

    await waitFor(() => {
      expect(getApiCallsForPath("/api/trip-planner/nearby")).toHaveLength(1);
    });

    expect(getNearbyRequestBodies()[0]).toEqual({
      maxDistanceKm: 25,
      originQuery: "Helsinki",
    });
    expect(getApiCallsForPath("/api/trip-planner/search")).toHaveLength(0);
    expect(screen.getByText("tripPlanner.resultsTitleNearby")).toBeInTheDocument();
    expect(screen.queryByText("tripPlanner.routeSummaryTitle")).not.toBeInTheDocument();
    expect(screen.queryByText("tripPlanner.destinationResolvedLabel")).not.toBeInTheDocument();
    expect(screen.getByTestId("trip-planner-map")).toHaveAttribute("data-mode", "nearby");
    expect(screen.getByTestId("trip-planner-map")).toHaveAttribute("data-destination", "");
    expect(screen.getByTestId("trip-planner-map")).toHaveAttribute(
      "data-visible-distance-km",
      "18",
    );
    expect(
      screen.getByRole("combobox", { name: "tripPlanner.filters.visitStatusLabel" }),
    ).toHaveValue("not-visited");
    expect(screen.getByTestId("trip-planner-map")).toHaveTextContent(
      "map:nuuksio,lisapaikka-2,lisapaikka-3,lisapaikka-5,lisapaikka-6,lisapaikka-8,lisapaikka-9,lisapaikka-11,lisapaikka-12,lisapaikka-14,lisapaikka-15,lisapaikka-17,lisapaikka-18",
    );
    const distanceSlider = screen.getByRole("slider", {
      name: "tripPlanner.filters.distanceFromOriginLabel",
    }) as HTMLInputElement;
    expect(distanceSlider.max).toBe("40");
    expect(distanceSlider.value).toBe("18");

    fireEvent.change(distanceSlider, {
      target: { value: "25" },
    });

    expect(screen.getByTestId("trip-planner-map")).toHaveAttribute(
      "data-visible-distance-km",
      "25",
    );
    expect(screen.getByTestId("trip-planner-map")).toHaveTextContent(
      "map:nuuksio,hossan-polku,lisapaikka-2,lisapaikka-3,lisapaikka-5,lisapaikka-6,lisapaikka-8,lisapaikka-9,lisapaikka-11,lisapaikka-12,lisapaikka-14,lisapaikka-15,lisapaikka-17,lisapaikka-18",
    );

    await user.click(screen.getByRole("tab", { name: "tripPlanner.viewTabs.list" }));

    expect(screen.getAllByText("tripPlanner.distanceFromOrigin").length).toBeGreaterThan(0);
  });

  it("keeps suggestion fetches separate from submit-driven route search", async () => {
    vi.useFakeTimers();
    mockTripPlannerApi({ searchResponses: [createSearchResponse()] });

    render(<TripPlannerPage />);

    const originInput = screen.getByRole("combobox", { name: "tripPlanner.originLabel" });
    fireEvent.focus(originInput);
    fireEvent.change(originInput, { target: { value: "Helsinki" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
      await Promise.resolve();
    });

    expect(getApiCallsForPath("/api/trip-planner/suggestions")).toHaveLength(1);
    expect(getApiCallsForPath("/api/trip-planner/search")).toHaveLength(0);

    fireEvent.change(screen.getByRole("combobox", { name: "tripPlanner.destinationLabel" }), {
      target: { value: "Tampere" },
    });
    fireEvent.click(screen.getByRole("button", { name: "tripPlanner.submit" }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("trip-planner-map")).toBeInTheDocument();
    expect(getApiCallsForPath("/api/trip-planner/search")).toHaveLength(1);
  });

  it("disables the search button and shows a results loading placeholder during the first search", async () => {
    const deferredSearch = createDeferred<SearchResponse>();

    mockTripPlannerApi({
      searchResponses: [],
    });

    vi.mocked(apiFetch).mockImplementation(async (path, options) => {
      if (path === "/api/trip-planner/search") {
        return deferredSearch.promise as never;
      }

      if (path === "/api/trip-planner/suggestions") {
        const body = JSON.parse(String(options?.body ?? "{}")) as { query: string };
        return createSuggestionResponse(body.query) as never;
      }

      throw new Error(`Unexpected apiFetch path: ${path}`);
    });

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    await user.type(screen.getByRole("combobox", { name: "tripPlanner.originLabel" }), "Helsinki");
    await user.type(
      screen.getByRole("combobox", { name: "tripPlanner.destinationLabel" }),
      "Tampere",
    );
    await user.click(screen.getByRole("button", { name: "tripPlanner.submit" }));

    expect(screen.getByRole("button", { name: "tripPlanner.submit" })).toBeDisabled();
    expect(screen.getByText("tripPlanner.loading")).toBeInTheDocument();
    expect(screen.getByText("tripPlanner.resultsTitle")).toBeInTheDocument();

    deferredSearch.resolve(createSearchResponse());
    expect(await screen.findByTestId("trip-planner-map")).toBeInTheDocument();
  });

  it("replaces existing results with a loading placeholder while a new route search is in progress", async () => {
    const secondSearch = createDeferred<SearchResponse>();
    const firstResponse = createSearchResponse();

    vi.mocked(apiFetch).mockImplementation(async (path, options) => {
      if (path === "/api/trip-planner/search") {
        const body = JSON.parse(String(options?.body ?? "{}")) as {
          destinationQuery: string;
          mode: "drive";
          originQuery: string;
        };

        if (body.destinationQuery === "Tampere") {
          return firstResponse as never;
        }

        if (body.destinationQuery === "Jyväskylä") {
          return secondSearch.promise as never;
        }
      }

      if (path === "/api/trip-planner/suggestions") {
        const body = JSON.parse(String(options?.body ?? "{}")) as { query: string };
        return createSuggestionResponse(body.query) as never;
      }

      throw new Error(`Unexpected apiFetch path: ${path}`);
    });

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    await user.type(screen.getByRole("combobox", { name: "tripPlanner.originLabel" }), "Helsinki");
    await user.type(
      screen.getByRole("combobox", { name: "tripPlanner.destinationLabel" }),
      "Tampere",
    );
    await user.click(screen.getByRole("button", { name: "tripPlanner.submit" }));

    expect(await screen.findByTestId("trip-planner-map")).toHaveTextContent(
      "map:nuuksio,hossan-polku",
    );

    await user.click(screen.getByRole("button", { name: "tripPlanner.expandSearch" }));
    await user.clear(screen.getByRole("combobox", { name: "tripPlanner.destinationLabel" }));
    await user.type(
      screen.getByRole("combobox", { name: "tripPlanner.destinationLabel" }),
      "Jyväskylä",
    );
    await user.click(screen.getByRole("button", { name: "tripPlanner.submit" }));

    expect(screen.getByText("tripPlanner.loading")).toBeInTheDocument();
    expect(screen.queryByTestId("trip-planner-map")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "tripPlanner.submit" })).toBeDisabled();

    secondSearch.resolve({
      ...firstResponse,
      destination: {
        coordinate: { lat: 62.24, lon: 25.75 },
        label: "Jyväskylä",
      },
    });

    expect(await screen.findByTestId("trip-planner-map")).toBeInTheDocument();
  });

  it("ignores stale suggestion results after the query changes", async () => {
    vi.useFakeTimers();

    let resolveFirstQuery: ((value: SuggestionResponse) => void) | undefined;

    mockTripPlannerApi({
      searchResponses: [createSearchResponse()],
      suggestionHandler: (query, signal) => {
        if (query === "Hel") {
          return new Promise<SuggestionResponse>((resolve, reject) => {
            resolveFirstQuery = resolve;
            signal?.addEventListener("abort", () => reject(createAbortError()));
          });
        }

        return Promise.resolve({
          suggestions: [
            {
              coordinate: { lat: 60.2, lon: 24.9 },
              label: "Helsinki newer",
            },
          ],
        });
      },
    });

    render(<TripPlannerPage />);

    const originInput = screen.getByRole("combobox", { name: "tripPlanner.originLabel" });

    fireEvent.focus(originInput);
    fireEvent.change(originInput, { target: { value: "Hel" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
      await Promise.resolve();
    });

    fireEvent.change(originInput, { target: { value: "Helsinki" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
      await Promise.resolve();
    });

    expect(screen.getByRole("option", { name: "Helsinki newer" })).toBeInTheDocument();

    if (resolveFirstQuery) {
      resolveFirstQuery({
        suggestions: [
          {
            coordinate: { lat: 60.17, lon: 24.94 },
            label: "Hel stale",
          },
        ],
      });
    }
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByRole("option", { name: "Hel stale" })).not.toBeInTheDocument();
  });

  it("degrades quietly when suggestions fail and still allows manual submit", async () => {
    vi.useFakeTimers();
    mockTripPlannerApi({
      searchResponses: [createSearchResponse()],
      suggestionHandler: async () => {
        throw new ApiError(503, "API error 503: provider down");
      },
    });

    render(<TripPlannerPage />);

    const originInput = screen.getByRole("combobox", { name: "tripPlanner.originLabel" });
    fireEvent.focus(originInput);
    fireEvent.change(originInput, { target: { value: "Helsinki" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
      await Promise.resolve();
    });

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(getApiCallsForPath("/api/trip-planner/search")).toHaveLength(0);

    fireEvent.change(screen.getByRole("combobox", { name: "tripPlanner.destinationLabel" }), {
      target: { value: "Tampere" },
    });
    fireEvent.click(screen.getByRole("button", { name: "tripPlanner.submit" }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("trip-planner-map")).toBeInTheDocument();
    expect(getApiCallsForPath("/api/trip-planner/search")).toHaveLength(1);
  });

  it("does not request suggestions below the minimum query length and closes an open suggestion list", async () => {
    vi.useFakeTimers();
    mockTripPlannerApi();

    render(<TripPlannerPage />);

    const originInput = screen.getByRole("combobox", { name: "tripPlanner.originLabel" });
    fireEvent.focus(originInput);
    fireEvent.change(originInput, { target: { value: "Helsinki" } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
      await Promise.resolve();
    });

    expect(screen.getByRole("option", { name: "Helsinki suggestion 1" })).toBeInTheDocument();
    expect(getApiCallsForPath("/api/trip-planner/suggestions")).toHaveLength(1);

    fireEvent.change(originInput, { target: { value: "H" } });

    expect(screen.queryByRole("option", { name: "Helsinki suggestion 1" })).not.toBeInTheDocument();
    expect(getApiCallsForPath("/api/trip-planner/suggestions")).toHaveLength(1);
  });

  it("reopens cached suggestions on refocus and supports keyboard navigation plus escape", async () => {
    vi.useFakeTimers();
    mockTripPlannerApi({
      suggestionHandler: async () => ({
        suggestions: [
          { coordinate: { lat: 60.17, lon: 24.94 }, label: "Helsinki 1" },
          { coordinate: { lat: 60.18, lon: 24.95 }, label: "Helsinki 2" },
        ],
      }),
    });

    render(<TripPlannerPage />);

    const originInput = screen.getByRole("combobox", { name: "tripPlanner.originLabel" });
    fireEvent.focus(originInput);
    fireEvent.change(originInput, { target: { value: "Helsinki" } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
      await Promise.resolve();
    });

    expect(screen.getByRole("option", { name: "Helsinki 1" })).toBeInTheDocument();

    fireEvent.blur(originInput);
    expect(screen.queryByRole("option", { name: "Helsinki 1" })).not.toBeInTheDocument();

    fireEvent.focus(originInput);
    expect(screen.getByRole("option", { name: "Helsinki 1" })).toBeInTheDocument();
    expect(getApiCallsForPath("/api/trip-planner/suggestions")).toHaveLength(1);

    fireEvent.keyDown(originInput, { key: "ArrowDown" });
    fireEvent.keyDown(originInput, { key: "ArrowDown" });
    fireEvent.keyDown(originInput, { key: "ArrowUp" });
    fireEvent.keyDown(originInput, { key: "Enter" });

    expect(originInput).toHaveValue("Helsinki 1");

    fireEvent.focus(originInput);
    fireEvent.change(originInput, { target: { value: "Helsinki" } });
    expect(screen.getByRole("option", { name: "Helsinki 1" })).toBeInTheDocument();
    fireEvent.keyDown(originInput, { key: "Escape" });
    expect(screen.queryByRole("option", { name: "Helsinki 1" })).not.toBeInTheDocument();
  });

  it("does not refetch suggestions when the selected suggestion label stays unchanged", async () => {
    vi.useFakeTimers();
    mockTripPlannerApi({
      suggestionHandler: async () => ({
        suggestions: [{ coordinate: { lat: 60.17, lon: 24.94 }, label: "Helsinki, Suomi" }],
      }),
    });

    render(<TripPlannerPage />);

    const originInput = screen.getByRole("combobox", { name: "tripPlanner.originLabel" });
    fireEvent.focus(originInput);
    fireEvent.change(originInput, { target: { value: "Helsinki" } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("option", { name: "Helsinki, Suomi" }));
    expect(originInput).toHaveValue("Helsinki, Suomi");
    expect(getApiCallsForPath("/api/trip-planner/suggestions")).toHaveLength(1);

    fireEvent.focus(originInput);
    fireEvent.change(originInput, { target: { value: "Helsinki, Suomi" } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
      await Promise.resolve();
    });

    expect(screen.queryByRole("option", { name: "Helsinki, Suomi" })).not.toBeInTheDocument();
    expect(getApiCallsForPath("/api/trip-planner/suggestions")).toHaveLength(1);
  });

  it("fills the origin with the current location address after geolocation succeeds", async () => {
    const reverseLookup = createDeferred<SuggestionResponse>();

    mockTripPlannerApi({
      suggestionHandler: async (query) => {
        if (query === currentLocationCoordinateQuery) {
          return reverseLookup.promise;
        }

        return createSuggestionResponse(query);
      },
    });

    const getCurrentPositionMock = mockCurrentLocation((onSuccess) => {
      onSuccess({
        coords: {
          accuracy: 15,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          latitude: 60.192059,
          longitude: 24.945831,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      });
    });

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    const locateButton = screen.getByRole("button", { name: "tripPlanner.originLocate" });
    await user.click(locateButton);

    expect(getCurrentPositionMock).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({
        enableHighAccuracy: false,
        maximumAge: 300000,
        timeout: 10000,
      }),
    );
    expect(locateButton).toBeDisabled();
    expect(screen.getByText("tripPlanner.locationLocating")).toBeInTheDocument();
    expect(getApiCallsForPath("/api/trip-planner/suggestions")).toHaveLength(1);
    expect(
      JSON.parse(String(getApiCallsForPath("/api/trip-planner/suggestions")[0]?.[1]?.body ?? "{}")),
    ).toEqual({
      query: currentLocationCoordinateQuery,
    });

    reverseLookup.resolve({
      suggestions: [currentLocationSuggestion],
    });

    expect(await screen.findByDisplayValue(currentLocationSuggestion.label)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "tripPlanner.submit" })).toBeEnabled();
    expect(screen.queryByText("tripPlanner.locationLocating")).not.toBeInTheDocument();
    expect(locateButton).toBeEnabled();
  });

  it("falls back to the coordinate query when reverse lookup fails after geolocation succeeds", async () => {
    mockTripPlannerApi({
      suggestionHandler: async (query) => {
        if (query === currentLocationCoordinateQuery) {
          throw new ApiError(503, "API error 503: provider down");
        }

        return createSuggestionResponse(query);
      },
    });

    mockCurrentLocation((onSuccess) => {
      onSuccess({
        coords: {
          accuracy: 15,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          latitude: 60.192059,
          longitude: 24.945831,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      });
    });

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    await user.click(screen.getByRole("button", { name: "tripPlanner.originLocate" }));

    expect(await screen.findByDisplayValue(currentLocationCoordinateQuery)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "tripPlanner.submit" })).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a location error message when the browser cannot provide geolocation", async () => {
    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: undefined,
    });

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    await user.click(screen.getByRole("button", { name: "tripPlanner.originLocate" }));

    expect(screen.getByText("tripPlanner.locationUnsupported")).toBeInTheDocument();
  });

  it("filters the returned result set locally without making a new request", async () => {
    mockTripPlannerApi({ searchResponses: [createLargeSearchResponse()] });

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    await user.type(screen.getByRole("combobox", { name: "tripPlanner.originLabel" }), "Helsinki");
    await user.type(
      screen.getByRole("combobox", { name: "tripPlanner.destinationLabel" }),
      "Tampere",
    );
    await user.click(screen.getByRole("button", { name: "tripPlanner.submit" }));

    await waitFor(() => {
      expect(getApiCallsForPath("/api/trip-planner/search")).toHaveLength(1);
    });

    expect(getSearchRequestBodies()[0]).toEqual({
      destinationQuery: "Tampere",
      mode: "drive",
      originQuery: "Helsinki",
    });

    expect(
      screen.queryByRole("combobox", { name: "tripPlanner.originLabel" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "tripPlanner.expandSearch" })).toBeInTheDocument();
    expect(screen.getByText("tripPlanner.originResolvedLabel")).toBeInTheDocument();
    expect(screen.getByText("tripPlanner.destinationResolvedLabel")).toBeInTheDocument();
    expect(screen.getByText("Helsinki")).toBeInTheDocument();
    expect(screen.getByText("Tampere")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "tripPlanner.filters.parkTypeLabel" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "tripPlanner.filters.visitStatusLabel" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("slider", { name: "tripPlanner.filters.distanceLabel" }),
    ).toBeInTheDocument();
    const distanceSlider = screen.getByRole("slider", {
      name: "tripPlanner.filters.distanceLabel",
    }) as HTMLInputElement;
    expect(distanceSlider.max).toBe("60");
    expect(distanceSlider.value).toBe("25");
    expect(screen.getByRole("tab", { name: "tripPlanner.viewTabs.map" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("combobox", { name: "tripPlanner.filters.visitStatusLabel" }),
    ).toHaveValue("not-visited");
    expect(screen.getByTestId("trip-planner-map")).toHaveTextContent("map:nuuksio,hossan-polku");

    await user.click(screen.getByRole("tab", { name: "tripPlanner.viewTabs.list" }));

    expect(screen.getByText("tripPlanner.sections.notVisited")).toBeInTheDocument();
    expect(screen.queryByText("tripPlanner.sections.visited")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nuuksion kansallispuisto" })).toHaveAttribute(
      "href",
      "/paikka/nuuksio",
    );
    expect(screen.getByRole("link", { name: "Hossan polku" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Seurasaari" })).not.toBeInTheDocument();
    expect(screen.getAllByText("tripPlanner.distanceFromRoute").length).toBeGreaterThan(2);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "tripPlanner.filters.visitStatusLabel" }),
      "all",
    );

    expect(screen.getByRole("link", { name: "Nuuksion kansallispuisto" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hossan polku" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Seurasaari" })).toBeInTheDocument();
    expect(getApiCallsForPath("/api/trip-planner/search")).toHaveLength(1);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "tripPlanner.filters.parkTypeLabel" }),
      "trails-and-routes",
    );

    expect(screen.getByRole("link", { name: "Hossan polku" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Nuuksion kansallispuisto" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Seurasaari" })).not.toBeInTheDocument();
    expect(getApiCallsForPath("/api/trip-planner/search")).toHaveLength(1);
  });

  it("shows an empty state when no parks are near the route", async () => {
    mockTripPlannerApi({
      searchResponses: [
        {
          ...createSearchResponse(),
          parks: [],
        },
      ],
    });

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    await user.type(screen.getByRole("combobox", { name: "tripPlanner.originLabel" }), "Helsinki");
    await user.type(
      screen.getByRole("combobox", { name: "tripPlanner.destinationLabel" }),
      "Tampere",
    );
    await user.click(screen.getByRole("button", { name: "tripPlanner.submit" }));

    expect(await screen.findByText("tripPlanner.noResults")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "tripPlanner.expandSearch" })).toBeInTheDocument();
    expect(screen.getByText("tripPlanner.originResolvedLabel")).toBeInTheDocument();
    expect(screen.getByText("tripPlanner.destinationResolvedLabel")).toBeInTheDocument();
  });

  it("collapses the search form after a successful search and allows reopening it", async () => {
    mockTripPlannerApi({
      searchResponses: [
        createLargeSearchResponse(),
        {
          ...createLargeSearchResponse(),
          defaultDistanceKm: 9,
          destination: {
            coordinate: { lat: 62.24, lon: 25.75 },
            label: "Jyväskylä",
          },
          maxDistanceKm: 45,
        },
      ],
    });

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    await user.type(screen.getByRole("combobox", { name: "tripPlanner.originLabel" }), "Helsinki");
    await user.type(
      screen.getByRole("combobox", { name: "tripPlanner.destinationLabel" }),
      "Tampere",
    );
    await user.click(screen.getByRole("button", { name: "tripPlanner.submit" }));

    await screen.findByTestId("trip-planner-map");

    const titleRow = screen
      .getByRole("heading", { name: "tripPlanner.title" })
      .closest("div")?.parentElement;

    expect(titleRow).toHaveClass("flex", "items-start", "justify-between");
    expect(titleRow).not.toHaveClass("flex-col");
    expect(
      screen.queryByRole("combobox", { name: "tripPlanner.originLabel" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("tripPlanner.originResolvedLabel").parentElement).toHaveTextContent(
      "tripPlanner.originResolvedLabel",
    );
    expect(screen.getByText("tripPlanner.originResolvedLabel").parentElement).toHaveTextContent(
      "Helsinki",
    );
    expect(
      screen.getByText("tripPlanner.destinationResolvedLabel").parentElement,
    ).toHaveTextContent("tripPlanner.destinationResolvedLabel");
    expect(
      screen.getByText("tripPlanner.destinationResolvedLabel").parentElement,
    ).toHaveTextContent("Tampere");

    const desktopRouteSummary = screen
      .getByText("tripPlanner.routeSummaryTitle")
      .closest("div")?.parentElement;

    expect(desktopRouteSummary).toHaveTextContent("180 km");
    expect(desktopRouteSummary).toHaveTextContent("•");
    expect(desktopRouteSummary).toHaveTextContent("2 h 30 min");
    expect(desktopRouteSummary).not.toHaveTextContent("tripPlanner.routeDistance");
    expect(desktopRouteSummary).not.toHaveTextContent("tripPlanner.routeDuration");
    expect(screen.getByTitle("tripPlanner.routeDistance")).toHaveTextContent("180 km");
    expect(screen.getByTitle("tripPlanner.routeDuration")).toHaveTextContent("2 h 30 min");

    await user.click(screen.getByRole("button", { name: "tripPlanner.expandSearch" }));

    expect(screen.getByRole("combobox", { name: "tripPlanner.originLabel" })).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "tripPlanner.destinationLabel" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "tripPlanner.destinationLabel" }).closest("section"),
    ).toHaveClass("z-20");
    expect(screen.getByRole("button", { name: "tripPlanner.collapseSearch" })).toBeInTheDocument();
    expect(screen.queryByText("tripPlanner.originResolvedLabel")).not.toBeInTheDocument();
    expect(screen.queryByText("tripPlanner.destinationResolvedLabel")).not.toBeInTheDocument();
    expect(screen.getByText("tripPlanner.resultsTitle").closest("section")).toHaveClass("z-0");
  });

  it("switches from the default map subview to the list with the currently visible parks", async () => {
    mockTripPlannerApi({ searchResponses: [createLargeSearchResponse()] });

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    await user.type(screen.getByRole("combobox", { name: "tripPlanner.originLabel" }), "Helsinki");
    await user.type(
      screen.getByRole("combobox", { name: "tripPlanner.destinationLabel" }),
      "Tampere",
    );
    await user.click(screen.getByRole("button", { name: "tripPlanner.submit" }));

    await screen.findByTestId("trip-planner-map");

    expect(screen.getByRole("tab", { name: "tripPlanner.viewTabs.map" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("trip-planner-map")).toHaveTextContent("map:nuuksio,hossan-polku");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "tripPlanner.filters.visitStatusLabel" }),
      "visited",
    );

    await user.click(screen.getByRole("tab", { name: "tripPlanner.viewTabs.list" }));

    expect(screen.getByRole("tab", { name: "tripPlanner.viewTabs.list" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.queryByRole("link", { name: "Nuuksion kansallispuisto" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Seurasaari" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "tripPlanner.viewTabs.map" }));

    expect(screen.getByRole("tab", { name: "tripPlanner.viewTabs.map" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("trip-planner-map")).toHaveTextContent("map:seurasaari");
  });

  it("hides filters when the result set has 20 places or fewer", async () => {
    mockTripPlannerApi({ searchResponses: [createSearchResponse()] });

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    await user.type(screen.getByRole("combobox", { name: "tripPlanner.originLabel" }), "Helsinki");
    await user.type(
      screen.getByRole("combobox", { name: "tripPlanner.destinationLabel" }),
      "Tampere",
    );
    await user.click(screen.getByRole("button", { name: "tripPlanner.submit" }));

    await screen.findByTestId("trip-planner-map");

    expect(
      screen.queryByRole("combobox", { name: "tripPlanner.filters.parkTypeLabel" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "tripPlanner.filters.visitStatusLabel" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("slider", { name: "tripPlanner.filters.distanceLabel" }),
    ).not.toBeInTheDocument();
  });

  it("shows all nearby parks when filters are hidden for a small result set", async () => {
    mockTripPlannerApi({ nearbyResponses: [createNearbyResponse()] });

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    await user.type(screen.getByRole("combobox", { name: "tripPlanner.originLabel" }), "Helsinki");
    await user.click(screen.getByRole("button", { name: "tripPlanner.submit" }));

    await screen.findByTestId("trip-planner-map");

    expect(
      screen.queryByRole("combobox", { name: "tripPlanner.filters.parkTypeLabel" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "tripPlanner.filters.visitStatusLabel" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("slider", { name: "tripPlanner.filters.distanceFromOriginLabel" }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("trip-planner-map")).toHaveTextContent(
      "map:nuuksio,hossan-polku,seurasaari",
    );
  });

  it("toggles stacked mobile filters from the results title button", async () => {
    setTripPlannerResultsViewport(true);
    mockTripPlannerApi({ searchResponses: [createLargeSearchResponse()] });

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    await user.type(screen.getByRole("combobox", { name: "tripPlanner.originLabel" }), "Helsinki");
    await user.type(
      screen.getByRole("combobox", { name: "tripPlanner.destinationLabel" }),
      "Tampere",
    );
    await user.click(screen.getByRole("button", { name: "tripPlanner.submit" }));

    await screen.findByTestId("trip-planner-map");

    const closedToggle = await screen.findByRole("button", {
      name: "tripPlanner.filters.showMobile",
    });

    expect(closedToggle).toHaveAttribute("aria-expanded", "false");
    const mobileRouteSummary = screen.getByText("tripPlanner.routeSummaryTitle").parentElement;

    expect(mobileRouteSummary).toHaveTextContent("180 km");
    expect(mobileRouteSummary).toHaveTextContent("•");
    expect(mobileRouteSummary).toHaveTextContent("2 h 30 min");
    expect(mobileRouteSummary).not.toHaveTextContent("tripPlanner.routeDistance");
    expect(mobileRouteSummary).not.toHaveTextContent("tripPlanner.routeDuration");
    expect(
      screen.queryByRole("combobox", { name: "tripPlanner.filters.parkTypeLabel" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "tripPlanner.filters.visitStatusLabel" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("slider", { name: "tripPlanner.filters.distanceLabel" }),
    ).not.toBeInTheDocument();

    await user.click(closedToggle);

    const openToggle = screen.getByRole("button", { name: "tripPlanner.filters.hideMobile" });

    expect(openToggle).toHaveAttribute("aria-expanded", "true");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "tripPlanner.filters.visitStatusLabel" }),
      "visited",
    );
    fireEvent.change(screen.getByRole("slider", { name: "tripPlanner.filters.distanceLabel" }), {
      target: { value: "7" },
    });

    expect(screen.getByTestId("trip-planner-map")).toHaveTextContent(
      "map:lisapaikka-1,lisapaikka-13",
    );
    expect(screen.getByRole("button", { name: "tripPlanner.filters.hideMobile" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    await user.click(openToggle);

    expect(
      screen.queryByRole("combobox", { name: "tripPlanner.filters.parkTypeLabel" }),
    ).not.toBeInTheDocument();
  });

  it("shows a filtered empty state when local filters hide all returned parks", async () => {
    mockTripPlannerApi({ searchResponses: [createLargeSearchResponse()] });

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    await user.type(screen.getByRole("combobox", { name: "tripPlanner.originLabel" }), "Helsinki");
    await user.type(
      screen.getByRole("combobox", { name: "tripPlanner.destinationLabel" }),
      "Tampere",
    );
    await user.click(screen.getByRole("button", { name: "tripPlanner.submit" }));

    await screen.findByTestId("trip-planner-map");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "tripPlanner.filters.parkTypeLabel" }),
      "trails-and-routes",
    );
    fireEvent.change(screen.getByRole("slider", { name: "tripPlanner.filters.distanceLabel" }), {
      target: { value: "1" },
    });

    expect(screen.getByTestId("trip-planner-map")).toHaveTextContent("map:");
    expect(screen.getByText("tripPlanner.filteredEmpty")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "tripPlanner.filters.reset" }));

    expect(screen.getByTestId("trip-planner-map")).toHaveTextContent("map:nuuksio,hossan-polku");
  });

  it("falls back to showing all returned park types if the filter value is unexpected", async () => {
    mockTripPlannerApi({ searchResponses: [createLargeSearchResponse()] });

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    await user.type(screen.getByRole("combobox", { name: "tripPlanner.originLabel" }), "Helsinki");
    await user.type(
      screen.getByRole("combobox", { name: "tripPlanner.destinationLabel" }),
      "Tampere",
    );
    await user.click(screen.getByRole("button", { name: "tripPlanner.submit" }));

    await screen.findByTestId("trip-planner-map");
    await user.click(screen.getByRole("tab", { name: "tripPlanner.viewTabs.list" }));

    fireEvent.change(screen.getByRole("combobox", { name: "tripPlanner.filters.parkTypeLabel" }), {
      target: { value: "unexpected-filter-value" },
    });

    expect(screen.getByRole("link", { name: "Nuuksion kansallispuisto" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hossan polku" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Seurasaari" })).not.toBeInTheDocument();
  });

  it("resets local filters when a new trip search succeeds", async () => {
    mockTripPlannerApi({
      searchResponses: [
        createLargeSearchResponse(),
        {
          ...createLargeSearchResponse(),
          defaultDistanceKm: 9,
          destination: {
            coordinate: { lat: 61.49, lon: 23.76 },
            label: "Jyväskylä",
          },
          maxDistanceKm: 45,
        },
      ],
    });

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    const originInput = screen.getByRole("combobox", { name: "tripPlanner.originLabel" });
    const destinationInput = screen.getByRole("combobox", { name: "tripPlanner.destinationLabel" });

    await user.type(originInput, "Helsinki");
    await user.type(destinationInput, "Tampere");
    await user.click(screen.getByRole("button", { name: "tripPlanner.submit" }));

    await screen.findByTestId("trip-planner-map");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "tripPlanner.filters.visitStatusLabel" }),
      "visited",
    );

    expect(screen.getByTestId("trip-planner-map")).toHaveTextContent("map:seurasaari");

    await user.click(screen.getByRole("button", { name: "tripPlanner.expandSearch" }));

    const reopenedDestinationInput = screen.getByRole("combobox", {
      name: "tripPlanner.destinationLabel",
    });

    await user.clear(reopenedDestinationInput);
    await user.type(reopenedDestinationInput, "Jyväskylä");
    await user.click(screen.getByRole("button", { name: "tripPlanner.submit" }));

    await waitFor(() => {
      expect(getApiCallsForPath("/api/trip-planner/search")).toHaveLength(2);
    });

    expect(screen.getByTestId("trip-planner-map")).toHaveTextContent(
      "map:nuuksio,lisapaikka-2,lisapaikka-3,lisapaikka-5,lisapaikka-11,lisapaikka-12,lisapaikka-14,lisapaikka-15",
    );
    expect(
      screen.getByRole("combobox", { name: "tripPlanner.filters.visitStatusLabel" }),
    ).toHaveValue("not-visited");
    const distanceSlider = screen.getByRole("slider", {
      name: "tripPlanner.filters.distanceLabel",
    }) as HTMLInputElement;
    expect(distanceSlider.max).toBe("45");
    expect(distanceSlider.value).toBe("9");
  });

  it("shows a request error", async () => {
    mockTripPlannerApi({
      searchResponses: [new ApiError(503, "API error 503: provider down")],
    });

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    await user.type(screen.getByRole("combobox", { name: "tripPlanner.originLabel" }), "Helsinki");
    await user.type(
      screen.getByRole("combobox", { name: "tripPlanner.destinationLabel" }),
      "Tampere",
    );
    await user.click(screen.getByRole("button", { name: "tripPlanner.submit" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("API error 503: provider down");
  });
});
