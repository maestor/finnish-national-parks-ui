import Image, { type ImageLoaderProps, type ImageProps } from "next/image";

const passthroughImageLoader = ({ src }: ImageLoaderProps) => src;

export const AppImage = (props: Omit<ImageProps, "loader">) => (
  <Image unoptimized loader={passthroughImageLoader} {...props} />
);
