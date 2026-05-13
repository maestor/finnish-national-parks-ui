import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressSection } from "./progress-section";

describe("ProgressSection", () => {
  it("renders progress bars for each park type", () => {
    render(
      <ProgressSection
        items={[
          { typeName: "Kansallispuisto", visited: 3, total: 10 },
          { typeName: "Erämaa-alue", visited: 1, total: 5 },
        ]}
      />,
    );

    expect(screen.getByText("Kansallispuisto")).toBeInTheDocument();
    expect(screen.getByText("Erämaa-alue")).toBeInTheDocument();
  });

  it("renders nothing when items is empty", () => {
    const { container } = render(<ProgressSection items={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
