import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: {
    default: "ClimbUP - Boost Academic Marks & Master New Skills",
    template: "%s | ClimbUP",
  },
  description:
    "ClimbUP helps B.Tech students clear exams, practice with PYQs, and prepare for placements.",
  applicationName: "ClimbUP",
  keywords: [
    "B.Tech question papers",
    "engineering exam prep",
    "previous year questions",
    "placement preparation",
    "ClimbUP",
  ],
  openGraph: {
    title: "ClimbUP - Boost Academic Marks & Master New Skills",
    description:
      "Practice PYQs, compare answers, and prepare for engineering exams and placements.",
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
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
