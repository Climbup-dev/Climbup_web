import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Generate a random 4-digit code e.g. #CLIMB9876
    const code = '#CLIMB' + Math.floor(1000 + Math.random() * 9000).toString();
    
    // Expires in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    // Use service role key if available to ensure reliable inserts
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Delete any existing unused codes for this user to keep DB clean
    await supabase.from('whatsapp_links').delete().eq('user_id', userId);

    const { error } = await supabase
      .from('whatsapp_links')
      .insert({
        code,
        user_id: userId,
        expires_at: expiresAt
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ code });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
