import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: ["10.99.226.10"],
  turbopack: {
    root: process.cwd(),
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
      ...["/hero-video.mp4", "/hero-poster.webp", "/logo.png"].map(
        (source) => ({
          source,
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=86400, stale-while-revalidate=604800",
            },
          ],
        })
      ),
    ];
  },
  async rewrites() {
    const smartUploadUrl = process.env.SMART_UPLOAD_URL;
    const classAgentWsUrl = process.env.CLASS_AGENT_WS_URL;
    const rewritesList = [];
    if (smartUploadUrl) {
      rewritesList.push({
        source: '/api/v1/upload-smart',
        destination: smartUploadUrl,
      });
    }
    if (classAgentWsUrl) {
      rewritesList.push({
        source: '/ws/chat/:path*',
        destination: classAgentWsUrl,
      });
    }
    // Internal backend RAG & Video Streaming proxy (Hides raw Cloud Run server URL from student browsers)
    const ragServer = process.env.RAG_SERVER_INTERNAL_URL || process.env.NEXT_PUBLIC_RAG_SERVER_URL || 'https://practq45-28929614461.asia-south1.run.app';
    rewritesList.push({
      source: '/uploads/:path*',
      destination: `${ragServer}/uploads/:path*`,
    });
    rewritesList.push({
      source: '/api/lessons/:lessonId/hls/:path*',
      destination: `${ragServer}/api/lessons/:lessonId/hls/:path*`,
    });
    rewritesList.push({
      source: '/api/lessons/:lessonId/stream',
      destination: `${ragServer}/api/lessons/:lessonId/stream`,
    });
    rewritesList.push({
      source: '/api/lessons/:lessonId/stream-token',
      destination: `${ragServer}/api/lessons/:lessonId/stream-token`,
    });
    rewritesList.push({
      source: '/api/stream/:path*',
      destination: `${ragServer}/api/stream/:path*`,
    });
    rewritesList.push({
      source: '/api/rag/:path*',
      destination: `${ragServer}/api/:path*`,
    });
    rewritesList.push({
      source: '/api/lessons/:lessonId/mcqs/:path*',
      destination: `${ragServer}/api/lessons/:lessonId/mcqs/:path*`,
    });
    rewritesList.push({
      source: '/api/lessons/:lessonId/assignment',
      destination: `${ragServer}/api/lessons/:lessonId/assignment`,
    });
    rewritesList.push({
      source: '/api/assignments/:path*',
      destination: `${ragServer}/api/assignments/:path*`,
    });
    rewritesList.push({
      source: '/api/live/:path*',
      destination: `${ragServer}/api/live/:path*`,
    });
    return rewritesList;
  },
  images: {
    qualities: [75, 78, 85],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
