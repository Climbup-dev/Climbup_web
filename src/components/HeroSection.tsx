"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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

export default function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { currentUser, loading, passwordRecovery } = useAuth();
  const displayName = getDisplayName(currentUser);

  const [posterReady, setPosterReady] = useState(false);
  const [posterAvailable, setPosterAvailable] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>("login");

  const openAuth = (mode: EntryMode) => {
    setEntryMode(mode);
    setAuthOpen(true);
  };

  useEffect(() => {
    if (!posterReady) return;

    const video = videoRef.current;
    if (!video) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion) return;

    let cancelled = false;

    const revealVideo = () => {
      if (!cancelled) setVideoReady(true);
    };

    const playVideo = async () => {
      try {
        await video.play();
        revealVideo();
      } catch {
        setVideoReady(false);
      }
    };

    video.addEventListener("canplaythrough", playVideo, { once: true });
    video.addEventListener("playing", revealVideo);

    video.load();

    if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      void playVideo();
    }

    return () => {
      cancelled = true;
      video.removeEventListener("canplaythrough", playVideo);
      video.removeEventListener("playing", revealVideo);
    };
  }, [posterReady]);

  return (
    <section className="homePage" id="home" aria-labelledby="home-heading">
      <div className="heroBackground" aria-hidden="true">
        {posterAvailable && (
          <Image
            src="/hero-poster.webp"
            alt=""
            className={`heroBgImage ${videoReady ? "hideBgImage" : ""}`}
            fill
            priority
            fetchPriority="high"
            quality={78}
            sizes="100vw"
            onLoad={() => setPosterReady(true)}
            onError={() => {
              setPosterAvailable(false);
              setPosterReady(true);
            }}
          />
        )}

        <video
          ref={videoRef}
          className={`heroBgVideo ${videoReady ? "showBgVideo" : ""}`}
          muted
          loop
          playsInline
          preload={posterReady ? "metadata" : "none"}
          poster="/hero-poster.webp"
        >
          {posterReady && <source src="/hero-video.mp4" type="video/mp4" />}
        </video>

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
          <span className="heroEyebrow">
            <span className="eyebrowDot" />
            Built by engineering students
          </span>

          <h1 className="heroTitle" id="home-heading">
            <span>Learn Faster.</span>
            <span>Grow Together.</span>
            <strong>Climb Higher.</strong>
          </h1>

          <p className="heroDescription">
            Built by engineering students, for engineering students. A place to
            learn better, prepare confidently, and share experiences that help
            others grow.
          </p>

          {currentUser ? (
            <div className="heroWelcome" role="status">
              <span>Welcome</span>
              <strong>{displayName}</strong>
            </div>
          ) : (
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

              <Link className="heroSecondaryLink" href="#features">
                Explore Platform
              </Link>
            </div>
          )}
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
