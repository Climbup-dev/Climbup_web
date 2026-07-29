import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get("url");

    if (!fileUrl) {
      return new NextResponse("Missing PDF URL", { status: 400 });
    }

    // Extract Google Drive File ID if applicable
    let fetchUrl = fileUrl;
    const driveMatch = fileUrl.match(/\/file\/d\/([^\/]+)/) || fileUrl.match(/id=([^&]+)/);
    
    if (driveMatch && driveMatch[1]) {
      const fileId = driveMatch[1];
      fetchUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
    }

    const res = await fetch(fetchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      // Fallback: Redirect directly to fileUrl
      return NextResponse.redirect(fileUrl);
    }

    const contentType = res.headers.get("content-type") || "application/pdf";

    // Pass the stream directly for 0MB memory footprint and instant TTFB
    return new NextResponse(res.body, {
      status: 200,
      headers: {
        "Content-Type": contentType.includes("pdf") ? "application/pdf" : contentType,
        "Content-Disposition": "inline; filename=\"document.pdf\"",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (err) {
    console.error("PDF Proxy Error:", err);
    return new NextResponse("Failed to load PDF", { status: 500 });
  }
}
