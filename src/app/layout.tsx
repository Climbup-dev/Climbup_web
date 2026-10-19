import type { Metadata } from "next";
import Script from "next/script";
import { Providers } from "@/components/Providers";
import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: {
    default: "ClimbUP - Learn Tech Skills, Practice & Build",
    template: "%s | ClimbUP",
  },
  description:
    "Master in-demand tech skills with interactive video courses, practice quizzes, real-world projects, and instant AI guidance.",
  applicationName: "ClimbUP",
  keywords: [
    "online courses",
    "web development masterclass",
    "AI and machine learning",
    "system design and DSA",
    "coding assignments",
    "ClimbUP",
  ],
  openGraph: {
    title: "ClimbUP - Learn Tech Skills, Practice & Build",
    description:
      "Master in-demand tech skills with interactive video courses, practice quizzes, real-world projects, and instant AI guidance.",
    type: "website",
    siteName: "ClimbUP",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "ClimbUP Logo",
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
      </head>
      <body className={plusJakartaSans.className}>
        <Script id="disable-rightclick" strategy="beforeInteractive">
          {`document.addEventListener('contextmenu', event => event.preventDefault());`}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
