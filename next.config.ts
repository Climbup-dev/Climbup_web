if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
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
    return [
      {
        source: '/api/v1/upload-smart',
        destination: 'https://climbup-class-agent.onrender.com/api/v1/upload-smart'
      },
      {
        source: '/ws/chat/:path*',
        destination: 'https://class-agent-1043127428629.asia-south1.run.app/ws/classroom/:path*'
      }
    ]
  },
  images: {
    qualities: [75, 78, 85],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "sqzjirenlwlqxyhabcgw.supabase.co",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
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
