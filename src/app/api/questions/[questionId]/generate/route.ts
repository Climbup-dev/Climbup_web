import { NextResponse } from 'next/server';

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

    // Securely forward the request from the server
    const generateResponse = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        question: body.question,
        question_id: questionId
      }),
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
