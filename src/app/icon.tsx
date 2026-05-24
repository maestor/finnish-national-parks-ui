import { createPwaIconResponse } from "@/lib/pwa-icon";

export const contentType = "image/png";
export const size = {
  width: 32,
  height: 32,
};

const Icon = () => createPwaIconResponse(32);

export default Icon;
