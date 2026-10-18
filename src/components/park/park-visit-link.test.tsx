import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LinkedParkSectionNavigation, LinkedParkVisitHistory } from "./park-visit-link";

const { query } = vi.hoisted(() => ({ query: { value: "" } }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query.value),
}));
vi.mock("./park-visit-history", () => ({
  ParkVisitHistory: ({ initialOpenVisitId }: { initialOpenVisitId: number | null }) => (
    <div data-testid="history">{String(initialOpenVisitId)}</div>
  ),
}));
vi.mock("@/components/navigation/sticky-section-navigation", () => ({
  StickySectionNavigation: ({ items }: { items: { id: string; initialTargetId?: string }[] }) => (
    <nav>
      {items.map((item) => (
        <a key={item.id} href={`#${item.initialTargetId ?? item.id}`}>
          {item.id}
        </a>
      ))}
    </nav>
  ),
}));

describe("park visit links in cached pages", () => {
  beforeEach(() => {
    query.value = "";
  });

  it("opens a query-selected visit and positions section navigation at that card", () => {
    query.value = "visit=10&visit=20";
    render(
      <>
        <LinkedParkVisitHistory
          visits={[]}
          parkSlug="pallas"
          title="Vierailut"
          addVisitLabel="Lisää"
          noVisitsLabel="Ei vierailuja"
        />
        <LinkedParkSectionNavigation
          ariaLabel="Osat"
          items={[
            { id: "park-location", label: "Sijainti" },
            { id: "visit-history", label: "Vierailut" },
          ]}
          visitIds={[10, 20]}
        />
      </>,
    );
    expect(screen.getByTestId("history")).toHaveTextContent("10");
    expect(screen.getByRole("link", { name: "visit-history" })).toHaveAttribute(
      "href",
      "#park-visit-10",
    );
    expect(screen.getByRole("link", { name: "park-location" })).toHaveAttribute(
      "href",
      "#park-location",
    );
  });

  it.each(["", "visit=invalid", "visit="])(
    "preserves default history without a valid visit: %s",
    (value) => {
      query.value = value;
      render(
        <LinkedParkVisitHistory
          visits={[]}
          parkSlug="pallas"
          title="Vierailut"
          addVisitLabel="Lisää"
          noVisitsLabel="Ei vierailuja"
        />,
      );
      expect(screen.getByTestId("history")).toHaveTextContent("null");
    },
  );

  it("keeps missing visits at the history section and updates selection on navigation", () => {
    query.value = "visit=99";
    const props = {
      ariaLabel: "Osat",
      items: [{ id: "visit-history", label: "Vierailut" }],
      visitIds: [10],
    };
    const { rerender } = render(<LinkedParkSectionNavigation {...props} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "#visit-history");
    query.value = "visit=10";
    rerender(<LinkedParkSectionNavigation {...props} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "#park-visit-10");
  });
});
