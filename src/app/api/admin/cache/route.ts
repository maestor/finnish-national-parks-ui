import { revalidatePath, revalidateTag } from "next/cache";
import { ADMIN_PARK_VISIBILITY_TAG } from "@/lib/admin-cache";
import { proxyBackendRequest } from "@/lib/backend-proxy";
import {
  HOME_SUMMARY_TAG,
  MAP_SUMMARY_TAG,
  PUBLIC_PARK_DETAILS_TAG,
  PUBLIC_TRIP_DETAILS_TAG,
  PUBLIC_TRIPS_TAG,
  PUBLIC_VISITS_TAG,
} from "@/lib/public-cache";
import { isSameOriginMutationRequest } from "@/lib/request-origin";
import { isAdminSession, readSessionToken, verifySessionToken } from "@/lib/session-auth";

const scopes = ["home", "map", "visits", "parks", "trips", "all"] as const;
type Scope = (typeof scopes)[number];

export const POST = async (request: Request) => {
  const token = readSessionToken(request.headers.get("cookie"));
  const session = token ? await verifySessionToken(token) : null;
  if (!isAdminSession(session)) return Response.json({ ok: false }, { status: 401 });
  if (!isSameOriginMutationRequest(request)) return Response.json({ ok: false }, { status: 403 });

  const identityRequest = new Request(request.url, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
  });
  const identity = await proxyBackendRequest(identityRequest, "/auth/me", {
    requireAdmin: true,
  }).catch(() => null);
  if (!identity) return Response.json({ ok: false }, { status: 503 });
  if (!identity.ok)
    return Response.json({ ok: false }, { status: identity.status === 401 ? 401 : 503 });
  const user: unknown = await identity.json().catch(() => null);
  if (!user || typeof user !== "object" || !("isSuperAdmin" in user) || user.isSuperAdmin !== true)
    return Response.json({ ok: false }, { status: 403 });

  const body: unknown = await request.json().catch(() => null);
  if (
    !body ||
    typeof body !== "object" ||
    !("scope" in body) ||
    typeof body.scope !== "string" ||
    !scopes.includes(body.scope as Scope)
  )
    return Response.json({ ok: false }, { status: 400 });
  const scope = body.scope as Scope;
  const includes = (name: Scope) => scope === "all" || scope === name;
  const profile = { expire: 0 };
  if (includes("home")) {
    revalidateTag(HOME_SUMMARY_TAG, profile);
    revalidatePath("/", "page");
  }
  if (includes("map")) {
    revalidateTag(MAP_SUMMARY_TAG, profile);
    revalidateTag(ADMIN_PARK_VISIBILITY_TAG, profile);
    revalidatePath("/paikat", "page");
    revalidatePath("/reissusuunnittelu", "page");
    revalidatePath("/hallinta/paikat", "page");
    revalidatePath("/sitemap.xml");
  }
  if (includes("visits")) {
    revalidateTag(PUBLIC_VISITS_TAG, profile);
    revalidatePath("/kaynnit", "page");
  }
  if (includes("parks")) {
    revalidateTag(PUBLIC_PARK_DETAILS_TAG, profile);
    revalidatePath("/paikka/[slug]", "page");
  }
  if (includes("trips")) {
    revalidateTag(PUBLIC_TRIPS_TAG, profile);
    revalidateTag(PUBLIC_TRIP_DETAILS_TAG, profile);
    revalidatePath("/retket", "page");
    revalidatePath("/retki/[slug]", "page");
    revalidatePath("/sitemap.xml");
  }
  return Response.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
};
