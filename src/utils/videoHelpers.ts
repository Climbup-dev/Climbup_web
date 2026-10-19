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

  // 1. YouTube Links
  if (trimmed.includes("youtube.com") || trimmed.includes("youtu.be")) {
    let videoId = "";
    try {
      if (trimmed.includes("embed/")) {
        videoId = trimmed.split("embed/")[1]?.split("?")[0]?.split("/")[0] || "";
      } else if (trimmed.includes("watch?v=")) {
        const urlObj = new URL(trimmed);
        videoId = urlObj.searchParams.get("v") || "";
      } else if (trimmed.includes("youtu.be/")) {
        videoId = trimmed.split("youtu.be/")[1]?.split("?")[0]?.split("/")[0] || "";
      }
    } catch {
      videoId = "";
    }

    if (videoId) {
      const startParam = startSeconds ? `&start=${Math.floor(startSeconds)}` : "";
      return {
        type: "youtube",
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&enablejsapi=1${startParam}`,
        isDirectVideo: false,
      };
    }
  }

  // 2. Google Drive Links
  if (trimmed.includes("drive.google.com")) {
    let previewUrl = trimmed;
    if (trimmed.includes("/view")) {
      previewUrl = trimmed.replace(/\/view(\?.*)?$/, "/preview");
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
  return {
    type: "direct",
    embedUrl: trimmed,
    isDirectVideo: true,
  };
}
