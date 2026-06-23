"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import "@/styles/AppPageShell.css";

type EntryMode = "login" | "register";

type AppPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: string;
  cards: {
    title: string;
    copy: string;
  }[];
};

const AuthModal = dynamic(() => import("@/components/AuthModal"), {
  ssr: false,
  loading: () => null,
});

export default function AppPageShell({
  eyebrow,
  title,
  description,
  primaryAction,
  cards,
}: AppPageShellProps) {
  const router = useRouter();
  const { currentUser, loading, passwordRecovery } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>("login");
  const requiresLogin = !loading && !currentUser;

  const openAuth = (mode: EntryMode) => {
    setEntryMode(mode);
    setAuthOpen(true);
  };

  const closeAuth = () => {
    setAuthOpen(false);

    if (!currentUser) {
      router.push("/");
    }
  };

  return (
    <>
      <Navbar
        onLogin={() => openAuth("login")}
        onSignUp={() => openAuth("register")}
      />

      <main className="appPageShell">
        <section className="appPageHero" aria-labelledby="page-heading">
          <div className="appPageHeroBg" aria-hidden />
          <div className="appPageContent">
            <span className="appPageEyebrow">{eyebrow}</span>
            <h1 id="page-heading">{title}</h1>
            <p>{description}</p>
            <div className="appPageActions">
              <button
                type="button"
                onClick={() => {
                  if (currentUser) return;
                  openAuth("register");
                }}
                disabled={loading}
              >
                {primaryAction}
              </button>
              <Link href="/">Back to Home</Link>
            </div>
          </div>
        </section>

        <section className="appPageGrid" aria-label={`${title} highlights`}>
          {cards.map((card) => (
            <article className="appInfoCard" key={card.title}>
              <h2>{card.title}</h2>
              <p>{card.copy}</p>
            </article>
          ))}
        </section>
      </main>

      <Footer />

      {(authOpen || passwordRecovery || requiresLogin) && (
        <AuthModal
          key={entryMode}
          open={authOpen || requiresLogin}
          initialMode={entryMode}
          onClose={closeAuth}
        />
      )}
    </>
  );
}
