import { revalidatePath, revalidateTag } from "next/cache";
import { ADMIN_PARK_VISIBILITY_TAG } from "@/lib/admin-cache";
import {
  getPublicParkTag,
  getPublicTripTag,
  HOME_SUMMARY_TAG,
  MAP_SUMMARY_TAG,
  PUBLIC_TRIPS_TAG,
  PUBLIC_VISITS_TAG,
} from "@/lib/public-cache";
import { isSameOriginMutationRequest } from "@/lib/request-origin";
import { appRoutes } from "@/lib/routes";
import { isAdminSession, readSessionToken, verifySessionToken } from "@/lib/session-auth";

interface RevalidateRequestBody {
  // Older callers may still send this; publication changes always expire now.
  expireImmediately?: boolean;
  parkSlug?: string | null;
  tripSlug?: string | null;
}

export const POST = async (request: Request) => {
  const token = readSessionToken(request.headers.get("cookie"));
  const payload = token ? await verifySessionToken(token) : null;

  if (!payload) {
    return Response.json(
      {
        ok: false,
        error: "Unauthorized",
      },
      { status: 401 },
    );
  }

  if (!isAdminSession(payload)) {
    return Response.json(
      {
        ok: false,
        error: "Forbidden",
      },
      { status: 403 },
    );
  }

  if (!isSameOriginMutationRequest(request)) {
    return Response.json(
      {
        ok: false,
        error: "Forbidden",
      },
      { status: 403 },
    );
  }

  let parkSlug: string | null = null;
  let tripSlug: string | null = null;

  try {
    const body = (await request.json()) as RevalidateRequestBody;
    parkSlug = typeof body.parkSlug === "string" && body.parkSlug.trim() ? body.parkSlug : null;
    tripSlug = typeof body.tripSlug === "string" && body.tripSlug.trim() ? body.tripSlug : null;
  } catch {
    parkSlug = null;
    tripSlug = null;
  }

  // Stale JSON must not repopulate a freshly invalidated HTML route after a
  // withdrawal or visibility change. Apply immediate expiry to every mutation.
  const profile = { expire: 0 };
  revalidateTag(HOME_SUMMARY_TAG, profile);
  revalidateTag(MAP_SUMMARY_TAG, profile);
  revalidateTag(PUBLIC_TRIPS_TAG, profile);
  revalidateTag(PUBLIC_VISITS_TAG, profile);
  revalidateTag(ADMIN_PARK_VISIBILITY_TAG, profile);
  revalidatePath(appRoutes.home, "page");
  revalidatePath(appRoutes.parks, "page");
  revalidatePath(appRoutes.trips, "page");
  revalidatePath(appRoutes.visits, "page");
  revalidatePath("/sitemap.xml");
  revalidatePath(appRoutes.controlPanel.parks, "page");

  if (parkSlug) {
    revalidateTag(getPublicParkTag(parkSlug), profile);
    revalidatePath(appRoutes.park(parkSlug), "page");
  }

  if (tripSlug) {
    revalidateTag(getPublicTripTag(tripSlug), profile);
    revalidatePath(appRoutes.trip(tripSlug), "page");
  }

  return Response.json({
    ok: true,
    parkSlug,
    tripSlug,
  });
};
