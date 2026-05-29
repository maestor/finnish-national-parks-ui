import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThreeDotPulse } from "./three-dot-pulse";

describe("ThreeDotPulse", () => {
  it("renders three dots", () => {
    const { container } = render(<ThreeDotPulse />);

    const dots = container.querySelectorAll("span > span");

    expect(dots).toHaveLength(3);
  });

  it("is hidden from screen readers", () => {
    const { container } = render(<ThreeDotPulse />);

    expect(container.querySelector("[aria-hidden='true']")).toBeInTheDocument();
  });
});
