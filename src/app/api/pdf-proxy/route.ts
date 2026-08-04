import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get("url");
    const isDownload = searchParams.get("download") === "true";
    const isThumb = searchParams.get("thumb") === "true";
    const customFilename = searchParams.get("filename") || "ClimbUP_Note.pdf";

    if (!fileUrl) {
      return new NextResponse("Missing PDF URL", { status: 400 });
    }

    // Extract Google Drive File ID if applicable
    let fetchUrl = fileUrl;
    const driveMatch = fileUrl.match(/\/file\/d\/([^\/]+)/) || fileUrl.match(/id=([^&]+)/) || fileUrl.match(/\/d\/([^\/]+)/);
    
    if (driveMatch && driveMatch[1]) {
      const fileId = driveMatch[1];
      if (isThumb) {
        fetchUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w600`;
      } else {
        fetchUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
      }
    }

    const res = await fetch(fetchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      return new NextResponse("Failed to fetch file stream", { status: res.status });
    }

    const arrayBuffer = await res.arrayBuffer();
    const contentType = isThumb ? (res.headers.get("content-type") || "image/jpeg") : "application/pdf";
    const dispositionHeader = isDownload 
      ? `attachment; filename="${encodeURIComponent(customFilename)}"` 
      : `inline; filename="${encodeURIComponent(customFilename)}"`;

    return new NextResponse(Buffer.from(arrayBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": dispositionHeader,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (err) {
    console.error("PDF Proxy Error:", err);
    return new NextResponse("Failed to process request", { status: 500 });
  }
}
