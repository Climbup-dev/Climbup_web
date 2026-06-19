export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      url.startsWith("https://") &&
      key !== "YOUR_ANON_KEY_HERE" &&
      (key.startsWith("eyJ") || key.startsWith("sb_"))
  );
}

export function getAuthRedirectUrl(origin?: string): string {
  const base =
    origin ??
    (typeof window !== "undefined" 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
  return `${base}/auth/callback`;
}
