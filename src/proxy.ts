import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    const loginUrl = new URL("/erphub/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/erphub", "/erp/:path*"],
};
