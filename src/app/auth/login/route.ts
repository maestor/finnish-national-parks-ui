import { NextResponse } from "next/server";
import { normalizePostLoginRedirectPath } from "@/lib/post-login-redirect";

export const GET = async (request: Request) => {
  const googleUrl = new URL("/auth/google", request.url);
  const returnPath = normalizePostLoginRedirectPath(
    new URL(request.url).searchParams.get("returnTo"),
  );
  if (returnPath) {
    googleUrl.searchParams.set("returnTo", returnPath);
  }
  const response = NextResponse.redirect(googleUrl);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
};
