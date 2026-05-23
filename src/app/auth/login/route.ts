import { env } from "@/lib/env";
import { NextResponse } from "next/server";

export const GET = async () => {
  return NextResponse.redirect(`${env.NEXT_PUBLIC_API_URL}/auth/google`);
};
