import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleLessonProxy(request, await params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleLessonProxy(request, await params);
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleLessonProxy(request, await params);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Climbup-Player, Range",
    },
  });
}

async function handleLessonProxy(
  request: NextRequest,
  params: { path: string[] }
) {
  const backendBase =
    process.env.RAG_SERVER_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_RAG_SERVER_URL ||
    process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL;

  if (!backendBase) {
    return NextResponse.json(
      {
        status: "error",
        detail: "Backend server URL not configured. Please set RAG_SERVER_INTERNAL_URL in Vercel settings.",
      },
      { status: 503 }
    );
  }

  const cleanBackend = backendBase.replace(/\/+$/, "");
  const subPath = (params.path || []).join("/");
  const urlObj = new URL(request.url);
  const targetUrl = `${cleanBackend}/api/lessons/${subPath}${urlObj.search}`;

  try {
    const method = request.method;
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      if (!["host", "connection", "content-length"].includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    });

    const init: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(45000),
    };

    if (method !== "GET" && method !== "HEAD") {
      init.body = await request.text();
    }

    const backendRes = await fetch(targetUrl, init);

    // Forward response headers including caching, content-type, content-range
    const resHeaders = new Headers();
    backendRes.headers.forEach((value, key) => {
      if (!["content-encoding", "content-length", "transfer-encoding"].includes(key.toLowerCase())) {
        resHeaders.set(key, value);
      }
    });
    resHeaders.set("Access-Control-Allow-Origin", "*");

    return new NextResponse(backendRes.body, {
      status: backendRes.status,
      headers: resHeaders,
    });
  } catch (error: any) {
    console.error("[Lesson Proxy Error]:", error);
    return NextResponse.json(
      {
        status: "error",
        detail: `Backend video/lesson service is starting up: ${error?.message || "Connection refused"}. Please retry in 10 seconds.`,
      },
      { status: 503 }
    );
  }
}

