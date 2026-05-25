import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import { AppIconArtwork } from "./app-icon-artwork";

export const PwaIcon = (): ReactElement => {
  return <AppIconArtwork />;
};

export const createPwaIconResponse = (size: number): ImageResponse => {
  return new ImageResponse(<PwaIcon />, {
    width: size,
    height: size,
  });
};
