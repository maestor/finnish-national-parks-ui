import {
  PUBLIC_HOME_SUMMARY_TAG,
  PUBLIC_MAP_SUMMARY_TAG,
  getPublicParkTag,
} from "@/lib/public-cache";
import { revalidatePath, revalidateTag } from "next/cache";

interface RevalidateRequestBody {
  parkSlug?: string | null;
}

export const POST = async (request: Request) => {
  let parkSlug: string | null = null;

  try {
    const body = (await request.json()) as RevalidateRequestBody;
    parkSlug = typeof body.parkSlug === "string" && body.parkSlug.trim() ? body.parkSlug : null;
  } catch {
    parkSlug = null;
  }

  revalidateTag(PUBLIC_HOME_SUMMARY_TAG, "max");
  revalidateTag(PUBLIC_MAP_SUMMARY_TAG, "max");
  revalidatePath("/", "page");
  revalidatePath("/parks", "page");

  if (parkSlug) {
    revalidateTag(getPublicParkTag(parkSlug), "max");
    revalidatePath(`/park/${parkSlug}`, "page");
  }

  return Response.json({
    ok: true,
    parkSlug,
  });
};
