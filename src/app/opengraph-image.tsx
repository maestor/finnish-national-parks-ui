import { createSocialPreviewImageResponse } from "@/lib/social-preview-image";
import messages from "../../messages/fi.json";

export const alt =
  "Reissuvihko: tutki Suomen retkipaikkoja ja seuraa tekijöiden ulkoiluseikkailuja.";
export const size = {
  width: 1200,
  height: 1200,
};
export const contentType = "image/png";

const OpenGraphImage = () => {
  return createSocialPreviewImageResponse({
    title: messages.metadata.title,
    description: messages.metadata.description,
    variant: "square",
    width: size.width,
    height: size.height,
  });
};

export default OpenGraphImage;
