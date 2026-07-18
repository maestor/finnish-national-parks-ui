import { jwtVerify } from "jose";
import { type NextRequest, NextResponse } from "next/server";
import { appRoutes } from "./lib/routes";

export const config = {
  matcher: ["/hallinta/:path*", "/control-panel/:path*"],
};

export const proxy = async (request: NextRequest) => {
  const token = request.cookies.get(process.env.AUTH_COOKIE_NAME || "__session")?.value;
  const secret = process.env.AUTH_JWT_SECRET;

  if (!token || !secret) {
    return NextResponse.redirect(new URL(appRoutes.login, request.url));
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL(appRoutes.login, request.url));
  }
};
