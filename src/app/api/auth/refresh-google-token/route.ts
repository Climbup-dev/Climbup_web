import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting (10 token refreshes per minute per IP)
    const clientIp = getClientIp(req);
    const rl = checkRateLimit(`refresh-google:${clientIp}`, { maxRequests: 10, windowMs: 60000 });
    if (!rl.success) {
      return rateLimitResponse(rl.resetMs);
    }

    // 2. Server-side user authentication check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Authentication required.' }, { status: 401 });
    }

    const { refreshToken } = await req.json();

    if (!refreshToken || typeof refreshToken !== 'string') {
      return NextResponse.json({ error: 'Valid refresh token is required.' }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Google OAuth configuration missing on server.' },
        { status: 500 }
      );
    }

    // Exchange refresh token with Google OAuth
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({ accessToken: data.access_token });
    }

    return NextResponse.json(
      { error: 'Could not refresh Google token. Please reconnect your account.' },
      { status: 401 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error refreshing Google token:', errorMsg);
    return NextResponse.json({ error: 'Failed to refresh token.' }, { status: 500 });
  }
}
