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

export default function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { currentUser, loading, passwordRecovery } = useAuth();
  const [videoReady, setVideoReady] = useState(false);
  const [posterReady, setPosterReady] = useState(false);
  const [posterAvailable, setPosterAvailable] = useState(true);
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
    let cancelled = false;

    const startVideo = async () => {
      try {
        await video.play();
        if (!cancelled) setVideoReady(true);
      } catch {
        // Keep the poster visible when autoplay is unavailable.
      }
    };

    const handlePlaying = () => {
      if (!cancelled) setVideoReady(true);
    };

    video.addEventListener("canplay", startVideo);
    video.addEventListener("playing", handlePlaying);
    video.load();

    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      void startVideo();
    }

    return () => {
      cancelled = true;
      video.removeEventListener("canplay", startVideo);
      video.removeEventListener("playing", handlePlaying);
    };
  }, [posterReady]);

  return (
    <section className="homePage" id="home" aria-labelledby="home-heading">
      <div className="heroBackground" aria-hidden>
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
          preload={posterReady ? "auto" : "none"}
          poster="/hero-poster.webp"
        >
          {posterReady && <source src="/hero-video.mp4" type="video/mp4" />}
        </video>

        <div className="heroOverlay" />
        <div className="heroGrid" />
      </div>

      <Navbar
        onLogin={() => openAuth("login")}
        onSignUp={() => openAuth("register")}
      />

      <div className="heroSection">
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
            Prepare for university exams with PYQs and model answers, improve
            how you write, share useful student insights, and build practical
            placement readiness in one learning space.
          </p>

          <div className="heroActions">
            {currentUser ? (
              <Link className="joinClimbBtn heroPrimaryLink" href="#features">
                Explore ClimbUP
                <strong aria-hidden>→</strong>
              </Link>
            ) : (
              <button
                type="button"
                className="joinClimbBtn"
                onClick={() => openAuth("register")}
                disabled={loading}
              >
                {loading ? "Preparing..." : "Create Your Account"}
                <strong aria-hidden>→</strong>
              </button>
            )}

            <Link className="heroSecondaryLink" href="#features">
              Explore the platform
            </Link>
          </div>

          <p className="heroTrustLine">
            PYQs, answer practice, student knowledge, and placement preparation—without inflated promises.
          </p>
        </div>
      </div>

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
