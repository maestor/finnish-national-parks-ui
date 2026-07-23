import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  createSocialPreviewImageResponse,
  SocialPreviewImage,
  type SocialPreviewVariant,
} from "./social-preview-image";

const testTitle = "Reissuvihko";
const testDescription = "Ytimekas testikuvaus sosiaalisen esikatselun tarkistamiseen.";

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

describe("social preview image", () => {
  it("renders a square preview layout with the brand illustration and copy", () => {
    render(<SocialPreviewImage title={testTitle} description={testDescription} variant="square" />);

    expect(screen.getByText(testTitle)).toBeInTheDocument();
    expect(screen.getByText(testDescription)).toBeInTheDocument();
    expect(screen.getByTestId("social-preview-icon")).toHaveAttribute("viewBox", "0 0 512 512");
  });

  it.each([
    ["square", 1200, 1200],
    ["landscape", 1200, 630],
  ] satisfies ReadonlyArray<[SocialPreviewVariant, number, number]>)(
    "builds a %s image response at the requested size",
    (variant, width, height) => {
      const response = createSocialPreviewImageResponse({
        title: testTitle,
        description: testDescription,
        variant,
        width,
        height,
      });

      expect(imageResponseMock).toHaveBeenCalledWith(expect.any(Object), {
        width,
        height,
      });
      expect(response).toEqual({
        element: expect.any(Object),
        options: {
          width,
          height,
        },
      });
    },
  );
});
