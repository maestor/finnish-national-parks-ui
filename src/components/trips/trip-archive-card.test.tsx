import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PublicTripArchiveItem } from "@/lib/public-trips";
import { TripArchiveCard } from "./trip-archive-card";

const trip: PublicTripArchiveItem = {
  createdAt: "2024-06-18T10:00:00Z",
  dateRange: { end: "2024-06-18", start: "2024-06-15" },
  descriptionExcerpt: "Kesäinen kierros pohjoiseen.",
  featuredImage: {
    height: 720,
    url: "https://images.example.com/kesaretki.webp",
    width: 1280,
  },
  id: 7,
  name: "Kesäretki pohjoiseen",
  slug: "kesaretki-pohjoiseen",
  stopCount: 2,
  visitCount: 3,
};

describe("TripArchiveCard", () => {
  it("keeps the card title and detail link accessible", () => {
    render(<TripArchiveCard onDetailNavigate={vi.fn()} trip={trip} />);

    expect(screen.getByRole("heading", { name: trip.name })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "tripsArchive.readMoreLabel" })).toHaveAttribute(
      "href",
      "/retki/kesaretki-pohjoiseen",
    );

    const visitBadge = screen.getByText("3 tripsArchive.visitCount").closest("span");
    expect(visitBadge).not.toBeNull();
    expect(visitBadge).toHaveClass("rounded-full", "py-1", "text-xs");
    expect(visitBadge).not.toHaveClass("min-h-11");

    const dateBadge = screen.getByText("15.-18.6.2024").closest("span");
    expect(dateBadge).not.toBeNull();
    expect(dateBadge).toHaveClass("text-primary");
    expect(dateBadge).not.toHaveClass("rounded-full");
    expect(dateBadge?.querySelector("svg")).toBeNull();
    expect(visitBadge?.querySelector("svg")).toHaveClass("lucide-calendar-range");
  });

  it("reserves the cover surface when the image fails", () => {
    const { container } = render(<TripArchiveCard onDetailNavigate={vi.fn()} trip={trip} />);
    const image = container.querySelector("img");

    expect(image).not.toBeNull();

    fireEvent.error(image as HTMLImageElement);

    expect(container.querySelector(".aspect-video")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: trip.name })).toBeInTheDocument();
  });

  it("reserves the cover surface with a placeholder when no image is selected", () => {
    const { container } = render(
      <TripArchiveCard onDetailNavigate={vi.fn()} trip={{ ...trip, featuredImage: null }} />,
    );

    expect(container.querySelector(".aspect-video")).toBeInTheDocument();
    expect(container.querySelector("svg.lucide-tent-tree")).toBeInTheDocument();
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });
});
