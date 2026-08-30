import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TripStorySummary } from "@/lib/trips";
import { TripStoryArchive } from "./trip-story-archive";
import { TripStoryCard } from "./trip-story-card";

vi.mock("@/components/ui/app-image", () => ({
  AppImage: ({ alt, src }: { alt: string; src: string }) => (
    <div role="img" aria-label={alt} data-src={src} />
  ),
}));

const stories = [
  {
    coverImage: null,
    dateRange: { end: "2026-07-14", start: "2026-07-10" },
    featured: true,
    imageCount: 2,
    name: "Kesäinen kierros",
    places: [
      { name: "A-kansallispuisto", slug: "a" },
      { name: "B-kansallispuisto", slug: "b" },
      { name: "C-kansallispuisto", slug: "c" },
      { name: "D-kansallispuisto", slug: "d" },
    ],
    publishedAt: "2026-07-15T10:00:00.000Z",
    seasons: ["summer"],
    slug: "kesainen-kierros",
    stopCount: 1,
    summary: "Matkan yhteenveto.",
    updatedAt: "2026-07-15T10:00:00.000Z",
    visitCount: 3,
    years: [2026],
  },
  {
    coverImage: {
      createdAt: "2025-10-12T10:00:00.000Z",
      displayOrder: 0,
      fullHeight: 100,
      fullUrl: "https://example.test/full.jpg",
      fullWidth: 100,
      id: 2,
      originalName: "Maisema.jpg",
      thumbHeight: 50,
      thumbUrl: "https://example.test/thumb.jpg",
      thumbWidth: 50,
    },
    dateRange: null,
    featured: false,
    imageCount: 0,
    name: "Syksyn retki",
    places: [],
    publishedAt: "2025-10-13T10:00:00.000Z",
    seasons: ["autumn"],
    slug: "syksyn-retki",
    stopCount: 0,
    summary: null,
    updatedAt: "2025-10-13T10:00:00.000Z",
    visitCount: 0,
    years: [2025],
  },
] satisfies TripStorySummary[];

describe("TripStoryCard", () => {
  it("renders featured content, places, counts, and the empty-cover state", () => {
    render(<TripStoryCard story={stories[0]} variant="featured" />);

    expect(screen.getByRole("link", { name: "Kesäinen kierros" })).toHaveAttribute(
      "href",
      "/retki/kesainen-kierros",
    );
    expect(
      screen.getByText("A-kansallispuisto, B-kansallispuisto, C-kansallispuisto +1 muuta"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("trips.visitsCount · trips.stopsCount · trips.imagesCount"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Kesäinen kierros: ei kansikuvaa" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "trips.read" })).toHaveLength(1);
  });

  it("renders a date fallback and real cover without a summary", () => {
    render(<TripStoryCard story={stories[1]} />);

    expect(screen.getByText("trips.datesMissing")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("data-src", "https://example.test/full.jpg");
    expect(
      screen.queryByText("Retkestä ei ole vielä kirjoitettu yhteenvetoa."),
    ).not.toBeInTheDocument();
  });
});

describe("TripStoryArchive", () => {
  it("submits filters immediately and renders translated season options", () => {
    render(
      <TripStoryArchive
        stories={stories}
        filteredStories={stories}
        filters={{ place: null, season: null, year: null }}
        error={null}
      />,
    );

    const form = screen
      .getByRole("heading", { name: "trips.filters" })
      .closest("section")
      ?.querySelector("form");
    expect(form).not.toBeNull();
    const requestSubmit = vi.fn();
    Object.defineProperty(form, "requestSubmit", { value: requestSubmit });

    expect(screen.getByRole("option", { name: "trips.seasonLabels.autumn" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("trips.season"), { target: { value: "autumn" } });
    fireEvent.change(screen.getByLabelText("trips.year"), { target: { value: "2025" } });
    fireEvent.change(screen.getByLabelText("trips.place"), { target: { value: "a" } });
    expect(requestSubmit).toHaveBeenCalledTimes(3);
  });

  it("renders error and empty filtered states", () => {
    const { rerender } = render(
      <TripStoryArchive
        stories={stories}
        filteredStories={[]}
        filters={{ place: "a", season: null, year: null }}
        error="Lataus epäonnistui"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Lataus epäonnistui");

    rerender(
      <TripStoryArchive
        stories={stories}
        filteredStories={[]}
        filters={{ place: null, season: null, year: null }}
        error={null}
      />,
    );
    expect(screen.getByText("trips.emptyTitle")).toBeInTheDocument();
  });
});
