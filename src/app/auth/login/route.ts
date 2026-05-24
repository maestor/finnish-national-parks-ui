import { NextResponse } from "next/server";

export const GET = async (request: Request) =>
  NextResponse.redirect(new URL("/auth/google", request.url));
