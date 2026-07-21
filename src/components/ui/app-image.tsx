import Image, { type ImageProps } from "next/image";

// Central wrapper so every product image goes through next/image optimization
// (allowed origins live in next.config.ts `images.remotePatterns`).
export const AppImage = (props: Omit<ImageProps, "loader">) => <Image {...props} />;
