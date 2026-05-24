import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { PwaIcon, createPwaIconResponse } from "./pwa-icon";

const { imageResponseMock } = vi.hoisted(() => ({
  imageResponseMock: vi.fn((element: ReactElement, options: { width: number; height: number }) => ({
    element,
    options,
  })),
}));

vi.mock("next/og", () => ({
  ImageResponse: imageResponseMock,
}));

describe("pwa icon", () => {
  it("renders the forest and water map pin artwork as an svg", () => {
    const icon = PwaIcon() as ReactElement<{ children: unknown; viewBox: string }>;

    expect(icon.type).toBe("svg");
    expect(icon.props.viewBox).toBe("0 0 512 512");
    expect(icon.props.children).toBeTruthy();
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
