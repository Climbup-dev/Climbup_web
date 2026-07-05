import { createServerClient } from "@supabase/ssr";
import type { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/config";

allowLocalSupabaseTlsInspection();

export async function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — cookie writes may fail; middleware handles refresh
          }
        },
      },
    }
  );
}

export function createAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  // Uses the service role key to bypass RLS for server-side trusted operations
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      }
    }
  );
}

function allowLocalSupabaseTlsInspection() {
  if (
    process.env.NODE_ENV === "development" &&
    process.env.CLIMBUP_STRICT_SUPABASE_TLS !== "true"
  ) {
    // Intercept the process warning to prevent Next.js from throwing an error overlay
    const originalEmitWarning = process.emitWarning;
    process.emitWarning = (warning, ...args) => {
      if (
        typeof warning === "string" &&
        warning.includes("NODE_TLS_REJECT_UNAUTHORIZED")
      ) {
        return;
      }
      // @ts-expect-error Next.js overrides emitWarning which confuses TS overloads
      return originalEmitWarning(warning, ...args);
    };

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
}

export function createRouteHandlerClient(
  request: Request,
  response: NextResponse
) {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const header = request.headers.get("cookie") ?? "";
          return header
            .split(";")
            .map((part) => {
              const [name, ...rest] = part.trim().split("=");
              if (!name) return null;
              return { name, value: rest.join("=") };
            })
            .filter((c): c is { name: string; value: string } => c !== null);
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );
}
