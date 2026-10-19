"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X, BookOpen, GraduationCap, LayoutDashboard, UserCircle, LogOut, ChevronDown } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import "@/styles/Navbar.css";

interface NavbarProps {
  onLogin?: () => void;
  onSignUp?: () => void;
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  const closeMenu = () => setMobileMenuOpen(false);

  const handleProtectedNavigation = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (mobileMenuOpen) closeMenu();
    if (!loading && !currentUser) {
      e.preventDefault();
      if (onLogin) onLogin();
    }
  };

  return (
    <nav className="navbar" aria-label="Main navigation">
      <Link className="brand" href="/" aria-label="ClimbUP Courses home">
        <Image src="/logo-transparent.png" alt="ClimbUP logo" width={38} height={38} priority />
        <span>ClimbUP</span>
      </Link>

      <div className="navLinks" aria-label="Main sections">
        <Link className={pathname === "/" ? "active" : undefined} href="/">
          Home
        </Link>
        <Link className={pathname.startsWith("/courses") ? "active" : undefined} href="/courses">
          Explore Courses
        </Link>
        <Link
          className={pathname.startsWith("/my-courses") ? "active" : undefined}
          href="/my-courses"
          onClick={handleProtectedNavigation}
        >
          My Learning
        </Link>
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
                    width={34}
                    height={34}
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  getInitials(displayName)
                )}
              </span>
              <span className="userNameText">{displayName}</span>
              <ChevronDown size={14} className={`profileChevron ${profileOpen ? "open" : ""}`} aria-hidden />
            </button>

            {profileOpen && (
              <div className="profileDropdown" role="menu">
                <div className="profileDropdownHeader">
                  <strong>{displayName}</strong>
                  <span>{currentUser.email}</span>
                </div>
                <Link role="menuitem" href="/my-courses" onClick={() => setProfileOpen(false)}>
                  <LayoutDashboard size={16} />
                  My Learning Hub
                </Link>
                <Link role="menuitem" href="/courses" onClick={() => setProfileOpen(false)}>
                  <BookOpen size={16} />
                  Browse All Courses
                </Link>
                <Link role="menuitem" href="/profile" onClick={() => setProfileOpen(false)}>
                  <UserCircle size={16} />
                  My Profile & Certificates
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  className="profileLogout"
                  onClick={handleLogout}
                  disabled={signingOut}
                >
                  <LogOut size={16} />
                  {signingOut ? "Signing out..." : "Log out"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="desktopAuthButtons">
            <button type="button" className="loginBtn" onClick={() => onLogin?.()}>
              Log In
            </button>
            <button type="button" className="signupBtn" onClick={() => onSignUp?.()}>
              Get Started Free
            </button>
          </div>
        )}

        <button className="mobileMenuBtn" aria-label="Open Menu" onClick={() => setMobileMenuOpen(true)}>
          <Menu size={28} />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="mobileMenuOverlay">
          <div className="mobileMenuHeader">
            <Link className="brand mobileBrand" href="/" onClick={closeMenu}>
              <Image src="/logo-transparent.png" alt="ClimbUP logo" width={38} height={38} />
              <span>ClimbUP</span>
            </Link>
            <button className="mobileMenuCloseBtn" onClick={closeMenu}>
              <X size={26} />
            </button>
          </div>
          
          <div className="mobileNavLinks">
            <Link className={pathname === "/" ? "active" : undefined} href="/" onClick={closeMenu}>
              Home
            </Link>
            <Link className={pathname.startsWith("/courses") ? "active" : undefined} href="/courses" onClick={closeMenu}>
              Explore Courses
            </Link>
            <Link
              className={pathname.startsWith("/my-courses") ? "active" : undefined}
              href="/my-courses"
              onClick={(e) => { closeMenu(); handleProtectedNavigation(e); }}
            >
              My Learning
            </Link>
            {currentUser && (
              <Link className={pathname.startsWith("/profile") ? "active" : undefined} href="/profile" onClick={closeMenu}>
                My Profile
              </Link>
            )}
          </div>

          {!currentUser && (
            <div className="mobileAuthButtons">
              <button type="button" className="loginBtn" onClick={() => { closeMenu(); onLogin?.(); }}>
                Log In
              </button>
              <button type="button" className="signupBtn" onClick={() => { closeMenu(); onSignUp?.(); }}>
                Get Started Free
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
