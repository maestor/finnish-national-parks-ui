import { createSocialPreviewImageResponse } from "@/lib/social-preview-image";
import messages from "../../messages/fi.json";

export const alt =
  "Reissuvihko: tutki Suomen retkipaikkoja ja seuraa tekijöiden ulkoiluseikkailuja.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const TwitterImage = () => {
  return createSocialPreviewImageResponse({
    title: messages.metadata.title,
    description: messages.metadata.description,
    variant: "landscape",
    width: size.width,
    height: size.height,
  });
};

export default TwitterImage;
