import { createSiteIconResponse } from "@/lib/site-icon";

export const dynamic = "force-static";

export const GET = () => {
  return createSiteIconResponse(32);
};
