import Image, { type ImageProps } from "next/image";

// Central wrapper so every product image goes through next/image optimization
// (allowed origins live in next.config.ts `images.remotePatterns`).
interface AppImageProps extends Omit<ImageProps, "loader"> {
  privateMedia?: boolean;
}

export const AppImage = ({ privateMedia = false, unoptimized, ...props }: AppImageProps) => (
  <Image {...props} unoptimized={privateMedia || unoptimized} />
);
