"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  Play, 
  ArrowRight,
  Code2
} from "lucide-react";
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
    "Learner";

  return String(name).trim() || "Learner";
}

const DYNAMIC_PHRASES = [
  "Build Something Real.",
  "Ship Production AI Systems.",
  "Solve Real Engineering Problems.",
  "Create Practical GitHub Projects.",
  "Turn Theory into Working Code.",
  "Master Hands-on Problem Solving.",
];

export default function HeroSection() {
  const router = useRouter();
  const { currentUser, loading, passwordRecovery } = useAuth();
  const displayName = getDisplayName(currentUser);

  const [authOpen, setAuthOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>("login");
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((current) => (current + 1) % DYNAMIC_PHRASES.length);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  // Listen for login_required redirect from protected routes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("login_required") === "true") {
        setEntryMode("login");
        setAuthOpen(true);
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, []);

  const openAuth = (mode: EntryMode) => {
    setEntryMode(mode);
    setAuthOpen(true);
  };

  const handleCourseCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentUser) {
      router.push("/courses/course-python-course-fe87");
    } else {
      openAuth("register");
    }
  };

  return (
    <section className="homePage" id="home" aria-labelledby="home-heading">
      {/* Background Ambience & Grid */}
      <div className="heroBackground" aria-hidden="true">
        <Image
          src="/hero-bg-v2.webp"
          alt="PractQ Learning Platform Background"
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
        {/* Left Column: Main Messaging */}
        <div className="heroContent">
          <div className="heroEyebrow">
            <span className="unityPulseDot" />
            {currentUser ? (
              <span>LEARN • BUILD • GROW · Welcome back, <strong className="userNameHighlight">{displayName}</strong></span>
            ) : (
              <span>LEARN • BUILD • GROW</span>
            )}
          </div>

          <h1 className="heroTitle" id="home-heading">
            <span className="heroTitleLead">Don&apos;t Just Learn to Code.</span>
            <span className="dynamicWordContainer">
              <span className="animateWord" key={phraseIndex}>
                {DYNAMIC_PHRASES[phraseIndex]}
              </span>
            </span>
          </h1>

          <h2 className="heroSubtitle">
            From Python Fundamentals to AI-Powered Projects.
          </h2>

          <p className="heroDescription">
            Master programming fundamentals, strengthen your problem-solving skills, and build practical projects that prepare you for the real world — one step at a time.
          </p>

          {/* Primary Action Buttons */}
          <div className="heroActionsContainer">
            <div className="heroActions">
              {currentUser ? (
                <Link href="/courses" className="heroPrimaryBtn">
                  <span>Start Learning</span>
                  <ArrowRight size={17} />
                </Link>
              ) : (
                <button
                  type="button"
                  className="heroPrimaryBtn"
                  onClick={() => openAuth("register")}
                  disabled={loading}
                >
                  <span>Start Learning</span>
                  <ArrowRight size={17} />
                </button>
              )}

              <Link className="heroSecondaryBtn" href="#featured-courses">
                <Code2 size={17} />
                <span>Explore Projects</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Fixed Course Preview Card with Play Button */}
        <div className="heroIllustrationWrapper">
          <div
            role="button"
            tabIndex={0}
            onClick={handleCourseCardClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleCourseCardClick(e as any);
              }
            }}
            className="simpleVideoPlayerCard"
            aria-label="Open Python and AI Course"
          >
            <div className="videoCanvasWrapper">
              {/* Fixed Course Preview Image */}
              <Image
                src="/images/data-science-project-series.jpg"
                alt="45 Data Science Project Series: Learn, Practise, Build Real Projects"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 580px"
                className="coursePosterImage"
              />

              {/* Dark subtle overlay for contrast */}
              <div className="videoPosterOverlay" />

              {/* Pulsing ripple ring */}
              <div className="playPulseRipple" />

              {/* Centered Play Button */}
              <div className="bigCenteredPlayBtn" aria-hidden="true">
                <Play size={36} fill="#021526" color="#021526" style={{ marginLeft: "4px" }} />
              </div>
            </div>
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
