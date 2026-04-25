import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";

const protectedPaths = ["/metro", "/checkout", "/success", "/profile"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admin protection
  if (
    pathname === "/control" ||
    pathname.startsWith("/control/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  ) {
    if (pathname === "/control/login" || pathname === "/admin/login") return NextResponse.next();
    const cookie = req.cookies.get(adminCookieName())?.value;
    if (cookie) {
      try {
        const ok = await verifyAdminSession(cookie);
        if (ok) return NextResponse.next();
      } catch {
        // fallthrough
      }
    }
    const adminLogin = new URL("/control/login", req.url);
    adminLogin.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    adminLogin.searchParams.set("reason", "unauthorized");
    return NextResponse.redirect(adminLogin);
  }

  const isProtected =
    protectedPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith("/metro/");

  if (!isProtected) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token) return NextResponse.next();

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/metro/:path*",
    "/checkout/:path*",
    "/success/:path*",
    "/profile/:path*",
    "/admin",
    "/admin/:path*",
    "/control",
    "/control/:path*",
  ],
};

