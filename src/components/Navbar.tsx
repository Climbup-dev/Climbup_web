"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import AuthModal from "./AuthModal";

export default function Navbar() {
  const pathname = usePathname();
  const { currentUser, logout } = useAuth();
  const { showToast } = useToast();
  const [authOpen, setAuthOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const isHome = pathname === "/";
  const isLearnSphereRoute =
    pathname === "/" ||
    pathname === "/profile" ||
    pathname.startsWith("/subjects") ||
    pathname.startsWith("/papers");

  const name =
    currentUser?.user_metadata?.full_name ||
    currentUser?.user_metadata?.name ||
    currentUser?.email ||
    "User";
  const avatarUrl = currentUser?.user_metadata?.avatar_url as
    | string
    | undefined;
  const showAvatar = Boolean(avatarUrl && failedAvatarUrl !== avatarUrl);
  const initial = (name || "U")[0].toUpperCase();

  async function handleLogout() {
    await logout();
    showToast("Signed out successfully", "info");
  }

  function openAuthModal() {
    setAuthOpen(true);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!isLearnSphereRoute) return;

    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, [isLearnSphereRoute]);

  if (isLearnSphereRoute) {
    const landingLinks = [
      ["Courses", isHome ? "#courses" : "/#courses"],
      ["Live Classes", isHome ? "#features" : "/#features"],
      ["PYQ Bank", isHome ? "#popular-courses" : "/#popular-courses"],
      ["Placement", isHome ? "#placement" : "/#placement"],
    ];

    return (
      <>
        <nav className={`ls-navbar ${scrolled || menuOpen ? "scrolled" : ""}`}>
          <div className="ls-navbar-inner">
            <Link className="ls-wordmark" href="/">
              <span />
              ClimbUP
            </Link>
            <div className="ls-nav-links">
              {landingLinks.map(([label, href]) => (
                <a key={label} href={href} onClick={() => setMenuOpen(false)}>
                  {label}
                </a>
              ))}
            </div>
            <div className="ls-nav-actions">
              {!currentUser && (
                <>
                  <button
                    type="button"
                    className="ls-login-btn"
                    onPointerDown={openAuthModal}
                    onClick={openAuthModal}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    className="ls-nav-start"
                    onPointerDown={openAuthModal}
                    onClick={openAuthModal}
                  >
                    Start Free
                  </button>
                </>
              )}
              {currentUser && (
                <>
                  <Link className="ls-user-chip" href="/profile">
                    {showAvatar ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={avatarUrl} alt="" onError={() => setFailedAvatarUrl(avatarUrl ?? null)} />
                        <span>{name.split(" ")[0]}</span>
                      </>
                    ) : (
                      <>
                        <b>{initial}</b>
                        <span>{name.split(" ")[0]}</span>
                      </>
                    )}
                  </Link>
                  <button type="button" className="ls-login-btn" onClick={handleLogout}>
                    Sign Out
                  </button>
                </>
              )}
            </div>
            <button
              type="button"
              className={`ls-menu-btn ${menuOpen ? "open" : ""}`}
              onClick={() => setMenuOpen((value) => !value)}
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
          <div className={`ls-mobile-drawer ${menuOpen ? "open" : ""}`}>
            {landingLinks.map(([label, href]) => (
              <a key={label} href={href} onClick={() => setMenuOpen(false)}>
                {label}
              </a>
            ))}
            {!currentUser && (
              <>
                <button
                  type="button"
                  className="ls-login-btn"
                  onPointerDown={openAuthModal}
                  onClick={openAuthModal}
                >
                  Log In
                </button>
                <button
                  type="button"
                  className="ls-nav-start"
                  onPointerDown={openAuthModal}
                  onClick={openAuthModal}
                >
                  Start Free
                </button>
              </>
            )}
            {currentUser && (
              <>
                <Link
                  className="ls-user-chip"
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                >
                  {showAvatar ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={avatarUrl} alt="" onError={() => setFailedAvatarUrl(avatarUrl ?? null)} />
                      <span>{name.split(" ")[0]}</span>
                    </>
                  ) : (
                    <>
                      <b>{initial}</b>
                      <span>{name.split(" ")[0]}</span>
                    </>
                  )}
                </Link>
                <button type="button" className="ls-login-btn" onClick={handleLogout}>
                  Sign Out
                </button>
              </>
            )}
          </div>
        </nav>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </>
    );
  }

  return (
    <>
      <nav className="navbar" id="navbar">
        <Link className="navbar-logo" href="/">
          <div className="logo-icon">CU</div>
          Climb<span>UP</span>
        </Link>
        <div className="navbar-nav">
          <Link className="nav-link" href="/subjects">
            Subjects
          </Link>
          {currentUser && (
            <Link className="nav-link" href="/profile">
              Profile
            </Link>
          )}
        </div>
        <div className="navbar-right" id="navbar-right">
          {!currentUser && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              id="login-btn"
              onPointerDown={openAuthModal}
              onClick={openAuthModal}
            >
              Sign In
            </button>
          )}
          {currentUser && (
            <>
              <Link className="user-avatar-btn" href="/profile" id="user-avatar-btn">
                {showAvatar ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={avatarUrl} alt="" onError={() => setFailedAvatarUrl(avatarUrl ?? null)} />
                    <span>{name.split(" ")[0]}</span>
                  </>
                ) : (
                  <>
                    <div className="avatar-placeholder">{initial}</div>
                    <span>{name.split(" ")[0]}</span>
                  </>
                )}
              </Link>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                id="logout-btn"
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      </nav>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
