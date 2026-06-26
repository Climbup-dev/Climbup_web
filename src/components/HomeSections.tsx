"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import "@/styles/HomeSections.css";

type EntryMode = "login" | "register";

const AuthModal = dynamic(() => import("@/components/AuthModal"), {
  ssr: false,
  loading: () => null,
});

const features = [
  {
    mark: "PYQ",
    label: "PYQs",
    title: "PYQ Preparation",
    copy: "Previous year questions with exam-focused answers, better explanations, and smarter preparation.",
    href: "/pyqs",
  },
  {
    mark: "DISC",
    label: "Discover",
    title: "Discoveries",
    copy: "Share concepts, shortcuts, patterns, and valuable insights discovered while studying.",
    href: "/discoveries",
  },
  {
    mark: "JOB",
    label: "Jobs",
    title: "Job Preparation",
    copy: "Prepare for internships, placements, aptitude, interviews, and career opportunities.",
    href: "/jobs",
  },
];

const teamMembers = [
  {
    name: "Amir Shaikh",
    role: "Founder & Team Leader",
    badge: "Leader",
    image: "/team/amir.jpeg",
    copy: "Leading ClimbUP with the vision of building a student-powered learning and discovery platform.",
  },
  {
    name: "Saloni Patle",
    role: "Frontend Developer",
    image: "/team/saloni.jpeg",
    copy: "Focused on creating clean, smooth, and student-friendly user experiences.",
  },
  {
    name: "Nilesh Kagne",
    role: "Content & Research Member",
    image: "/team/Nilesh.jpeg",
    copy: "Helps shape learning content and placement preparation resources.",
  },
];

export default function HomeSections() {
  const { currentUser, loading, passwordRecovery } = useAuth();

  const [authOpen, setAuthOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>("login");

  const openAuth = (mode: EntryMode) => {
    setEntryMode(mode);
    setAuthOpen(true);
  };

  const handleFeatureClick = (href: string) => {
    if (loading) return;

    if (currentUser) {
      window.location.assign(href);
      return;
    }

    openAuth("login");
  };

  return (
    <div className="homeSections">
      <section className="startupSection whySection" id="why-climbup">
        <div className="sectionContainer">
          <div className="sectionIntro">
            <span className="sectionLabel">Why ClimbUP</span>
            <h2>Valuable discoveries should not disappear after learning.</h2>
            <p>
              Students often find better explanations, shortcuts, patterns, and
              useful resources while studying. ClimbUP helps capture and share
              those discoveries so every student can learn faster.
            </p>
          </div>

          <div className="problemFlow">
            <article>
              <span>01</span>
              <div>
                <h3>Learn</h3>
                <p>Study topics, solve PYQs, and explore concepts.</p>
              </div>
            </article>

            <article>
              <span>02</span>
              <div>
                <h3>Discover</h3>
                <p>Find useful shortcuts, insights, patterns, or explanations.</p>
              </div>
            </article>

            <article>
              <span>03</span>
              <div>
                <h3>Share</h3>
                <p>Help other students learn from your discovery.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="startupSection featureSection" id="features">
        <div className="sectionContainer">
          <div className="sectionIntro">
            <span className="sectionLabel">Student Learning Hub</span>
            <h2>Learn. Discover. Grow.</h2>
            <p>
              Prepare with PYQs, share discoveries made while learning, and stay
              ready for internships and placements.
            </p>
          </div>

          <div className="featureGrid">
            {features.map((feature) => (
              <button
                type="button"
                className="featureCard"
                key={feature.title}
                onClick={() => handleFeatureClick(feature.href)}
                disabled={loading}
                aria-label={`Open ${feature.title}`}
              >
                <span className="featureMark">{feature.mark}</span>
                <h3>{feature.title}</h3>
                <span className="featureMobileLabel">{feature.label}</span>
                <p>{feature.copy}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="startupSection teamSection" id="our-team">
        <div className="sectionContainer">
          <div className="sectionIntro sectionIntroLeft">
            <span className="sectionLabel">Our Team</span>
            <h2>Small Team. Strong Vision.</h2>
            <p>
              ClimbUP is built by a focused student team working to make
              learning easier, smarter, and more collaborative.
            </p>
          </div>

          <div className="teamGrid">
            {teamMembers.map((member, index) => (
              <article
                className={`teamCard ${index === 0 ? "teamLeaderCard" : ""}`}
                key={member.name}
              >
                <div className="teamImageBox">
                  <Image
                    src={member.image}
                    alt={member.name}
                    width={120}
                    height={120}
                    className="teamImage"
                    loading="lazy"
                    sizes="120px"
                  />
                </div>

                {member.badge && <span className="teamBadge">{member.badge}</span>}

                <h3>{member.name}</h3>
                <strong>{member.role}</strong>
                <p>{member.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="startupSection visionSection" id="knowledge-network">
        <div className="sectionContainer">
          <div className="visionPanel">
            <span className="sectionLabel">Student Knowledge Network</span>
            <h2>
              Learn Together.
              <br />
              Discover Together.
              <br />
              Grow Together.
            </h2>
            <p>
              Every discovery can help another student understand faster,
              prepare better, and move one step closer to success.
            </p>
          </div>
        </div>
      </section>

      {(authOpen || passwordRecovery) && (
        <AuthModal
          key={entryMode}
          open={authOpen}
          initialMode={entryMode}
          onClose={() => setAuthOpen(false)}
        />
      )}
    </div>
  );
}
