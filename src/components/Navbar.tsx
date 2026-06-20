"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import AuthModal from "./AuthModal";

export default function Navbar() {
  const pathname = usePathname();

  const {
    currentUser,
    profileImage,
    loading,
    logout,
  } = useAuth();

  const { showToast } = useToast();

  const [authOpen, setAuthOpen] =
    useState(false);

  const [scrolled, setScrolled] =
    useState(false);

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [
    failedAvatarUrl,
    setFailedAvatarUrl,
  ] = useState<string | null>(null);

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

  const firstName =
    name.split(" ")[0] || "User";

  const initial =
    firstName[0]?.toUpperCase() || "U";

  const metadataAvatar =
    typeof currentUser?.user_metadata
      ?.avatar_url === "string"
      ? currentUser.user_metadata.avatar_url
      : typeof currentUser?.user_metadata
            ?.picture === "string"
        ? currentUser.user_metadata.picture
        : null;

  const avatarUrl =
    profileImage || metadataAvatar;

  const showAvatar = Boolean(
    avatarUrl &&
      failedAvatarUrl !== avatarUrl
  );

  useEffect(() => {
    setFailedAvatarUrl(null);
  }, [avatarUrl]);

  async function handleLogout() {
    try {
      setMenuOpen(false);
      setAuthOpen(false);

      await logout();

      showToast(
        "Signed out successfully",
        "info"
      );
    } catch {
      showToast(
        "Unable to sign out. Please try again.",
        "error"
      );
    }
  }

  function openAuthModal() {
    setMenuOpen(false);

    if (loading) return;

    if (currentUser) {
      showToast(
        "You are already signed in",
        "info"
      );
      return;
    }

    setAuthOpen(true);
  }

  useEffect(() => {
    if (!isLearnSphereRoute) return;

    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };

    handleScroll();

    window.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true,
      }
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, [isLearnSphereRoute]);

  useEffect(() => {
    if (currentUser && authOpen) {
      setAuthOpen(false);
    }
  }, [currentUser, authOpen]);

  const renderUserChip = (
    mobile = false
  ) => (
    <Link
      className="ls-user-chip"
      href="/profile"
      onClick={
        mobile
          ? () => setMenuOpen(false)
          : undefined
      }
    >
      {showAvatar && avatarUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            onError={() =>
              setFailedAvatarUrl(avatarUrl)
            }
          />

          <span>{firstName}</span>
        </>
      ) : (
        <>
          <b>{initial}</b>
          <span>{firstName}</span>
        </>
      )}
    </Link>
  );

  if (isLearnSphereRoute) {
    const landingLinks = [
      [
        "Courses",
        isHome
          ? "#courses"
          : "/#courses",
      ],
      [
        "Live Classes",
        isHome
          ? "#features"
          : "/#features",
      ],
      [
        "PYQ Bank",
        isHome
          ? "#popular-courses"
          : "/#popular-courses",
      ],
      [
        "Placement",
        isHome
          ? "#placement"
          : "/#placement",
      ],
    ];

    return (
      <>
        <nav
          className={`ls-navbar ${
            scrolled || menuOpen
              ? "scrolled"
              : ""
          }`}
        >
          <div className="ls-navbar-inner">
            <Link
              className="ls-wordmark"
              href="/"
            >
              <span />
              ClimbUP
            </Link>

            <div className="ls-nav-links">
              {landingLinks.map(
                ([label, href]) => (
                  <a
                    key={label}
                    href={href}
                    onClick={() =>
                      setMenuOpen(false)
                    }
                  >
                    {label}
                  </a>
                )
              )}
            </div>

            <div className="ls-nav-actions">
              {!loading && !currentUser && (
                <>
                  <button
                    type="button"
                    className="ls-login-btn"
                    onClick={openAuthModal}
                  >
                    Log In
                  </button>

                  <button
                    type="button"
                    className="ls-nav-start"
                    onClick={openAuthModal}
                  >
                    Start Free
                  </button>
                </>
              )}

              {!loading && currentUser && (
                <>
                  {renderUserChip()}

                  <button
                    type="button"
                    className="ls-login-btn"
                    onClick={handleLogout}
                  >
                    Sign Out
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              className={`ls-menu-btn ${
                menuOpen ? "open" : ""
              }`}
              onClick={() =>
                setMenuOpen(
                  (current) => !current
                )
              }
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
            >
              <span />
              <span />
              <span />
            </button>
          </div>

          <div
            className={`ls-mobile-drawer ${
              menuOpen ? "open" : ""
            }`}
          >
            {landingLinks.map(
              ([label, href]) => (
                <a
                  key={label}
                  href={href}
                  onClick={() =>
                    setMenuOpen(false)
                  }
                >
                  {label}
                </a>
              )
            )}

            {!loading && !currentUser && (
              <>
                <button
                  type="button"
                  className="ls-login-btn"
                  onClick={openAuthModal}
                >
                  Log In
                </button>

                <button
                  type="button"
                  className="ls-nav-start"
                  onClick={openAuthModal}
                >
                  Start Free
                </button>
              </>
            )}

            {!loading && currentUser && (
              <>
                {renderUserChip(true)}

                <button
                  type="button"
                  className="ls-login-btn"
                  onClick={handleLogout}
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </nav>

        <AuthModal
          open={authOpen}
          onClose={() =>
            setAuthOpen(false)
          }
        />
      </>
    );
  }

  return (
    <>
      <nav
        className="navbar"
        id="navbar"
      >
        <Link
          className="navbar-logo"
          href="/"
        >
          <div className="logo-icon">
            CU
          </div>

          Climb<span>UP</span>
        </Link>

        <div className="navbar-nav">
          <Link
            className="nav-link"
            href="/subjects"
          >
            Subjects
          </Link>

          {!loading && currentUser && (
            <Link
              className="nav-link"
              href="/profile"
            >
              Profile
            </Link>
          )}
        </div>

        <div
          className="navbar-right"
          id="navbar-right"
        >
          {!loading && !currentUser && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              id="login-btn"
              onClick={openAuthModal}
            >
              Sign In
            </button>
          )}

          {!loading && currentUser && (
            <>
              <Link
                className="user-avatar-btn"
                href="/profile"
                id="user-avatar-btn"
              >
                {showAvatar &&
                avatarUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatarUrl}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedAvatarUrl(
                          avatarUrl
                        )
                      }
                    />

                    <span>{firstName}</span>
                  </>
                ) : (
                  <>
                    <div className="avatar-placeholder">
                      {initial}
                    </div>

                    <span>{firstName}</span>
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

      <AuthModal
        open={authOpen}
        onClose={() =>
          setAuthOpen(false)
        }
      />
    </>
  );
}