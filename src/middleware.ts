import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_ROUTE_PREFIXES = [
  "/",
  "/auth",
  "/discoveries",
  "/jobs",
];

// /pyqs is now protected (needs auth)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = isPublicRoute(pathname);
  const isApiRoute = pathname.startsWith("/api/");

  // We update the session cookies first
  const response = await updateSession(request);

  // If Supabase isn't configured, we just let it pass so the app doesn't hard crash locally during setup
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  // Create a minimal client to check auth state quickly
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Handled by updateSession
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 1. Enforce API Security
  if (isApiRoute) {
    // We allow upload and reactions to handle their own auth if needed, but for strictness:
    // It's safer to let individual API routes handle their exact logic using createRouteHandlerClient,
    // but if we want 100% strictness, we can block API calls here. 
    // However, some API routes might be public (like /api/public-data). 
    // For now, we will let API routes handle their own auth using createRouteHandlerClient as planned.
    return response;
  }

  // 2. Enforce Frontend Security
  if (!isPublic && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/popup"; // or wherever your login is, but you have an auth modal. 
    // Since you use an auth modal on the same page, redirecting to home is safest.
    redirectUrl.pathname = "/";
    redirectUrl.searchParams.set("login_required", "true");
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || (pathname.startsWith(`${prefix}/`) && prefix !== "/")
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
