import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppImage } from "./app-image";

const { nextImageMock } = vi.hoisted(() => ({
  nextImageMock: vi.fn((_: Record<string, unknown>) => null),
}));

vi.mock("next/image", () => ({
  default: nextImageMock,
}));

describe("AppImage", () => {
  it("renders next/image without a custom loader function", () => {
    render(
      <AppImage
        src="https://example.com/logo.png"
        alt="Laajalahden luonnonsuojelualue"
        width={192}
        height={112}
      />,
    );

    expect(nextImageMock).toHaveBeenCalledTimes(1);

    const imageProps = nextImageMock.mock.calls[0]?.[0] as
      | {
          alt?: string;
          height?: number;
          loader?: unknown;
          src?: string;
          unoptimized?: boolean;
          width?: number;
        }
      | undefined;

    expect(imageProps).toMatchObject({
      alt: "Laajalahden luonnonsuojelualue",
      height: 112,
      src: "https://example.com/logo.png",
      width: 192,
    });
    expect(imageProps?.unoptimized).toBeUndefined();
    expect(imageProps?.loader).toBeUndefined();
  });
});
