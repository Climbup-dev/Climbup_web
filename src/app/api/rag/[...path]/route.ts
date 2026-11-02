import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, await params);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, await params);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Climbup-Player",
    },
  });
}

async function handleProxy(
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
  const targetUrl = `${cleanBackend}/api/${subPath}`;

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
      signal: AbortSignal.timeout(60000), // 60s timeout accommodates Render cold start
    };

    if (method !== "GET" && method !== "HEAD") {
      init.body = await request.text();
    }

    const backendRes = await fetch(targetUrl, init);
    const resBody = await backendRes.text();

    return new NextResponse(resBody, {
      status: backendRes.status,
      headers: {
        "Content-Type": backendRes.headers.get("content-type") || "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    console.error("[RAG Proxy Error]:", error);
    return NextResponse.json(
      {
        status: "error",
        detail: `The AI Teaching Assistant is currently warming up on Render. Please wait 10-15 seconds and try asking again! (${error?.message || "Connection timeout"})`,
      },
      { status: 503 }
    );
  }
}
