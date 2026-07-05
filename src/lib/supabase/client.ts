// src/lib/supabase/client.ts

"use client";

import { createBrowserClient } from "@supabase/ssr";

type BrowserClient = ReturnType<typeof createBrowserClient>;

let browserClient: BrowserClient | null = null;

export function createClient(): BrowserClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase env missing. Check Vercel Environment Variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  if (!browserClient) {
    const isPopup = typeof window !== "undefined" && !!window.opener;
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        detectSessionInUrl: !isPopup,
      },
    });
  }

  return browserClient;
}