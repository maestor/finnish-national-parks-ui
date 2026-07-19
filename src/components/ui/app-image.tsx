import Image, { type ImageProps } from "next/image";

export const AppImage = (props: Omit<ImageProps, "loader">) => <Image unoptimized {...props} />;
