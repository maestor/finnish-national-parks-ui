import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ParkMap } from "./park-map";

const createMockMarker = () => ({
  setLngLat: vi.fn().mockReturnThis(),
  setPopup: vi.fn().mockReturnThis(),
  addTo: vi.fn().mockReturnThis(),
  togglePopup: vi.fn().mockReturnThis(),
  getElement: vi.fn(() => {
    const el = document.createElement("button");
    el.addEventListener = vi.fn();
    return el;
  }),
});

const createMockPopup = () => ({
  setDOMContent: vi.fn().mockReturnThis(),
  remove: vi.fn(),
});

const createMockMap = () => ({
  on: vi.fn(),
  remove: vi.fn(),
  addControl: vi.fn(),
});

vi.mock("maplibre-gl", () => ({
  default: {
    Map: vi.fn(() => createMockMap()),
    Marker: vi.fn(() => createMockMarker()),
    Popup: vi.fn(() => createMockPopup()),
    NavigationControl: vi.fn(),
  },
}));

describe("ParkMap", () => {
  it("renders map container with accessible label", () => {
    render(<ParkMap parks={[]} />);
    expect(
      screen.getByRole("application", { name: /Suomen kansallispuistojen kartta/i }),
    ).toBeInTheDocument();
  });

  it("shows loading spinner before map is loaded", () => {
    render(<ParkMap parks={[]} />);
    expect(screen.getByText(/Ladataan karttaa/i)).toBeInTheDocument();
  });

  it("displays error message when error prop is provided", () => {
    render(<ParkMap parks={[]} error="API error" />);
    expect(screen.getByText(/Karttatietojen lataus epäonnistui/i)).toBeInTheDocument();
    expect(screen.getByText("API error")).toBeInTheDocument();
  });

  it("does not show loading spinner when error is present", () => {
    render(<ParkMap parks={[]} error="API error" />);
    expect(screen.queryByText(/Ladataan karttaa/i)).not.toBeInTheDocument();
  });
});
