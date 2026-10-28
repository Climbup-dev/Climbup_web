/**
 * ClimbUP - Universal Secure Video Helper
 * Intelligently handles YouTube embeds, protected Google Drive streaming, and native HTML5 video uploads.
 */

export type VideoType = "youtube" | "drive" | "direct";

export interface VideoInfo {
  type: VideoType;
  embedUrl: string;
  fallbackUrl?: string;
  isDirectVideo: boolean;
  hlsUrl?: string;
  isHls?: boolean;
  driveId?: string;
}

export const DEFAULT_CLOUD_RUN_URL = "https://practq45-28929614461.asia-south1.run.app";

export function getBackendBaseUrl(): string {
  // If running in browser on localhost or 127.0.0.1, auto-route to local backend on port 8000
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://127.0.0.1:8000";
    }
  }
  const envUrl = process.env.NEXT_PUBLIC_RAG_SERVER_URL || "";
  if (envUrl && (envUrl.includes("run.app") || envUrl.includes("localhost") || envUrl.includes("127.0.0.1") || envUrl.startsWith("http"))) {
    return envUrl.replace(/\/$/, "");
  }
  return DEFAULT_CLOUD_RUN_URL;
}

export function extractGoogleDriveId(urlOrId: string): string {
  if (!urlOrId) return "";
  const clean = urlOrId.trim();
  const match = clean.match(/(?:file\/d\/|id=)([a-zA-Z0-9_-]{20,})/);
  if (match) return match[1];
  if (clean.length >= 20 && !clean.includes("/") && !clean.includes("?")) {
    return clean;
  }
  return "";
}

export function getVideoTypeAndEmbedUrl(
  url: string,
  startSeconds?: number,
  lessonId?: string,
  authToken?: string
): VideoInfo {
  if (!url) {
    return { type: "direct", embedUrl: "", isDirectVideo: true };
  }

  const trimmed = url.trim();
  const tokenQuery = authToken ? `?token=${encodeURIComponent(authToken)}` : "";

  // 1. YouTube Links (watch, youtu.be, embed, shorts)
  if (trimmed.includes("youtube.com") || trimmed.includes("youtu.be")) {
    let videoId = "";
    let extractedStart = startSeconds;

    try {
      if (trimmed.includes("embed/")) {
        videoId = trimmed.split("embed/")[1]?.split("?")[0]?.split("/")[0] || "";
      } else if (trimmed.includes("watch?v=") || trimmed.includes("watch/?v=")) {
        const urlObj = new URL(trimmed);
        videoId = urlObj.searchParams.get("v") || "";
        if (!extractedStart && urlObj.searchParams.has("t")) {
          const tRaw = urlObj.searchParams.get("t") || "";
          extractedStart = parseInt(tRaw.replace("s", ""), 10) || undefined;
        }
      } else if (trimmed.includes("youtu.be/")) {
        videoId = trimmed.split("youtu.be/")[1]?.split("?")[0]?.split("/")[0] || "";
        if (!extractedStart && trimmed.includes("t=")) {
          const tMatch = trimmed.match(/[?&]t=([0-9]+)/);
          if (tMatch) extractedStart = parseInt(tMatch[1], 10) || undefined;
        }
      } else if (trimmed.includes("/shorts/")) {
        videoId = trimmed.split("/shorts/")[1]?.split("?")[0]?.split("/")[0] || "";
      }
    } catch {
      videoId = "";
    }

    if (videoId) {
      const startParam = extractedStart ? `&start=${Math.floor(extractedStart)}` : "";
      return {
        type: "youtube",
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&enablejsapi=1&playsinline=1&rel=0&modestbranding=1${startParam}`,
        isDirectVideo: false,
      };
    }
  }

  // 2. Google Drive Links & Private Drive Storage (Streamed securely via backend byte-range proxy & HLS)
  if (
    trimmed.includes("drive.google.com") ||
    trimmed.startsWith("gdrive:") ||
    trimmed.startsWith("drive://")
  ) {
    const driveId = extractGoogleDriveId(trimmed);
    if (driveId) {
      const driveStreamFallback = `/api/stream/drive/${driveId}${tokenQuery}`;
      // Masked first-party streaming endpoint (Next.js server-side proxies to Cloud Run; hides backend URL from browser Network tab)
      if (lessonId) {
        return {
          type: "direct",
          embedUrl: `/api/lessons/${lessonId}/hls/master.m3u8${tokenQuery}`,
          hlsUrl: `/api/lessons/${lessonId}/hls/master.m3u8${tokenQuery}`,
          fallbackUrl: driveStreamFallback,
          driveId: driveId,
          isDirectVideo: true,
          isHls: true,
        };
      }
      return {
        type: "direct",
        embedUrl: driveStreamFallback,
        fallbackUrl: driveStreamFallback,
        driveId: driveId,
        isDirectVideo: true,
      };
    }
  }

  // 3. Native Direct Video / Uploads
  if (trimmed.startsWith("/uploads/") || trimmed.startsWith("uploads/")) {
    if (lessonId) {
      return {
        type: "direct",
        embedUrl: `/api/lessons/${lessonId}/hls/master.m3u8${tokenQuery}`,
        hlsUrl: `/api/lessons/${lessonId}/hls/master.m3u8${tokenQuery}`,
        isDirectVideo: true,
        isHls: true,
      };
    }
    const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return {
      type: "direct",
      embedUrl: cleanPath,
      isDirectVideo: true,
    };
  }

  // 4. Fallback: If lessonId is available and URL is not a direct MP4, route to secure stream
  if (lessonId && !trimmed.endsWith(".mp4") && !trimmed.endsWith(".webm")) {
    return {
      type: "direct",
      embedUrl: `/api/lessons/${lessonId}/hls/master.m3u8${tokenQuery}`,
      hlsUrl: `/api/lessons/${lessonId}/hls/master.m3u8${tokenQuery}`,
      isDirectVideo: true,
      isHls: true,
    };
  }

  return {
    type: "direct",
    embedUrl: trimmed,
    isDirectVideo: true,
  };
}
