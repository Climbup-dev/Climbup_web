import { NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB
// Strictly raster image types (SVG removed to prevent Stored XSS attacks)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: Request) {
  try {
    // 1. Rate Limiting (20 uploads/minute per IP)
    const clientIp = getClientIp(request);
    const rl = checkRateLimit(`upload:${clientIp}`, { maxRequests: 20, windowMs: 60000 });
    if (!rl.success) {
      return rateLimitResponse(rl.resetMs);
    }

    // 2. Server-side Authentication Verification
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized. Authentication required to upload files.' },
          { status: 401 }
        );
      }
    } catch (authErr) {
      console.warn('[Upload Auth Warning]: Supabase client unavailable or error:', authErr);
      return NextResponse.json(
        { error: 'Authentication verification failed.' },
        { status: 401 }
      );
    }

    // 3. Parse and validate multipart form
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const mimeType = (file.type || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Only JPEG, PNG, WebP, and GIF images are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds maximum allowed limit of 8 MB.' },
        { status: 413 }
      );
    }

    // 4. Convert file safely
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = `data:${mimeType};base64,${buffer.toString('base64')}`;

    return NextResponse.json({
      url: base64Image,
      public_id: `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    });
  } catch (error) {
    console.error('Error processing image upload:', error);
    return NextResponse.json(
      { error: 'Failed to process uploaded file' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    // Authenticate delete request
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete route:', error);
    return NextResponse.json(
      { error: 'Failed to process delete operation' },
      { status: 500 }
    );
  }
}
