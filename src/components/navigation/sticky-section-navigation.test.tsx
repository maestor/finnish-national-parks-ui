import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  StickySectionNavigation,
  type StickySectionNavigationItem,
} from "./sticky-section-navigation";

const items: StickySectionNavigationItem[] = [
  {
    id: "first-section",
    label: "First",
  },
  {
    id: "second-section",
    label: "Second",
  },
];

describe("StickySectionNavigation", () => {
  it("does not render a navigation when there is only one section", () => {
    const onHeightChange = vi.fn();

    render(
      <StickySectionNavigation
        ariaLabel="Page sections"
        items={[items[0]]}
        onHeightChange={onHeightChange}
      />,
    );

    expect(screen.queryByRole("navigation", { name: "Page sections" })).not.toBeInTheDocument();
    expect(onHeightChange).toHaveBeenCalledWith(0);
  });

  it("renders links even before matching section elements exist in the page", () => {
    render(<StickySectionNavigation ariaLabel="Page sections" items={items} />);

    const navigation = screen.getByRole("navigation", { name: "Page sections" });

    expect(navigation).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "First" })).toHaveAttribute("href", "#first-section");
    expect(screen.getByRole("link", { name: "Second" })).toHaveAttribute("href", "#second-section");
  });
});
