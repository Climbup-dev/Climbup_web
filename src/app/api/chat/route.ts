import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { pdfUrl, message, history = [], attachedImage } = await req.json();

    if (!pdfUrl) {
      return NextResponse.json({ error: 'pdfUrl is required' }, { status: 400 });
    }

    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI API KEY is not configured' }, { status: 500 });
    }

    // 1. Convert Google Drive view URL to download URL if needed
    let downloadUrl = pdfUrl;
    const driveMatch = pdfUrl.match(/\/d\/([a-zA-Z0-9_-]+)\//);
    if (driveMatch && driveMatch[1]) {
      const fileId = driveMatch[1];
      downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    }

    // 2. Fetch the PDF file
    const pdfResponse = await fetch(downloadUrl);
    if (!pdfResponse.ok) {
      return NextResponse.json({ error: 'Failed to download PDF from Drive. Ensure the file is public.' }, { status: 400 });
    }
    const arrayBuffer = await pdfResponse.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    // 3. Setup Gemini Model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 4. Construct Contents array with History and PDF
    const contents: any[] = [];
    
    // Add history (assuming history is array of { role: 'user'|'ai', text: string })
    for (const msg of history) {
      contents.push({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      });
    }

    // Add current message with PDF and optional attached image inline
    const userParts: any[] = [
      {
        inlineData: {
          data: base64Data,
          mimeType: "application/pdf"
        }
      }
    ];

    if (attachedImage) {
      const match = attachedImage.match(/^data:(image\/[a-zA-Z0-9]+);base64,(.*)$/);
      if (match) {
        userParts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2]
          }
        });
      }
    }

    userParts.push({ text: `Based on the provided PDF document (and image if attached), please answer the following question. If the answer is not in the document, use your general knowledge but politely state that it's not from the document.\n\nQuestion: ${message}` });

    contents.push({
      role: 'user',
      parts: userParts
    });

    const result = await model.generateContent({ contents });

    return NextResponse.json({ reply: result.response.text() });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
