"use client";

import Image from "next/image";
import Link from "next/link";
import "@/styles/Footer.css";

const footerGroups = [
  {
    title: "Platform",
    links: [
      ["Home", "/#home"],
      ["PYQs", "/#features"],
      ["Discoveries", "/#features"],
      ["Jobs", "/#features"],
    ],
  },
  {
    title: "Community",
    links: [
      ["Why ClimbUP", "/#why-climbup"],
      ["How It Works", "/#why-climbup"],
      ["Knowledge Network", "/#knowledge-network"],
    ],
  },
  {
    title: "More",
    links: [
      ["My Profile", "/profile"],
      ["Trust & Privacy", "#footer-trust"],
    ],
  },
] as const;

const learningFlow = [
  ["01", "Learn", "Study concepts, solve PYQs, and build understanding."],
  ["02", "Discover", "Find useful explanations, shortcuts, patterns, and insights."],
  ["03", "Share", "Help other students grow through your discoveries."],
];

export default function Footer() {
  return (
    <footer className="siteFooter">
      <div className="footerContainer">
        <section className="footerFlow">
          {learningFlow.map(([number, title, copy]) => (
            <article key={title}>
              <span>{number}</span>
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="footerMain">
          <div className="footerBrand">
            <Link className="footerLogo" href="/">
              <Image src="/logo.png" alt="ClimbUP" width={52} height={52} />
              <span>ClimbUP</span>
            </Link>

            <h3>A Community Built By Students</h3>

            <p>
             ClimbUP is built to help students focus not only on marks but also on skills, creativity, problem-solving, and real-world thinking. We believe education should inspire students to explore ideas, develop innovative minds, and grow beyond traditional academic boundaries.
            </p>

            <blockquote>
              “When students share what they learn, everyone grows stronger.”
            </blockquote>
          </div>

          <nav className="footerNav">
            {footerGroups.map((group) => (
              <div className="footerLinkGroup" key={group.title}>
                <h3>{group.title}</h3>

                <ul>
                  {group.links.map(([label, href]) => (
                    <li key={label}>
                      <Link href={href}>{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </section>

        <section className="footerTrust" id="footer-trust">
          <div>
            <span>✓</span>
            <p>
              <strong>Secure authentication</strong>
              Protected student account access.
            </p>
          </div>

          <div>
            <span>✓</span>
            <p>
              <strong>Privacy controls</strong>
              Publish discoveries only when you choose.
            </p>
          </div>

          <div>
            <span>✓</span>
            <p>
              <strong>Student-first mission</strong>
              Built to help students learn and grow together.
            </p>
          </div>
        </section>

        <div className="footerBottom">
          <p>© 2026 ClimbUP. Built by Students, For Students.</p>

          <div>
            <span>Empowering students through shared knowledge.</span>
            <a href="#home">
              Back to top <span>↑</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}