"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";

import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import "@/styles/Profile.css";

type EntryMode = "login" | "register";

const AuthModal = dynamic(() => import("@/components/AuthModal"), {
  ssr: false,
  loading: () => null,
});

function formatAccountDate(value?: string) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

export default function ProfilePage() {
  const { currentUser, profileImage, loading, passwordRecovery } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>("login");
  const [avatarError, setAvatarError] = useState(false);

  const openAuth = (mode: EntryMode) => {
    setEntryMode(mode);
    setAuthOpen(true);
  };

  const displayName =
    currentUser?.user_metadata?.full_name ||
    currentUser?.user_metadata?.name ||
    currentUser?.email?.split("@")[0] ||
    "ClimbUP member";

  return (
    <main className="profilePage">
      <Navbar onLogin={() => openAuth("login")} onSignUp={() => openAuth("register")} />

      <section className="profileShell">
        {loading ? (
          <div className="profileState" role="status">
            <span className="profileLoader" aria-hidden />
            <h1>Loading your profile</h1>
            <p>Restoring your secure session...</p>
          </div>
        ) : !currentUser ? (
          <div className="profileState">
            <span className="profileStateIcon" aria-hidden>◎</span>
            <h1>Sign in to view your profile</h1>
            <p>Your account details stay private and secure.</p>
            <button type="button" onClick={() => openAuth("login")}>Log in securely</button>
          </div>
        ) : (
          <div className="profileCard">
            <div className="profileCover" />
            <div className="profileMain">
              <div className="profileAvatarLarge" aria-label={`${displayName}'s profile image`}>
                {profileImage && !avatarError ? (
                  <Image
                    src={profileImage}
                    alt={`${displayName}'s profile`}
                    width={132}
                    height={132}
                    priority
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <span>{getInitials(displayName)}</span>
                )}
              </div>

              <div className="profileHeading">
                <span className="profileVerified">✓ Authenticated account</span>
                <h1>{displayName}</h1>
                <p>{currentUser.email}</p>
              </div>

              <Link className="profileHomeLink" href="/">← Back to home</Link>
            </div>

            <div className="profileDetails">
              <article>
                <span>Full name</span>
                <strong>{displayName}</strong>
              </article>
              <article>
                <span>Email address</span>
                <strong>{currentUser.email || "Not available"}</strong>
              </article>
              <article>
                <span>Member since</span>
                <strong>{formatAccountDate(currentUser.created_at)}</strong>
              </article>
              <article>
                <span>Last sign in</span>
                <strong>{formatAccountDate(currentUser.last_sign_in_at)}</strong>
              </article>
              <article>
                <span>Sign-in method</span>
                <strong className="profileProvider">
                  {currentUser.app_metadata?.provider === "google" ? "Google" : "Email"}
                </strong>
              </article>
              <article>
                <span>Account status</span>
                <strong className="profileActive">Active</strong>
              </article>
            </div>
          </div>
        )}
      </section>

      {(authOpen || passwordRecovery) && (
        <AuthModal
          key={entryMode}
          open={authOpen}
          initialMode={entryMode}
          onClose={() => setAuthOpen(false)}
        />
      )}
    </main>
  );
}
