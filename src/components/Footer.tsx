"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";

import "@/styles/Footer.css";

const AuthModal = dynamic(() => import("@/components/AuthModal"), {
  ssr: false,
  loading: () => null,
});

const footerGroups = [
  {
    title: "Quick Links",
    links: [
      ["Home", "/#home"],
      ["Explore Knowledge", "/#features"],
      ["Questions & Answers", "/#features"],
      ["Resources", "/#features"],
      ["Projects", "/#insights"],
      ["Student Community", "/#insights"],
    ],
  },
  {
    title: "Platform",
    links: [
      ["Learning Insights", "/#insights"],
      ["Student Solutions", "/#why-climbup"],
      ["Previous Year Questions", "/#features"],
      ["Model Answers", "/#features"],
      ["AI Learning Assistant", "", "planned"],
      ["Knowledge Network", "/#insights"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About ClimbUP", "/#about"],
      ["Our Vision", "/#about"],
      ["Roadmap", "", "planned"],
      ["Blog", "", "planned"],
      ["Contact Us", "", "planned"],
      ["Trust & Security", "/#trust"],
    ],
  },
  {
    title: "Support",
    links: [
      ["Help Center", "", "planned"],
      ["Feedback", "", "planned"],
      ["Report Issue", "", "planned"],
      ["Community Guidelines", "/#trust"],
      ["FAQ", "/#why-climbup"],
    ],
  },
] as const;

const impactAreas = [
  ["Students Connected", "Community growing"],
  ["Knowledge Contributions", "Built together"],
  ["Solutions Shared", "Open collaboration"],
  ["Concepts Improved", "Always evolving"],
];

const socialIcons = [
  ["LinkedIn", "in"],
  ["Instagram", "◎"],
  ["GitHub", "⌘"],
  ["X (Twitter)", "X"],
  ["YouTube", "▶"],
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [authOpen, setAuthOpen] = useState(false);

  const handleJoin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    setAuthOpen(true);
  };

  return (
    <footer className="siteFooter" aria-labelledby="footer-heading">
      <div className="footerGlow footerGlowOne" />
      <div className="footerGlow footerGlowTwo" />

      <div className="footerContainer">
        <section className="footerNewsletter">
          <div>
            <span className="footerEyebrow">Keep useful knowledge moving</span>
            <h2 id="footer-heading">Never Lose A Valuable Learning Insight</h2>
            <p>
              Join a community where ideas, solutions, and learning experiences
              help students grow together.
            </p>
          </div>
          <form className="footerJoinForm" onSubmit={handleJoin}>
            <label htmlFor="footer-email">Email address</label>
            <div>
              <input
                id="footer-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                maxLength={254}
                required
              />
              <button type="submit">Join ClimbUP <span aria-hidden>→</span></button>
            </div>
            <small>Secure sign-up. You stay in control of what you publish.</small>
          </form>
        </section>

        <section className="footerMain">
          <div className="footerBrand">
            <Link className="footerLogo" href="/" aria-label="ClimbUP home">
              <Image src="/logo.png" alt="" width={54} height={54} />
              <span>ClimbUP</span>
            </Link>
            <h3>Every Student&apos;s Knowledge Makes Everyone Stronger</h3>
            <p>
              While learning, students often discover valuable ideas, shortcuts,
              insights, and better solutions. Most of these thoughts are forgotten
              over time. ClimbUP helps students capture and publish those insights
              alongside the concepts they are learning, transforming personal
              knowledge into solutions that can help other students learn better
              and faster.
            </p>
            <blockquote>
              “An idea forgotten by one student today could become a breakthrough
              for another student tomorrow.”
            </blockquote>
          </div>

          <nav className="footerNav" aria-label="Footer navigation">
            {footerGroups.map((group) => (
              <div className="footerLinkGroup" key={group.title}>
                <h3>{group.title}</h3>
                <ul>
                  {group.links.map(([label, href, status]) => (
                    <li key={label}>
                      {status === "planned" ? (
                        <span className="footerPlannedLink">{label}<small>Planned</small></span>
                      ) : (
                        <Link href={href}>{label}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </section>

        <section className="footerImpact" aria-labelledby="impact-heading">
          <div className="footerImpactIntro">
            <span className="footerEyebrow">Community impact</span>
            <h2 id="impact-heading">Measured honestly as the community grows.</h2>
            <p>We do not publish invented numbers. These are the outcomes ClimbUP is being built to support.</p>
          </div>
          <div className="footerImpactGrid">
            {impactAreas.map(([label, status]) => (
              <article key={label}><span>{status}</span><h3>{label}</h3></article>
            ))}
          </div>
        </section>

        <section className="footerUtility">
          <div className="footerSocials" aria-label="Planned social channels">
            <span className="footerUtilityTitle">Follow the journey</span>
            <div>
              {socialIcons.map(([label, icon]) => (
                <span className="footerSocialIcon" key={label} title={`${label} channel coming soon`}>
                  <span aria-hidden>{icon}</span>
                  <span className="srOnly">{label} channel coming soon</span>
                </span>
              ))}
            </div>
          </div>

          <div className="footerLegal" aria-label="Legal information">
            <span className="footerUtilityTitle">Legal</span>
            <div>
              <span>Privacy Policy <small>Planned</small></span>
              <span>Terms of Service <small>Planned</small></span>
              <span>Cookie Policy <small>Planned</small></span>
            </div>
          </div>
        </section>

        <div className="footerBottom">
          <p>© 2026 ClimbUP. Built by Students, For Students.</p>
          <a href="#home">Back to top <span aria-hidden>↑</span></a>
        </div>
      </div>

      {authOpen && (
        <AuthModal
          open={authOpen}
          initialMode="register"
          initialEmail={email}
          onClose={() => setAuthOpen(false)}
        />
      )}
    </footer>
  );
}
