import { NextRequest, NextResponse } from "next/server";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// In-memory sliding window cache with automatic cleanup
const rateLimitMap = new Map<string, RateLimitRecord>();
const MAX_MAP_ENTRIES = 10000;

function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (record.resetAt <= now) {
      rateLimitMap.delete(key);
    }
  }
}

// Periodic cleanup every 60 seconds
if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpiredEntries, 60000).unref?.();
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = { maxRequests: 60, windowMs: 60000 }
): { success: boolean; limit: number; remaining: number; resetMs: number } {
  const now = Date.now();
  
  // Evict oldest entries if capacity is reached
  if (rateLimitMap.size >= MAX_MAP_ENTRIES) {
    cleanupExpiredEntries();
    if (rateLimitMap.size >= MAX_MAP_ENTRIES) {
      const firstKey = rateLimitMap.keys().next().value;
      if (firstKey) rateLimitMap.delete(firstKey);
    }
  }

  const existing = rateLimitMap.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetMs: config.windowMs,
    };
  }

  if (existing.count >= config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetMs: Math.max(0, existing.resetAt - now),
    };
  }

  existing.count += 1;
  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - existing.count,
    resetMs: Math.max(0, existing.resetAt - now),
  };
}

export function getClientIp(req: Request | NextRequest): string {
  const headers = req.headers;
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((ip) => ip.trim());
    if (ips[0]) return ips[0];
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;
  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp;
  return "127.0.0.1";
}

export function rateLimitResponse(resetMs: number): NextResponse {
  const retrySec = Math.ceil(resetMs / 1000);
  return NextResponse.json(
    {
      error: "Too many requests. Please slow down and try again shortly.",
      retryAfterSeconds: retrySec,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retrySec),
        "X-RateLimit-Reset": String(Date.now() + resetMs),
      },
    }
  );
}
