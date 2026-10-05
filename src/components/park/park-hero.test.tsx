import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ParkHero } from "./park-hero";

const image = { fullUrl: "https://example.com/cover.jpg" };
describe("ParkHero", () => {
  it("keeps the original hero when no photo is selected", () => {
    render(
      <ParkHero featuredImage={null}>
        <h1>Paikka</h1>
      </ParkHero>,
    );
    expect(screen.getByRole("heading", { name: "Paikka" })).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByRole("heading").closest("section")).toHaveClass("theme-panel");
  });
  it("displays a decorative cover and restores the fallback when it fails", () => {
    const { rerender } = render(
      <ParkHero featuredImage={image}>
        <h1>Paikka</h1>
      </ParkHero>,
    );
    const cover = document.querySelector("img") as HTMLImageElement;
    expect(cover).toHaveAttribute("src", image.fullUrl);
    expect(cover).toHaveAttribute("alt", "");
    expect(cover).toHaveAttribute("loading", "eager");
    fireEvent.error(cover);
    expect(document.querySelector("img")).toBeNull();
    rerender(
      <ParkHero featuredImage={{ fullUrl: "https://example.com/new.jpg" }}>
        <h1>Paikka</h1>
      </ParkHero>,
    );
    expect(document.querySelector("img")).toHaveAttribute("src", "https://example.com/new.jpg");
  });
});
