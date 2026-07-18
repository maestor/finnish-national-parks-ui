import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { createPwaIconResponse, PwaIcon } from "./pwa-icon";

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

describe("pwa icon", () => {
  it("renders the integrated forest and water map pin artwork", () => {
    const { container } = render(<PwaIcon />);
    const icon = container.querySelector("svg");

    expect(icon).toHaveAttribute("viewBox", "0 0 512 512");
    expect(icon).toHaveStyle({ width: "100%", height: "100%" });
    expect(icon?.querySelector("path")).toBeTruthy();
  });

  it("builds an image response at the requested size", () => {
    const response = createPwaIconResponse(192);

    expect(imageResponseMock).toHaveBeenCalledWith(expect.any(Object), {
      width: 192,
      height: 192,
    });
    expect(response).toEqual({
      element: expect.any(Object),
      options: {
        width: 192,
        height: 192,
      },
    });
  });
});
