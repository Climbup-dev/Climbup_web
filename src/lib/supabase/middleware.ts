import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
      global: {
        fetch: (url, options) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
        },
      },
    }
  );

  try {
    // Add a 5 second timeout to prevent the Edge Function from hitting the 25s limit
    // If Supabase API hangs, we gracefully fallback and allow the request to proceed.
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Supabase auth timeout")), 5000);
    });
    
    await Promise.race([
      supabase.auth.getUser(),
      timeoutPromise
    ]);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      const message =
        error instanceof Error ? error.message : "Unknown auth refresh error";
      console.warn(`Supabase session refresh skipped: ${message}`);
    } else {
      console.warn(`Supabase session refresh skipped due to timeout or error`);
    }
  }

  return supabaseResponse;
}
