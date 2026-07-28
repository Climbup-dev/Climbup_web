import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token provided.' }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    // If client ID and secret are present, exchange refresh token with Google
    if (clientId && clientSecret) {
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
    }

    // Fallback: Return error indicating fresh login is needed
    return NextResponse.json(
      { error: 'Could not refresh Google Drive token automatically. Please reconnect Google.' },
      { status: 401 }
    );
  } catch (err: any) {
    console.error('Error refreshing Google token:', err);
    return NextResponse.json({ error: 'Failed to refresh token.' }, { status: 500 });
  }
}
