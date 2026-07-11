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

export default function HomeSections() {
  const { currentUser, loading, passwordRecovery } = useAuth();
  const router = useRouter();

  const [authOpen, setAuthOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>("login");

  const openAuth = (mode: EntryMode) => {
    setEntryMode(mode);
    setAuthOpen(true);
  };

  const handleFeatureClick = (href: string) => {
    if (loading) return;
    if (currentUser) {
      router.push(href);
      return;
    }
    openAuth("login");
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
                  <li><CheckCircle2 size={16} /> Save 80% time searching internet & books</li>
                  <li><CheckCircle2 size={16} /> Ask AI to easily resolve doubts</li>
                </ul>
                <button 
                  className="showcaseAction" 
                  onClick={() => handleFeatureClick("/pyqs")}
                >
                  Explore PYQs <span>→</span>
                </button>
              </div>
              <div className="showcaseImageWrapper">
                <Image src="/features/learning_v3.png" alt="Learning Hub" width={600} height={450} className="showcaseImage" />
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
                  <li><CheckCircle2 size={16} /> Share skill insights & build confidence</li>
                  <li><CheckCircle2 size={16} /> Build a strong peer learning network</li>
                </ul>
                <button 
                  className="showcaseAction" 
                  onClick={() => handleFeatureClick("/discoveries")}
                >
                  See Discoveries <span>→</span>
                </button>
              </div>
              <div className="showcaseImageWrapper">
                <Image src="/features/discovery_v3.png" alt="Discovery Network" width={600} height={450} className="showcaseImage" />
              </div>
            </div>

            {/* Feature 3 */}
            <div className="showcaseRow">
              <div className="showcaseContent">
                <span className="showcaseNumber">03</span>
                <h3>Career & Job Preparation</h3>
                <p>Prepare for internships, placements, and aptitude tests. Get insider tips and real interview experiences from placed seniors to land your dream job.</p>
                <ul className="showcaseFeatures">
                  <li><CheckCircle2 size={16} /> Aptitude & interview prep</li>
                  <li><CheckCircle2 size={16} /> Real interview experiences</li>
                </ul>
                <button 
                  className="showcaseAction" 
                  onClick={() => handleFeatureClick("/jobs")}
                >
                  Start Job Prep <span>→</span>
                </button>
              </div>
              <div className="showcaseImageWrapper">
                <Image src="/features/mentorship_v3.png" alt="Senior Mentorship" width={600} height={450} className="showcaseImage" />
              </div>
            </div>
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
