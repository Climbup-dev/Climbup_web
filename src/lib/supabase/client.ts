import { createBrowserClient } from "@supabase/ssr";

type BrowserClient = ReturnType<typeof createBrowserClient>;

let browserClient: BrowserClient | null = null;

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // During build/server prerender, don't crash the build.
  if (typeof window === "undefined") {
    return null as any;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "Missing Supabase environment variables:",
      {
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey,
      }
    );

    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  browserClient ??= createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  );

  return browserClient;
}