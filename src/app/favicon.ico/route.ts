import { NextResponse } from "next/server";

export const GET = async (request: Request) =>
  NextResponse.redirect(new URL("/icons/favicon-32x32.png", request.url), 308);
