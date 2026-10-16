import { createPwaIconResponse } from "@/lib/pwa-icon";

export const dynamic = "force-static";

export const GET = () => {
  return createPwaIconResponse(180);
};
