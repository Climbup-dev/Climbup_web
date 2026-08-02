import { createClient } from "@/lib/supabase/client";

/**
 * A central wrapper around `fetch` that automatically:
 * 1. Prepends the NEXT_PUBLIC_PYTHON_BACKEND_URL.
 * 2. Fetches the current user's Supabase session.
 * 3. Injects the `Authorization: Bearer <access_token>` header securely.
 */
export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  // Use the env variable, fallback to localhost if not found during dev
  const baseUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8000";
  
  // Ensure the endpoint starts with a slash
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  // Get the auth token securely from the client-side session
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers = new Headers(options.headers || {});
  
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  
  // Default to JSON if not uploading form-data
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.message) errorMsg = errorData.message;
      else if (errorData.detail) errorMsg = errorData.detail;
    } catch {
      // Ignore if not json
    }
    throw new Error(errorMsg);
  }

  return response.json();
}
