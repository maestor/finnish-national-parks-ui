import { type NextRequest, NextResponse } from "next/server";
import { appRoutes } from "./lib/routes";
import { getSessionCookieName, verifySessionToken } from "./lib/session-auth";

export const config = {
  matcher: ["/hallinta/:path*", "/control-panel/:path*"],
};

export const proxy = async (request: NextRequest) => {
  const token = request.cookies.get(getSessionCookieName())?.value;
  const payload = token ? await verifySessionToken(token) : null;

  if (!payload) {
    return NextResponse.redirect(new URL(appRoutes.login, request.url));
  }

  return NextResponse.next();
};
