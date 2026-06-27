import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { createRouteHandlerClient } from "@/lib/supabase/server";

function getPublicOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost.split(",")[0].trim()}`;
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  return new URL(request.url).origin;
}

function popupUrl(origin: string, status: "success" | "error", message?: string) {
  const url = new URL("/auth/popup", origin);
  url.searchParams.set("status", status);
  if (message) url.searchParams.set("message", message);
  return url;
}

function getMetadataName(user: User): string {
  const fullName = user.user_metadata?.full_name;
  const name = user.user_metadata?.name;

  if (typeof fullName === "string" && fullName.trim()) {
    return fullName.trim();
  }

  if (typeof name === "string" && name.trim()) {
    return name.trim();
  }

  return user.email?.split("@")[0] || "ClimbUP member";
}

function getMetadataImage(user: User): string | null {
  const avatarUrl = user.user_metadata?.avatar_url;
  const picture = user.user_metadata?.picture;

  if (typeof avatarUrl === "string" && avatarUrl.trim()) {
    return avatarUrl.trim();
  }

  if (typeof picture === "string" && picture.trim()) {
    return picture.trim();
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = getPublicOrigin(request);
  const code = searchParams.get("code");
  const oauthError =
    searchParams.get("error_description") || searchParams.get("error");

  // Google OAuth is popup-only. Never render the home page in this window.
  if (oauthError || !code) {
    return NextResponse.redirect(
      popupUrl(origin, "error", oauthError || "Google sign-in failed.")
    );
  }

  const response = NextResponse.redirect(popupUrl(origin, "success"));
  const supabase = createRouteHandlerClient(request, response);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(popupUrl(origin, "error", error.message));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.app_metadata?.provider === "email") {
    await supabase.auth.signOut();
    response.headers.set(
      "Location",
      popupUrl(
        origin,
        "error",
        "Email signups must use the 6-digit OTP code, not a magic link."
      ).toString()
    );
  } else if (user?.app_metadata?.provider === "google") {
    await supabase.from("users").upsert(
      {
        user_id: user.id,
        full_name: getMetadataName(user),
        email: user.email || "",
        profile_image: getMetadataImage(user),
        reputation: 0,
      },
      { onConflict: "user_id" }
    );
  }

  return response;
}
