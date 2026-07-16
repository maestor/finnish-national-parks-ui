import { ApiError, apiFetch } from "@/lib/api";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TripPlannerPage } from "./trip-planner-page";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");

  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

describe("TripPlannerPage", () => {
  const createSearchResponse = () => ({
    destination: {
      coordinate: { lat: 61.5, lon: 23.7 },
      label: "Tampere",
    },
    origin: {
      coordinate: { lat: 60.17, lon: 24.94 },
      label: "Helsinki",
    },
    parks: [
      {
        address: "Nuuksiontie 83, 02820 Espoo",
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
      distanceMeters: 180_000,
      durationSeconds: 9_000,
      mode: "drive" as const,
    },
  });

  const createLargeSearchResponse = () => ({
    ...createSearchResponse(),
    parks: [
      ...createSearchResponse().parks,
      ...Array.from({ length: 19 }, (_, index) => ({
        address: `Lisatie ${index + 1}, 0010${index} Helsinki`,
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

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("filters the returned result set locally without making a new request", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(createLargeSearchResponse());

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    await user.type(screen.getByRole("textbox", { name: "tripPlanner.originLabel" }), "Helsinki");
    await user.type(
      screen.getByRole("textbox", { name: "tripPlanner.destinationLabel" }),
      "Tampere",
    );
    await user.click(screen.getByRole("button", { name: "tripPlanner.submit" }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/trip-planner/search", {
        body: expect.any(String),
        method: "POST",
      });
    });

    expect(JSON.parse(vi.mocked(apiFetch).mock.calls[0]?.[1]?.body as string)).toEqual({
      destinationQuery: "Tampere",
      mode: "drive",
      originQuery: "Helsinki",
    });

    expect(
      screen.queryByRole("textbox", { name: "tripPlanner.originLabel" }),
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
    expect(screen.getByText("tripPlanner.sections.notVisited")).toBeInTheDocument();
    expect(screen.getByText("tripPlanner.sections.visited")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nuuksion kansallispuisto" })).toHaveAttribute(
      "href",
      "/park/nuuksio",
    );
    expect(screen.getByRole("link", { name: "Hossan polku" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Seurasaari" })).toHaveAttribute(
      "href",
      "/park/seurasaari",
    );
    expect(screen.getAllByText("tripPlanner.visited").length).toBeGreaterThan(0);
    expect(screen.getAllByText("tripPlanner.distanceFromRoute").length).toBeGreaterThan(3);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "tripPlanner.filters.visitStatusLabel" }),
      "not-visited",
    );

    expect(screen.getByRole("link", { name: "Nuuksion kansallispuisto" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hossan polku" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Seurasaari" })).not.toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledTimes(1);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "tripPlanner.filters.parkTypeLabel" }),
      "trails-and-routes",
    );

    expect(
      screen.queryByRole("link", { name: "Nuuksion kansallispuisto" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hossan polku" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Seurasaari" })).not.toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it("shows an empty state when no parks are near the route", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      destination: {
        coordinate: { lat: 61.5, lon: 23.7 },
        label: "Tampere",
      },
      origin: {
        coordinate: { lat: 60.17, lon: 24.94 },
        label: "Helsinki",
      },
      parks: [],
      route: {
        distanceMeters: 180_000,
        durationSeconds: 9_000,
        mode: "drive" as const,
      },
    });

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    await user.type(screen.getByRole("textbox", { name: "tripPlanner.originLabel" }), "Helsinki");
    await user.type(
      screen.getByRole("textbox", { name: "tripPlanner.destinationLabel" }),
      "Tampere",
    );
    await user.click(screen.getByRole("button", { name: "tripPlanner.submit" }));

    expect(await screen.findByText("tripPlanner.noResults")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "tripPlanner.expandSearch" })).toBeInTheDocument();
    expect(screen.getByText("tripPlanner.originResolvedLabel")).toBeInTheDocument();
    expect(screen.getByText("tripPlanner.destinationResolvedLabel")).toBeInTheDocument();
  });

  it("collapses the search form after a successful search and allows reopening it", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(createLargeSearchResponse());

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    await user.type(screen.getByRole("textbox", { name: "tripPlanner.originLabel" }), "Helsinki");
    await user.type(
      screen.getByRole("textbox", { name: "tripPlanner.destinationLabel" }),
      "Tampere",
    );
    await user.click(screen.getByRole("button", { name: "tripPlanner.submit" }));

    await screen.findByRole("link", { name: "Nuuksion kansallispuisto" });

    expect(
      screen.queryByRole("textbox", { name: "tripPlanner.originLabel" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "tripPlanner.expandSearch" }));

    expect(screen.getByRole("textbox", { name: "tripPlanner.originLabel" })).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "tripPlanner.destinationLabel" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "tripPlanner.collapseSearch" })).toBeInTheDocument();
    expect(screen.queryByText("tripPlanner.originResolvedLabel")).not.toBeInTheDocument();
    expect(screen.queryByText("tripPlanner.destinationResolvedLabel")).not.toBeInTheDocument();
  });

  it("hides filters when the result set has 20 places or fewer", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(createSearchResponse());

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    await user.type(screen.getByRole("textbox", { name: "tripPlanner.originLabel" }), "Helsinki");
    await user.type(
      screen.getByRole("textbox", { name: "tripPlanner.destinationLabel" }),
      "Tampere",
    );
    await user.click(screen.getByRole("button", { name: "tripPlanner.submit" }));

    await screen.findByRole("link", { name: "Nuuksion kansallispuisto" });

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

  it("shows a filtered empty state when local filters hide all returned parks", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(createLargeSearchResponse());

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    await user.type(screen.getByRole("textbox", { name: "tripPlanner.originLabel" }), "Helsinki");
    await user.type(
      screen.getByRole("textbox", { name: "tripPlanner.destinationLabel" }),
      "Tampere",
    );
    await user.click(screen.getByRole("button", { name: "tripPlanner.submit" }));

    await screen.findByRole("link", { name: "Nuuksion kansallispuisto" });

    await user.selectOptions(
      screen.getByRole("combobox", { name: "tripPlanner.filters.parkTypeLabel" }),
      "trails-and-routes",
    );
    fireEvent.change(screen.getByRole("slider", { name: "tripPlanner.filters.distanceLabel" }), {
      target: { value: "1" },
    });

    expect(screen.queryByRole("link", { name: "Hossan polku" })).not.toBeInTheDocument();
    expect(screen.getByText("tripPlanner.filteredEmpty")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "tripPlanner.filters.reset" }));

    expect(screen.getByRole("link", { name: "Nuuksion kansallispuisto" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hossan polku" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Seurasaari" })).toBeInTheDocument();
  });

  it("resets local filters when a new trip search succeeds", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(createLargeSearchResponse())
      .mockResolvedValueOnce({
        ...createLargeSearchResponse(),
        destination: {
          coordinate: { lat: 61.49, lon: 23.76 },
          label: "Jyväskylä",
        },
      });

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    const originInput = screen.getByRole("textbox", { name: "tripPlanner.originLabel" });
    const destinationInput = screen.getByRole("textbox", { name: "tripPlanner.destinationLabel" });

    await user.type(originInput, "Helsinki");
    await user.type(destinationInput, "Tampere");
    await user.click(screen.getByRole("button", { name: "tripPlanner.submit" }));

    await screen.findByRole("link", { name: "Nuuksion kansallispuisto" });

    await user.selectOptions(
      screen.getByRole("combobox", { name: "tripPlanner.filters.visitStatusLabel" }),
      "visited",
    );

    expect(
      screen.queryByRole("link", { name: "Nuuksion kansallispuisto" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Seurasaari" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "tripPlanner.expandSearch" }));

    const reopenedDestinationInput = screen.getByRole("textbox", {
      name: "tripPlanner.destinationLabel",
    });

    await user.clear(reopenedDestinationInput);
    await user.type(reopenedDestinationInput, "Jyväskylä");
    await user.click(screen.getByRole("button", { name: "tripPlanner.submit" }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledTimes(2);
    });

    expect(screen.getByRole("link", { name: "Nuuksion kansallispuisto" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hossan polku" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Seurasaari" })).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "tripPlanner.filters.visitStatusLabel" }),
    ).toHaveValue("all");
  });

  it("shows a request error", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new ApiError(503, "API error 503: provider down"));

    const user = userEvent.setup();

    render(<TripPlannerPage />);

    await user.type(screen.getByRole("textbox", { name: "tripPlanner.originLabel" }), "Helsinki");
    await user.type(
      screen.getByRole("textbox", { name: "tripPlanner.destinationLabel" }),
      "Tampere",
    );
    await user.click(screen.getByRole("button", { name: "tripPlanner.submit" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("API error 503: provider down");
  });
});
