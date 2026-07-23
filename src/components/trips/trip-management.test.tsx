import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Trip } from "@/lib/trips";
import { TripManagement } from "./trip-management";

const trips = [
  {
    id: 7,
    name: "Keski-Suomen kesaretki",
    slug: "keski-suomen-kesaretki",
    description: "Kolmen paivan kierros kansallispuistoihin.",
    startingPoint: null,
    visitCount: 2,
    dateRange: {
      start: "2024-06-15",
      end: "2024-06-17",
    },
    createdAt: "2024-06-18T00:00:00Z",
    updatedAt: "2024-06-18T00:00:00Z",
  },
  {
    id: 8,
    name: "Syysloman rengasreitti",
    slug: "syysloman-rengasreitti",
    description: null,
    startingPoint: {
      coordinate: { lat: 61.9241, lon: 25.7482 },
      label: "Jyvaskyla",
    },
    visitCount: 1,
    dateRange: {
      start: "2023-10-10",
      end: "2023-10-10",
    },
    createdAt: "2023-10-11T00:00:00Z",
    updatedAt: "2023-10-11T00:00:00Z",
  },
] satisfies Trip[];

describe("TripManagement", () => {
  it("renders linked trip names and compact edit actions", () => {
    render(<TripManagement trips={trips} />);

    expect(screen.getByRole("link", { name: "Keski-Suomen kesaretki" })).toHaveAttribute(
      "href",
      "/hallinta/retket/7/muokkaa",
    );
    expect(
      screen.queryByRole("columnheader", { name: "controlPanel.trips.list.description" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "controlPanel.trips.list.actions" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "controlPanel.trips.list.edit" })[0],
    ).toHaveAttribute("href", "/hallinta/retket/7/muokkaa");
    expect(
      screen.queryByRole("button", { name: "controlPanel.trips.list.delete" }),
    ).not.toBeInTheDocument();
  });

  it("filters trips by visible table content", async () => {
    render(<TripManagement trips={trips} />);

    await userEvent.type(
      screen.getByLabelText("controlPanel.trips.list.filters.searchLabel"),
      "syys",
    );

    expect(screen.queryByText("Keski-Suomen kesaretki")).not.toBeInTheDocument();
    expect(screen.getByText("Syysloman rengasreitti")).toBeInTheDocument();
  });

  it("does not match trips by hidden descriptions", async () => {
    render(<TripManagement trips={trips} />);

    await userEvent.type(
      screen.getByLabelText("controlPanel.trips.list.filters.searchLabel"),
      "kansallispuistoihin",
    );

    expect(screen.queryByText("Keski-Suomen kesaretki")).not.toBeInTheDocument();
    expect(screen.getByText("controlPanel.trips.list.emptyFiltered")).toBeInTheDocument();
  });
});
