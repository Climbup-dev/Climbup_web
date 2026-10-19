/**
 * ClimbUP - Universal Video Helper
 * Intelligently handles YouTube embeds, Google Drive previews, and native HTML5 MP4/WebM video uploads.
 */

export type VideoType = "youtube" | "drive" | "direct";

export interface VideoInfo {
  type: VideoType;
  embedUrl: string;
  isDirectVideo: boolean;
}

export function getVideoTypeAndEmbedUrl(url: string, startSeconds?: number): VideoInfo {
  if (!url) {
    return { type: "direct", embedUrl: "", isDirectVideo: true };
  }

  const trimmed = url.trim();

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
      // playsinline=1 enables inline mobile playback on iOS/Safari and Android
      // enablejsapi=1 allows instantaneous timestamp jumps via postMessage
      return {
        type: "youtube",
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&enablejsapi=1&playsinline=1&rel=0&modestbranding=1${startParam}`,
        isDirectVideo: false,
      };
    }
  }

  // 2. Google Drive Links
  if (trimmed.includes("drive.google.com")) {
    let previewUrl = trimmed;
    if (trimmed.includes("/view")) {
      previewUrl = trimmed.replace(/\/view(\?.*)?$/, "/preview");
    } else if (trimmed.includes("/edit")) {
      previewUrl = trimmed.replace(/\/edit(\?.*)?$/, "/preview");
    } else if (!trimmed.endsWith("/preview")) {
      previewUrl = `${trimmed}/preview`;
    }
    return {
      type: "drive",
      embedUrl: previewUrl,
      isDirectVideo: false,
    };
  }

  // 3. Native Direct Video (MP4, WebM, OGG, or Cloud Storage stream)
  const ragServer = process.env.NEXT_PUBLIC_RAG_SERVER_URL || "http://127.0.0.1:8000";
  let resolvedUrl = trimmed;
  if (trimmed.startsWith("/uploads/") || trimmed.startsWith("uploads/")) {
    const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    resolvedUrl = `${ragServer}${path}`;
  }

  return {
    type: "direct",
    embedUrl: resolvedUrl,
    isDirectVideo: true,
  };
}
