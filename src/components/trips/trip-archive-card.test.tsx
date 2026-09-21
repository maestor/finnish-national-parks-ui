import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    expect(screen.getByRole("link", { name: trip.name })).toHaveAttribute(
      "href",
      "/retki/kesaretki-pohjoiseen",
    );
    expect(screen.getByRole("link", { name: trip.name })).toHaveAttribute(
      "aria-describedby",
      "trip-archive-card-read-more-7",
    );
    expect(screen.getByText("tripsArchive.readMore")).toHaveClass("sr-only");

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

  it("shows a placeholder when the trip has no description", () => {
    render(
      <TripArchiveCard onDetailNavigate={vi.fn()} trip={{ ...trip, descriptionExcerpt: null }} />,
    );

    expect(screen.getByText("tripsArchive.descriptionPlaceholder")).toHaveClass("italic");
  });

  it("navigates when the card content is clicked", async () => {
    const onDetailNavigate = vi.fn();
    const user = userEvent.setup();
    render(<TripArchiveCard onDetailNavigate={onDetailNavigate} trip={trip} />);

    await user.click(screen.getByRole("heading", { name: trip.name }));

    expect(onDetailNavigate).toHaveBeenCalledOnce();
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

  it("keeps the placeholder instead of retrying a failed image", async () => {
    const { container } = render(<TripArchiveCard onDetailNavigate={vi.fn()} trip={trip} />);
    fireEvent.error(container.querySelector("img") as HTMLImageElement);

    await waitFor(() => {
      expect(container.querySelector("img")).not.toBeInTheDocument();
    });

    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(container.querySelector("svg.lucide-tent-tree")).toBeInTheDocument();
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
