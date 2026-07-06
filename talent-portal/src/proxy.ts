import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const PROTECTED_ROUTES = ["/dashboard", "/reports", "/admin", "/assessment"];

// Routes accessible only by specific roles
const ROLE_ROUTES: Record<string, string[]> = {
  "/admin": ["ADMIN"],
  "/reports": ["HR", "ADMIN"],
};

export async function proxy(request: NextRequest) {
  const session = await auth();
  const pathname = request.nextUrl.pathname;

  // Redirect to login if not authenticated and accessing protected routes
  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtected && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check role-based access
  if (session) {
    const userRole = session.user.role as string;
    for (const [route, allowedRoles] of Object.entries(ROLE_ROUTES)) {
      if (pathname.startsWith(route) && !allowedRoles.includes(userRole)) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    // Redirect authenticated users away from login
    if (pathname === "/login" || pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|logo|public).*)",
  ],
};
