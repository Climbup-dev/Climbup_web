import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";

function getPublicOrigin(request: Request): string {
  // Render (and most reverse proxies) set x-forwarded-host and x-forwarded-proto
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto =
    request.headers.get("x-forwarded-proto") ?? "https";

  if (forwardedHost) {
    // Use the first host if comma-separated
    const host = forwardedHost.split(",")[0].trim();
    return `${forwardedProto}://${host}`;
  }

  // Fallback: env var (set in Render dashboard as NEXT_PUBLIC_SITE_URL)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  // Last resort: raw origin from request URL (works locally)
  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = getPublicOrigin(request);

  const code = searchParams.get("code");
  const oauthError =
    searchParams.get("error_description") || searchParams.get("error");
  let next = searchParams.get("next") ?? "/";

  if (!next.startsWith("/")) {
    next = "/";
  }

  // Supabase forwarded an OAuth error — redirect home with message
  if (oauthError && !code) {
    return NextResponse.redirect(
      `${origin}/?auth_error=${encodeURIComponent(oauthError)}`
    );
  }

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}?signed_in=1`);
    const supabase = createRouteHandlerClient(request, response);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.app_metadata?.provider === "email") {
        await supabase.auth.signOut();
        response.headers.set(
          "Location",
          `${origin}/?auth_error=${encodeURIComponent(
            "Email signups must use the 6-digit OTP code, not a magic link."
          )}`
        );
        return response;
      }

      return response;
    }

    // Exchange failed — redirect home with error message
    return NextResponse.redirect(
      `${origin}/?auth_error=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(`${origin}/?auth_error=auth_failed`);
}
