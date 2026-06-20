export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Only check that both environment variables exist.
  // Do not validate the key prefix because Supabase key formats can vary.
  return Boolean(url && key);
}

export function getAuthRedirectUrl(origin?: string): string {
  const base =
    origin ??
    (typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");

  return `${base}/auth/callback`;
}