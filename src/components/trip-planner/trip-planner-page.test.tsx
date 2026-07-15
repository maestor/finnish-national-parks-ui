import { ApiError, apiFetch } from "@/lib/api";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TripPlannerPage } from "./trip-planner-page";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");

  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

describe("TripPlannerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits origin and destination, then renders unvisited and visited results", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      destination: {
        coordinate: { lat: 60.17, lon: 24.94 },
        label: "Tampere",
      },
      origin: {
        coordinate: { lat: 60.17, lon: 24.94 },
        label: "Helsinki",
      },
      parks: [
        {
          address: "Nuuksiontie 83, 02820 Espoo",
          category: { name: "Kansallispuistot", slug: "national-park" },
          distanceFromRouteKm: 4.2,
          locationLabel: "Nuuksiontie 83",
          markerPoint: { lat: 60.31, lon: 24.53 },
          name: "Nuuksion kansallispuisto",
          postalCode: "02820",
          postalOffice: "Espoo",
          slug: "nuuksio",
          type: { code: 111, id: 1, name: "Kansallispuisto", slug: "national-park" },
          visitedSummary: { lastVisitedOn: null, visitCount: 0, visited: false },
        },
        {
          address: "Pallastunturintie 1, 99330 Pallastunturi",
          category: { name: "Kansallispuistot", slug: "national-park" },
          distanceFromRouteKm: 12.8,
          locationLabel: "Pallastunturintie 1",
          markerPoint: { lat: 68, lon: 24 },
          name: "Pallas-Yllästunturin kansallispuisto",
          postalCode: "99330",
          postalOffice: "Pallastunturi",
          slug: "pallas-yllastunturi",
          type: { code: 111, id: 1, name: "Kansallispuisto", slug: "national-park" },
          visitedSummary: { lastVisitedOn: "2025-07-10", visitCount: 3, visited: true },
        },
      ],
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

    expect(screen.getByText("tripPlanner.sections.notVisited")).toBeInTheDocument();
    expect(screen.getByText("tripPlanner.sections.visited")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nuuksion kansallispuisto" })).toHaveAttribute(
      "href",
      "/park/nuuksio",
    );
    expect(
      screen.getByRole("link", { name: "Pallas-Yllästunturin kansallispuisto" }),
    ).toHaveAttribute("href", "/park/pallas-yllastunturi");
    expect(screen.getByText("tripPlanner.notVisited")).toBeInTheDocument();
    expect(screen.getByText("tripPlanner.visited")).toBeInTheDocument();
    expect(screen.getAllByText("tripPlanner.distanceFromRoute")).toHaveLength(2);
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
