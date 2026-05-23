import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LatestVisitEntries } from "./latest-visit-entries";

describe("LatestVisitEntries", () => {
  it("renders the newest visit entries with edit links", () => {
    render(
      <LatestVisitEntries
        title="Uusimmat käyntikirjaukset"
        emptyMessage="Ei käyntikirjauksia"
        visits={[
          {
            id: 1,
            parkName: "Pallas",
            parkSlug: "pallas",
            createdAt: "2024-06-15T10:00:00Z",
          },
        ]}
        showEditLinks
      />,
    );

    expect(screen.getByRole("heading", { name: "Uusimmat käyntikirjaukset" })).toBeInTheDocument();
    expect(screen.getByText("15.6.2024")).toBeInTheDocument();
    expect(screen.getByLabelText("controlPanel.visits.edit")).toBeInTheDocument();
  });

  it("shows an empty state without entries", () => {
    render(
      <LatestVisitEntries
        title="Uusimmat käyntikirjaukset"
        emptyMessage="Ei käyntikirjauksia"
        visits={[]}
      />,
    );

    expect(screen.getByText("Ei käyntikirjauksia")).toBeInTheDocument();
  });
});
