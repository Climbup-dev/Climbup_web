import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTE_PREFIXES = [
  "/",
  "/auth",
  "/courses",
  "/privacy",
  "/terms",
  "/uploads",
];

// /pyqs is now protected (needs auth)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = isPublicRoute(pathname);
  const isApiRoute = pathname.startsWith("/api/");

  // For health checks, file upload and video stream routes, bypass edge auth check
  if (
    pathname === "/api/health" ||
    pathname.startsWith("/api/drive-upload") ||
    pathname.startsWith("/api/lessons/") ||
    pathname.startsWith("/api/assignments/") ||
    pathname.startsWith("/api/stream/") ||
    pathname.startsWith("/api/live") ||
    pathname.includes("/stream")
  ) {
    return NextResponse.next();
  }

  // 1. Single pass: update session cookies and verify user securely
  const { response, user } = await updateSession(request);

  // If Supabase isn't configured, bypass auth checks (failsafe)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  // 2. Enforce API Security
  if (isApiRoute) {
    if (!user) {
      const errorResponse = NextResponse.json(
        { status: "error", detail: "Unauthorized - API Access Denied" }, 
        { status: 401 }
      );
      // Preserve refreshed cookies on error response
      response.cookies.getAll().forEach((c) => {
        errorResponse.cookies.set(c);
      });
      return errorResponse;
    }
    return response;
  }

  // 3. Enforce Frontend Security
  if (!isPublic && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.searchParams.set("login_required", "true");
    const redirectResponse = NextResponse.redirect(redirectUrl);
    // Preserve refreshed cookies on redirect response
    response.cookies.getAll().forEach((c) => {
      redirectResponse.cookies.set(c);
    });
    return redirectResponse;
  }

  // 4. Add Advanced Security Headers (Clickjacking, MIME sniffing, HSTS, Permissions)
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
}

function isPublicRoute(pathname: string) {
  // Individual course classrooms (/courses/[courseId]) require authentication
  if (pathname.startsWith("/courses/") && pathname !== "/courses") {
    return false;
  }
  return PUBLIC_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || (pathname.startsWith(`${prefix}/`) && prefix !== "/")
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|ogg|mov|m4v)$).*)",
  ],
};
