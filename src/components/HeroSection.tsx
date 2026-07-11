"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState, useEffect, MouseEvent } from "react";
import { Brain, Laptop, Settings, Lightbulb, PenTool, CheckCircle2 } from "lucide-react";

import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import "@/styles/HeroSection.css";

type EntryMode = "login" | "register";

const AuthModal = dynamic(() => import("@/components/AuthModal"), {
  ssr: false,
  loading: () => null,
});

function getDisplayName(user: ReturnType<typeof useAuth>["currentUser"]) {
  const name =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Member";

  return String(name).trim() || "Member";
}

const CYCLES = [
  { prefix: "Marks &", suffix: "Skills." },
  { prefix: "Build", suffix: "Projects." },
  { prefix: "Share", suffix: "Ideas." },
  { prefix: "Get", suffix: "Placed." },
];

export default function HeroSection() {
  const { currentUser, loading, passwordRecovery } = useAuth();
  const displayName = getDisplayName(currentUser);

  const [authOpen, setAuthOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>("login");

  const [wordIndex, setWordIndex] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Handle Dynamic Word Cycling
  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((current) => (current + 1) % CYCLES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const openAuth = (mode: EntryMode) => {
    setEntryMode(mode);
    setAuthOpen(true);
  };

  return (
    <section 
      className="homePage" 
      id="home" 
      aria-labelledby="home-heading"
    >
      <div className="heroBackground" aria-hidden="true">
        <Image
          src="/hero-bg-v2.webp"
          alt="ClimbUP Engineering Platform Background"
          className="heroBgImage"
          fill
          priority
          quality={85}
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />

        <div className="heroOverlay" />
        <div className="heroGrid" />
        <div className="heroGlow" />
      </div>

      <Navbar
        onLogin={() => openAuth("login")}
        onSignUp={() => openAuth("register")}
      />

      <main className="heroSection">
        <div className="heroContent">
          {currentUser ? (
            <span className="heroEyebrow" style={{ textTransform: 'none', letterSpacing: '0.2px' }}>
              <span className="waveEmoji" style={{ fontSize: '16px', marginRight: '4px' }}>👋</span>
              Welcome back, <strong style={{ color: '#fff', fontWeight: 800, marginLeft: '4px' }}>{displayName}</strong>
            </span>
          ) : (
            <span className="heroEyebrow">
              <span className="eyebrowDot" />
              Built by engineering students
            </span>
          )}

          <h1 className="heroTitle" id="home-heading">
            <span>Learn Faster.</span>
            <span>Grow Together.</span>
            <strong className="dynamicWordContainer" key={wordIndex}>
              <span className="masterText animatePrefix">{CYCLES[wordIndex].prefix}</span> 
              <span className="animateWord">{CYCLES[wordIndex].suffix}</span>
            </strong>
          </h1>

          <p className="heroDescription">
            Built by engineering students, for engineering students. A place to
            learn better, prepare confidently, share innovative ideas, and help
            each other grow.
          </p>

          {currentUser ? (
            <div className="heroActionsContainer">
              <div className="heroActions">
                <button
                  type="button"
                  className="joinClimbBtn"
                  onClick={() => window.location.href = '#features'}
                >
                  Start Learning
                  <strong aria-hidden="true">→</strong>
                </button>

                <a className="heroSecondaryLink" href="#about">
                  How it works
                </a>
              </div>
            </div>
          ) : (
            <div className="heroActionsContainer">
              <div className="heroActions">
                <button
                  type="button"
                  className="joinClimbBtn"
                  onClick={() => openAuth("register")}
                  disabled={loading}
                >
                  {loading ? "Preparing..." : "Join ClimbUP"}
                  <strong aria-hidden="true">→</strong>
                </button>

                <a className="heroSecondaryLink" href="#features">
                  Explore Platform
                </a>
              </div>
            </div>
          )}
        </div>
        
        <div className="heroIllustrationWrapper">
          <div className="heroIllustration">
            <Image
              src="/hero-transparent.webp"
              alt="Engineering Collaboration 3D"
              width={650}
              height={650}
              priority
              quality={85}
              className="hero3dImage"
            />
          </div>
          
          {/* Animated Study Tools popping out of the 3D Box */}
          <div className="floating-tool tool-1">
            <Brain size={28} color="#9ef8dc" strokeWidth={1.5} />
          </div>
          <div className="floating-tool tool-2">
            <Laptop size={26} color="#38d399" strokeWidth={1.5} />
          </div>
          <div className="floating-tool tool-3">
            <Settings size={28} color="#9ef8dc" strokeWidth={1.5} />
          </div>
          <div className="floating-tool tool-4">
            <Lightbulb size={26} color="#38d399" strokeWidth={1.5} />
          </div>
          <div className="floating-tool tool-5">
            <PenTool size={30} color="#00c78c" strokeWidth={1.5} />
          </div>
        </div>
      </main>

      {(authOpen || passwordRecovery) && (
        <AuthModal
          key={entryMode}
          open={authOpen}
          initialMode={entryMode}
          onClose={() => setAuthOpen(false)}
        />
      )}
    </section>
  );
}
