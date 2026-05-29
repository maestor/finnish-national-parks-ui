import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingSpinner } from "./loading-spinner";

describe("LoadingSpinner", () => {
  it("renders with status role", () => {
    render(<LoadingSpinner />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders label when provided", () => {
    render(<LoadingSpinner label="Ladataan..." />);

    expect(screen.getByText("Ladataan...")).toBeInTheDocument();
  });

  it("does not render label when omitted", () => {
    render(<LoadingSpinner />);

    expect(screen.queryByText(/Ladataan/)).not.toBeInTheDocument();
  });
});
