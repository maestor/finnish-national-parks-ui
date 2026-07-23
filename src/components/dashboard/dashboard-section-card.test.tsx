import { render, screen } from "@testing-library/react";
import { Mountain } from "lucide-react";
import { describe, expect, it } from "vitest";
import { DashboardSectionCard } from "./dashboard-section-card";

describe("DashboardSectionCard", () => {
  it("renders the heading, content, and optional footer", () => {
    render(
      <DashboardSectionCard
        title="Kortti"
        titleId="dashboard-card-title"
        icon={Mountain}
        footer={<a href="#home-top">Takaisin alkuun</a>}
      >
        <p>Sisalto</p>
      </DashboardSectionCard>,
    );

    expect(screen.getByRole("heading", { name: "Kortti" })).toBeInTheDocument();
    expect(screen.getByText("Sisalto")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Takaisin alkuun" })).toHaveAttribute(
      "href",
      "#home-top",
    );
  });

  it("does not render a footer wrapper when no footer is provided", () => {
    render(
      <DashboardSectionCard title="Kortti" titleId="dashboard-card-title" icon={Mountain}>
        <p>Sisalto</p>
      </DashboardSectionCard>,
    );

    expect(screen.getByText("Sisalto")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Takaisin alkuun" })).not.toBeInTheDocument();
  });
});
