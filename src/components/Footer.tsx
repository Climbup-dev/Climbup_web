"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUp } from "lucide-react";
import "@/styles/Footer.css";

const essentialLinks = [
  { label: "Explore Courses", href: "/courses" },
  { label: "My Learning", href: "/my-courses" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
];

export default function Footer() {
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="siteFooter">
      <div className="footerContainer">
        <div className="footerMainRow">
          <div className="footerBrand">
            <Link className="footerLogo" href="/" prefetch={false}>
              <Image src="/logo-transparent.png" alt="PractiQ" width={34} height={34} />
              <span>PractiQ</span>
            </Link>
            <p className="footerTagline">
              A free, non-profit learning initiative open to everyone. Let&apos;s grow together.
            </p>
          </div>

          <nav className="footerLinksNav" aria-label="Footer Navigation">
            {essentialLinks.map((item) => (
              <Link key={item.label} href={item.href} className="footerNavLink">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="footerBottomRow">
          <p className="footerCopyright">
            © {new Date().getFullYear()} PractiQ. All rights reserved.
          </p>

          <button
            type="button"
            onClick={scrollToTop}
            className="backToTopBtn"
            aria-label="Back to top"
          >
            <span>Back to top</span>
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </footer>
  );
}
