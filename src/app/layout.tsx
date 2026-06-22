import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: {
    default: "ClimbUP - Master Engineering",
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
    title: "ClimbUP - Master Engineering",
    description:
      "Practice PYQs, compare answers, and prepare for engineering exams and placements.",
    type: "website",
    siteName: "ClimbUP",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
