import { createSiteIconResponse } from "@/lib/site-icon";

export const GET = () => {
  return createSiteIconResponse(32);
};
