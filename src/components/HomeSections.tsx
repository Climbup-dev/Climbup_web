"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import "@/styles/HomeSections.css";

type EntryMode = "login" | "register";

const AuthModal = dynamic(() => import("@/components/AuthModal"), {
  ssr: false,
  loading: () => null,
});

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
  const router = useRouter();

  const [authOpen, setAuthOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>("login");

  const openAuth = (mode: EntryMode) => {
    setEntryMode(mode);
    setAuthOpen(true);
  };

  return (
    <div className="homeSections">
      <section className="startupSection showcaseSection" id="features">
        <div className="sectionContainer">
          <div className="sectionIntro">
            <span className="sectionLabel">Collective Intelligence</span>
            <h2>Study with the minds of thousands of engineering students.</h2>
            <p>
              Don't study in isolation. Every time someone finds a brilliant shortcut, decodes a complex concept, or discovers a pattern, it is shared here. ClimbUP turns individual late-night study sessions into a powerful shared brain.
            </p>
          </div>

          <div className="showcaseList">
            {/* Feature 1 */}
            <div className="showcaseRow">
              <div className="showcaseContent">
                <span className="showcaseNumber">01</span>
                <h3>Master Your Exams</h3>
                <p>Tap into a stream of insights, PYQ patterns, and smart preparation resources to score high marks with less effort.</p>
                <ul className="showcaseFeatures">
                  <li><CheckCircle2 size={16} /> Exam-focused PYQ solutions</li>
                  <li><CheckCircle2 size={16} /> Fast concept mastery</li>
                </ul>
              </div>
              <div className="showcaseImageWrapper">
                <Image src="/features/learning_v3.jpg" alt="Learning Hub" width={600} height={450} className="showcaseImage" />
                <div className="imageGlow"></div>
              </div>
            </div>

            {/* Feature 2: Reversed */}
            <div className="showcaseRow reversed">
              <div className="showcaseContent">
                <span className="showcaseNumber">02</span>
                <h3>The Discovery Network</h3>
                <p>See how other students think. Grasp difficult topics through diverse perspectives, shortcuts, and fresh explanations shared by peers.</p>
                <ul className="showcaseFeatures">
                  <li><CheckCircle2 size={16} /> Share 'Aha!' moments</li>
                  <li><CheckCircle2 size={16} /> Real-time peer collaboration</li>
                </ul>
              </div>
              <div className="showcaseImageWrapper">
                <Image src="/features/discovery_v3.jpg" alt="Discovery Network" width={600} height={450} className="showcaseImage" />
                <div className="imageGlow"></div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="showcaseRow">
              <div className="showcaseContent">
                <span className="showcaseNumber">03</span>
                <h3>Guided by Seniors</h3>
                <p>Drop your own discoveries or get guided by experienced seniors to crack your next exam or land your dream job.</p>
                <ul className="showcaseFeatures">
                  <li><CheckCircle2 size={16} /> Senior mentorship & tips</li>
                  <li><CheckCircle2 size={16} /> Placement & interview prep</li>
                </ul>
              </div>
              <div className="showcaseImageWrapper">
                <Image src="/features/mentorship_v3.jpg" alt="Senior Mentorship" width={600} height={450} className="showcaseImage" />
                <div className="imageGlow"></div>
              </div>
            </div>
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
            <span className="sectionLabel">The Network Effect</span>
            <h2>
              Your insights shape<br />
              the future of learning.
            </h2>
            <p>
              Imagine a campus where every senior's best interview tips and every student's best ideas are instantly available to everyone else. When one person shares, the whole community levels up. That's the real power of ClimbUP.
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
