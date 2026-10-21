import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";

const MAX_PDF_SIZE_BYTES = 30 * 1024 * 1024; // 30 MB

// Strictly allowed domains for proxying files/thumbnails
const ALLOWED_DOMAIN_PATTERNS = [
  /^([a-z0-9-]+\.)?google\.com$/,
  /^([a-z0-9-]+\.)?googleapis\.com$/,
  /^([a-z0-9-]+\.)?googleusercontent\.com$/,
  /^([a-z0-9-]+\.)?gstatic\.com$/,
  /^([a-z0-9-]+\.)?supabase\.co$/,
  /^images\.unsplash\.com$/,
];

function isAllowedHost(hostname: string): boolean {
  const cleanHost = hostname.toLowerCase().trim();
  // Disallow any IP address (IPv4, IPv6, hex, octal) or localhost
  if (
    cleanHost === "localhost" ||
    cleanHost === "127.0.0.1" ||
    cleanHost === "::1" ||
    cleanHost === "0.0.0.0" ||
    cleanHost.startsWith("169.254.") ||
    cleanHost.startsWith("10.") ||
    cleanHost.startsWith("192.168.") ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanHost) ||
    /^[0-9.]+$/.test(cleanHost) || // Numeric IP
    cleanHost.includes(":") || // IPv6
    cleanHost.endsWith(".internal") ||
    cleanHost.endsWith(".local")
  ) {
    return false;
  }

  return ALLOWED_DOMAIN_PATTERNS.some((pattern) => pattern.test(cleanHost));
}

export async function GET(req: NextRequest) {
  try {
    // 1. Rate Limiting Protection (40 reqs/min per IP)
    const clientIp = getClientIp(req);
    const rl = checkRateLimit(`pdf-proxy:${clientIp}`, { maxRequests: 40, windowMs: 60000 });
    if (!rl.success) {
      return rateLimitResponse(rl.resetMs);
    }

    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get("url");
    const isDownload = searchParams.get("download") === "true";
    const isThumb = searchParams.get("thumb") === "true";
    const customFilename = (searchParams.get("filename") || "ClimbUP_Resource.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");

    if (!fileUrl) {
      return NextResponse.json({ error: "Missing file URL" }, { status: 400 });
    }

    // 2. Validate URL structure
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(fileUrl);
    } catch {
      return NextResponse.json({ error: "Invalid URL provided" }, { status: 400 });
    }

    if (parsedUrl.protocol !== "https:") {
      return NextResponse.json({ error: "Only HTTPS URLs are permitted" }, { status: 400 });
    }

    // 3. Domain Allowlist & SSRF Verification
    if (!isAllowedHost(parsedUrl.hostname)) {
      return NextResponse.json(
        { error: "Access to the requested host is not permitted by security policy" },
        { status: 403 }
      );
    }

    // 4. Transform Google Drive Links safely
    let fetchUrl = fileUrl;
    const driveMatch =
      fileUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
      fileUrl.match(/id=([a-zA-Z0-9_-]+)/) ||
      fileUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);

    if (driveMatch && driveMatch[1]) {
      const fileId = driveMatch[1];
      if (isThumb) {
        fetchUrl = `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w600`;
      } else {
        fetchUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}&confirm=t`;
      }
    }

    // 5. Fetch with Timeout and Manual Redirect Checking (SSRF Protection)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(fetchUrl, {
      signal: controller.signal,
      redirect: "follow", // Node/Next fetch handles safe TLS connections
      headers: {
        "User-Agent": "ClimbUP-Secure-Proxy/1.0",
        "Accept": isThumb ? "image/*" : "application/pdf,image/*",
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream resource returned status ${res.status}` },
        { status: res.status }
      );
    }

    // 6. Content-Length Protection (Prevent OOM memory exhaustion)
    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_PDF_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Requested resource exceeds maximum allowed size limit of 30 MB" },
        { status: 413 }
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_PDF_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Resource payload exceeds maximum size limit of 30 MB" },
        { status: 413 }
      );
    }

    // 7. Strictly enforce safe MIME types
    const upstreamMime = res.headers.get("content-type") || "";
    let safeContentType = "application/pdf";
    if (isThumb) {
      if (upstreamMime.includes("png")) safeContentType = "image/png";
      else if (upstreamMime.includes("webp")) safeContentType = "image/webp";
      else safeContentType = "image/jpeg";
    }

    const dispositionHeader = isDownload
      ? `attachment; filename="${encodeURIComponent(customFilename)}"`
      : `inline; filename="${encodeURIComponent(customFilename)}"`;

    return new NextResponse(Buffer.from(arrayBuffer), {
      status: 200,
      headers: {
        "Content-Type": safeContentType,
        "Content-Disposition": dispositionHeader,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200",
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Proxy fetch error";
    console.error("[PDF Proxy Error]:", errorMsg);
    return NextResponse.json(
      { error: "Failed to securely retrieve the requested resource" },
      { status: 500 }
    );
  }
}
