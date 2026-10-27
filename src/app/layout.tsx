import type { Metadata } from "next";
import Script from "next/script";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: {
    default: "PractQ - Learn Tech Skills, Practice & Build",
    template: "%s | PractQ",
  },
  description:
    "Master in-demand tech skills with interactive video courses, practice quizzes, real-world projects, and instant AI guidance.",
  applicationName: "PractQ",
  keywords: [
    "online courses",
    "web development masterclass",
    "AI and machine learning",
    "system design and DSA",
    "coding assignments",
    "PractQ",
  ],
  openGraph: {
    title: "PractQ - Learn Tech Skills, Practice & Build",
    description:
      "Master in-demand tech skills with interactive video courses, practice quizzes, real-world projects, and instant AI guidance.",
    type: "website",
    siteName: "PractQ",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "PractQ Logo",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <Script id="disable-rightclick" strategy="beforeInteractive">
          {`document.addEventListener('contextmenu', event => event.preventDefault());`}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
