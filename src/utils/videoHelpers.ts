/**
 * ClimbUP - Universal Secure Video Helper
 * Intelligently handles YouTube embeds, protected Google Drive streaming, and native HTML5 video uploads.
 */

export type VideoType = "youtube" | "drive" | "direct";

export interface VideoInfo {
  type: VideoType;
  embedUrl: string;
  isDirectVideo: boolean;
  driveFallbackUrl?: string;
}

const DEFAULT_CLOUD_RUN_URL = "https://teacher-lecture-video-rag-28929614461.asia-south1.run.app";
function getBackendBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_RAG_SERVER_URL || process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "";
  if (!envUrl || envUrl.includes("127.0.0.1:8000") || envUrl.includes("localhost:8000")) {
    return DEFAULT_CLOUD_RUN_URL;
  }
  return envUrl.replace(/\/$/, "");
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

  // 2. Google Drive Links & Private Drive Storage (Streamed securely via backend byte-range proxy)
  if (
    trimmed.includes("drive.google.com") ||
    trimmed.startsWith("gdrive:") ||
    trimmed.startsWith("drive://")
  ) {
    const driveId = extractGoogleDriveId(trimmed);
    if (driveId) {
      const backendBase = getBackendBaseUrl();
      const driveFallbackUrl = `https://drive.google.com/file/d/${driveId}/preview`;
      // If lessonId is known, stream through the authorized lesson endpoint
      if (lessonId) {
        return {
          type: "direct",
          embedUrl: `${backendBase}/api/lessons/${lessonId}/stream${tokenQuery}`,
          isDirectVideo: true,
          driveFallbackUrl,
        };
      }
      // Otherwise stream through the direct Drive stream endpoint
      return {
        type: "direct",
        embedUrl: `${backendBase}/api/stream/drive/${driveId}${tokenQuery}`,
        isDirectVideo: true,
        driveFallbackUrl,
      };
    }
  }

  // 3. Native Direct Video / Uploads
  if (trimmed.startsWith("/uploads/") || trimmed.startsWith("uploads/")) {
    if (lessonId) {
      return {
        type: "direct",
        embedUrl: `/api/lessons/${lessonId}/stream${tokenQuery}`,
        isDirectVideo: true,
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
      embedUrl: `/api/lessons/${lessonId}/stream${tokenQuery}`,
      isDirectVideo: true,
    };
  }

  return {
    type: "direct",
    embedUrl: trimmed,
    isDirectVideo: true,
  };
}
