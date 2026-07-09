import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Bypass SSL verification globally for this route (useful for self-signed or unverified Render certificates)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const { questionId } = await params;
    const body = await request.json();
    
    if (!body.question) {
      return NextResponse.json({ error: 'Question content is required' }, { status: 400 });
    }

    // Use environment variable if available, otherwise fallback to the hardcoded URL
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || "https://bacend-climbup.onrender.com";
    const targetUrl = `${pythonBackendUrl}/api/generate-only`;

    // Forward auth headers
    let authHeader = request.headers.get('authorization') || '';
    const cookieHeader = request.headers.get('cookie') || '';

    if (!authHeader) {
      const supabase = await createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        authHeader = `Bearer ${session.access_token}`;
      }
    }

    console.log("Sending request to Python Backend. AuthHeader present?", !!authHeader, "Token snippet:", authHeader ? authHeader.substring(0, 15) + "..." : "NONE");

    // Securely forward the request from the server
    const generateResponse = await fetch(targetUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(authHeader ? { "Authorization": authHeader } : {}),
        ...(cookieHeader ? { "Cookie": cookieHeader } : {})
      },
      body: JSON.stringify({ 
        question: body.question,
        marks: body.marks || 5
      })
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      console.error("Python backend error:", errorText);
      return NextResponse.json({ error: 'Failed to generate answer from Python backend' }, { status: generateResponse.status });
    }

    const data = await generateResponse.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Failed to proxy request to Python backend:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
