import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { pdfUrl, message, history = [], attachedImage } = await req.json();

    if (!pdfUrl) {
      return NextResponse.json({ error: 'No study material linked. Please open a topic with a PDF first.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service is not configured. Please contact support.' }, { status: 500 });
    }

    // 1. Convert Google Drive view URL to direct download URL
    let downloadUrl = pdfUrl;
    const driveMatch = pdfUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      const fileId = driveMatch[1];
      downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    }

    // 2. Fetch the PDF with timeout
    let pdfResponse: Response;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      pdfResponse = await fetch(downloadUrl, { signal: controller.signal });
      clearTimeout(timeout);
    } catch (fetchErr: any) {
      if (fetchErr.name === 'AbortError') {
        return NextResponse.json({ error: 'PDF download timed out. Please check your internet or try a different file.' }, { status: 408 });
      }
      return NextResponse.json({ error: 'Could not reach the PDF file. Make sure it is shared publicly on Google Drive.' }, { status: 400 });
    }

    if (!pdfResponse.ok) {
      return NextResponse.json(
        { error: `PDF not accessible (status ${pdfResponse.status}). Make sure the Google Drive file is set to "Anyone with link can view".` },
        { status: 400 }
      );
    }

    // Check file size (limit to 15MB to avoid Gemini limits)
    const contentLength = pdfResponse.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'PDF file is too large (max 15MB). Please use a smaller file.' }, { status: 413 });
    }

    const arrayBuffer = await pdfResponse.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    // 3. Setup Gemini Model
    const genAIInstance = new (await import('@google/generative-ai')).GoogleGenerativeAI(apiKey);
    const model = genAIInstance.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // 4. Build conversation contents
    const contents: any[] = [];

    // Only include last 6 messages to avoid token limit issues
    const recentHistory = history.slice(-6);
    for (const msg of recentHistory) {
      contents.push({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      });
    }

    // Current message parts
    const userParts: any[] = [
      { inlineData: { data: base64Data, mimeType: 'application/pdf' } }
    ];

    if (attachedImage) {
      const match = attachedImage.match(/^data:(image\/[a-zA-Z0-9]+);base64,(.*)$/);
      if (match) {
        userParts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      }
    }

    userParts.push({
      text: `You are a helpful study assistant. Based on the provided PDF document, answer the following question clearly and concisely. If the answer is not in the document, use your general knowledge but mention it's not from the document.\n\nQuestion: ${message}`
    });

    contents.push({ role: 'user', parts: userParts });

    const result = await model.generateContent({ contents });
    const reply = result.response.text();

    return NextResponse.json({ reply });

  } catch (error: any) {
    console.error('Chat API Error:', error?.message || error);

    // Gemini-specific errors
    if (error?.message?.includes('API_KEY_INVALID') || error?.message?.includes('API key')) {
      return NextResponse.json({ error: 'AI API key is invalid. Please contact support.' }, { status: 500 });
    }
    if (error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      return NextResponse.json({ error: 'AI quota exceeded. Please try again in a moment.' }, { status: 429 });
    }
    if (error?.message?.includes('SAFETY')) {
      return NextResponse.json({ error: 'Your question was blocked by safety filters. Please rephrase.' }, { status: 400 });
    }

    return NextResponse.json(
      { error: error?.message || 'AI service error. Please try again.' },
      { status: 500 }
    );
  }
}
