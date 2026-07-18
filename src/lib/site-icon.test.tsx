import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { createSiteIconResponse, SiteIcon } from "./site-icon";

const { imageResponseMock } = vi.hoisted(() => ({
  // biome-ignore lint: Vitest v4 constructor mocks must be constructible.
  imageResponseMock: vi.fn(function (
    element: ReactElement,
    options: { width: number; height: number },
  ) {
    return {
      element,
      options,
    };
  }),
}));

vi.mock("next/og", () => ({
  ImageResponse: imageResponseMock,
}));

describe("site icon", () => {
  it("renders the favicon-style artwork full-bleed for tiny icon consumers", () => {
    const { container } = render(<SiteIcon />);
    const icon = container.querySelector("svg");

    expect(icon).toHaveAttribute("viewBox", "0 0 64 64");
    expect(icon).toHaveStyle({ width: "100%", height: "100%" });
  });

  it("builds an image response at the requested size", () => {
    const response = createSiteIconResponse(32);

    expect(imageResponseMock).toHaveBeenCalledWith(expect.any(Object), {
      width: 32,
      height: 32,
    });
    expect(response).toEqual({
      element: expect.any(Object),
      options: {
        width: 32,
        height: 32,
      },
    });
  });
});
