"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import "@/styles/Navbar.css";

interface NavbarProps {
  onLogin: () => void;
  onSignUp: () => void;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

export default function Navbar({ onLogin, onSignUp }: NavbarProps) {
  const { currentUser, profileImage, loading, logout } = useAuth();
  const { showToast } = useToast();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const displayName =
    currentUser?.user_metadata?.full_name ||
    currentUser?.user_metadata?.name ||
    currentUser?.email?.split("@")[0] ||
    "Member";

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);

    try {
      await logout();
      setProfileOpen(false);
      showToast("Signed out successfully.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sign out right now.";
      showToast(message, "error");
    } finally {
      setSigningOut(false);
    }
  };

  useEffect(() => {
    if (!profileOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen]);

  return (
    <nav className="navbar" aria-label="Main navigation">
      <Link className="brand" href="/" aria-label="ClimbUP home">
        <Image src="/logo.png" alt="ClimbUP logo" width={52} height={52} priority />
        <span>ClimbUP</span>
      </Link>

      <div className="navLinks" aria-label="Home sections">
        <div className="navLinks" aria-label="Main sections">
          <Link className={pathname === "/" ? "active" : undefined} href="/">Home</Link>
          <Link className={pathname === "/pyqs" ? "active" : undefined} href="/pyqs">PYQs</Link>
          <Link className={pathname === "/discoveries" ? "active" : undefined} href="/discoveries">Discoveries</Link>
          <Link className={pathname === "/jobs" ? "active" : undefined} href="/jobs">Job Prepration</Link>
        </div>
      </div>

      <div className="navActions">
        {loading ? (
          <span className="authStatus" role="status">Checking session...</span>
        ) : currentUser ? (
          <div className="profileMenuWrap" ref={profileMenuRef}>
            <button
              type="button"
              className="profileTrigger"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              aria-label={`Open ${displayName}'s profile menu`}
              onClick={() => setProfileOpen((value) => !value)}
            >
              <span className="userAvatar" aria-hidden>
                {profileImage && !avatarError ? (
                  <Image
                    src={profileImage}
                    alt=""
                    width={44}
                    height={44}
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  getInitials(displayName)
                )}
              </span>
              <span className="userIdentity">
                <strong>{displayName}</strong>
                <small>View profile</small>
              </span>
              <span className={`profileChevron ${profileOpen ? "open" : ""}`} aria-hidden>⌄</span>
            </button>

            {profileOpen && (
              <div className="profileDropdown" role="menu">
                <div className="profileDropdownHeader">
                  <strong>{displayName}</strong>
                  <span>{currentUser.email}</span>
                </div>
                <Link role="menuitem" href="/profile" onClick={() => setProfileOpen(false)}>
                  <span aria-hidden>◉</span>
                  Open profile
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  className="profileLogout"
                  onClick={handleLogout}
                  disabled={signingOut}
                >
                  <span aria-hidden>↗</span>
                  {signingOut ? "Signing out..." : "Log out"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <button type="button" className="loginBtn" onClick={onLogin}>Log In</button>
            <button type="button" className="signupBtn" onClick={onSignUp}>Sign Up</button>
          </>
        )}
      </div>
    </nav>
  );
}
