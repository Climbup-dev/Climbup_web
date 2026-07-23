import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_ROUTE_PREFIXES = [
  "/",
  "/auth",
  "/discoveries",
  "/jobs",
  "/privacy",
  "/terms",
];

// /pyqs is now protected (needs auth)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = isPublicRoute(pathname);
  const isApiRoute = pathname.startsWith("/api/");

  // We update the session cookies first
  const response = await updateSession(request);

  // If Supabase isn't configured, bypass auth checks (failsafe)
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

  // Use getSession to avoid Edge runtime network fetch issues on local Windows
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  // 1. Enforce API Security
  if (isApiRoute) {
    console.log(`Middleware checking API Route: ${pathname}`);
    console.log(`Extracted User:`, user?.id || 'null');
    // Z+ Security: Block all unauthenticated API requests at the edge
    if (!user) {
      console.log(`Blocking unauthorized API request to ${pathname}`);
      return NextResponse.json(
        { status: "error", detail: "Unauthorized - API Access Denied" }, 
        { status: 401 }
      );
    }
    return response;
  }

  // 2. Enforce Frontend Security
  if (!isPublic && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.searchParams.set("login_required", "true");
    return NextResponse.redirect(redirectUrl);
  }

  // 3. Add Advanced Security Headers (Prevents Clickjacking, MIME sniffing, etc.)
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

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
