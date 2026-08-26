import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function proxy(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const pathname = request.nextUrl.pathname;

  const isProtectedPage = pathname === "/";

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register";

  if (isProtectedPage && !token) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(
      new URL("/", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
  ],
};