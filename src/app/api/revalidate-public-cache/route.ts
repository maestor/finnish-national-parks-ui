import { ADMIN_PARK_VISIBILITY_TAG } from "@/lib/admin-cache";
import {
  PUBLIC_HOME_SUMMARY_TAG,
  PUBLIC_MAP_SUMMARY_TAG,
  PUBLIC_VISITS_TAG,
  getPublicParkTag,
} from "@/lib/public-cache";
import { jwtVerify } from "jose";
import { revalidatePath, revalidateTag } from "next/cache";

interface RevalidateRequestBody {
  parkSlug?: string | null;
}

const readCookieValue = (cookieHeader: string | null, cookieName: string): string | null => {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const trimmedPart = part.trim();
    if (trimmedPart.startsWith(`${cookieName}=`)) {
      return decodeURIComponent(trimmedPart.slice(cookieName.length + 1));
    }
  }

  return null;
};

const isAuthorizedRevalidationRequest = async (request: Request): Promise<boolean> => {
  const cookieName = process.env.AUTH_COOKIE_NAME || "__session";
  const secret = process.env.AUTH_JWT_SECRET;
  const token = readCookieValue(request.headers.get("cookie"), cookieName);

  if (!secret || !token) {
    return false;
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    return true;
  } catch {
    return false;
  }
};

export const POST = async (request: Request) => {
  if (!(await isAuthorizedRevalidationRequest(request))) {
    return Response.json(
      {
        ok: false,
        error: "Unauthorized",
      },
      { status: 401 },
    );
  }

  let parkSlug: string | null = null;

  try {
    const body = (await request.json()) as RevalidateRequestBody;
    parkSlug = typeof body.parkSlug === "string" && body.parkSlug.trim() ? body.parkSlug : null;
  } catch {
    parkSlug = null;
  }

  revalidateTag(PUBLIC_HOME_SUMMARY_TAG, "max");
  revalidateTag(PUBLIC_MAP_SUMMARY_TAG, "max");
  revalidateTag(PUBLIC_VISITS_TAG, "max");
  revalidateTag(ADMIN_PARK_VISIBILITY_TAG, "max");
  revalidatePath("/", "page");
  revalidatePath("/parks", "page");
  revalidatePath("/visits", "page");
  revalidatePath("/control-panel/parks", "page");

  if (parkSlug) {
    revalidateTag(getPublicParkTag(parkSlug), "max");
    revalidatePath(`/park/${parkSlug}`, "page");
  }

  return Response.json({
    ok: true,
    parkSlug,
  });
};
