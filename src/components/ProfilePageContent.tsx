"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { 
  User, 
  Mail, 
  Calendar, 
  Award, 
  BookOpen, 
  FileCheck2, 
  Flame, 
  Clock, 
  ArrowRight,
  LogOut,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileNavTabs from "@/components/MobileNavTabs";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { 
  fetchAllCourses,
  getUserEnrolledCourseIdsAsync, 
  getCompletedLessonIdsAsync 
} from "@/lib/courses/coursesService";
import { Course } from "@/types/courses";
import "@/styles/ProfilePage.css";

function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

export default function ProfilePageContent() {
  const { currentUser, profileImage, loading, logout } = useAuth();
  const { showToast } = useToast();

  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [completedMap, setCompletedMap] = useState<Record<string, number>>({});

  useEffect(() => {
    let isMounted = true;
    async function loadProfileData() {
      try {
        const allCourses = await fetchAllCourses();
        const enrolledIds = await getUserEnrolledCourseIdsAsync(currentUser?.id);
        const matched = allCourses.filter((c) => enrolledIds.includes(c.id));
        if (!isMounted) return;
        setEnrolledCourses(matched);

        const progress: Record<string, number> = {};
        for (const c of matched) {
          const done = await getCompletedLessonIdsAsync(c.id, currentUser?.id);
          const total = c.modules.flatMap((m) => m.lessons).length;
          progress[c.id] = total > 0 ? Math.round((done.length / total) * 100) : 0;
        }
        if (isMounted) setCompletedMap(progress);
      } catch (err) {
        console.error("Failed to load profile course data:", err);
      }
    }
    loadProfileData();
    return () => { isMounted = false; };
  }, [currentUser?.id]);

  const displayName =
    currentUser?.user_metadata?.full_name ||
    currentUser?.user_metadata?.name ||
    currentUser?.email?.split("@")[0] ||
    "Student Member";

  const handleLogout = async () => {
    try {
      await logout();
      showToast("Signed out successfully.", "success");
    } catch {
      showToast("Unable to sign out.", "error");
    }
  };

  const accountDate = currentUser?.created_at
    ? new Date(currentUser.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Member since 2026";

  return (
    <div className="profilePageWrapper">
      <Navbar
        onLogin={() => { setAuthMode("login"); setAuthOpen(true); }}
        onSignUp={() => { setAuthMode("register"); setAuthOpen(true); }}
      />
      <MobileNavTabs />

      <main className="profileMain">
        {/* Profile Card Header */}
        <div className="profileHeaderCard">
          <div className="profileUserGroup">
            <div className="profileAvatar">
              {profileImage ? (
                <Image src={profileImage} alt={displayName} fill style={{ objectFit: "cover" }} />
              ) : (
                getInitials(displayName)
              )}
            </div>

            <div>
              <div className="profileNameRow">
                <h1 className="profileName">{displayName}</h1>
                <span className="profileStudentBadge">
                  Active Student
                </span>
              </div>
              <div className="profileMetaRow">
                <span className="profileMetaItem">
                  <Mail size={14} color="#60a5fa" /> {currentUser?.email || "student@example.com"}
                </span>
                <span className="profileMetaItem">
                  <Calendar size={14} color="#60a5fa" /> {accountDate}
                </span>
              </div>
            </div>
          </div>

          <div className="profileActionsGroup">
            <Link
              href="/my-courses"
              className="hubBtn"
            >
              <BookOpen size={15} /> My Learning Hub
            </Link>

            {currentUser && (
              <button
                type="button"
                onClick={handleLogout}
                className="signOutBtn"
              >
                <LogOut size={15} /> Sign Out
              </button>
            )}
          </div>
        </div>

        {/* Learning Statistics Bar */}
        <div className="profileStatsRow">
          <div className="profileStatCard">
            <span className="statCardHeader">Enrolled Courses</span>
            <div className="statCardValue">
              {enrolledCourses.length}
            </div>
            <span className="statCardSub">Interactive Masterclasses</span>
          </div>

          <div className="profileStatCard">
            <span className="statCardHeader">Assignments Submitted</span>
            <div className="statCardValue">
              2
            </div>
            <span className="statCardSub">Graded with Feedback</span>
          </div>

          <div className="profileStatCard">
            <span className="statCardHeader">MCQ Accuracy</span>
            <div className="statCardValue">
              88%
            </div>
            <span className="statCardSub">Chapter-wise Tests</span>
          </div>

          <div className="profileStatCard">
            <span className="statCardHeader">Certificates</span>
            <div className="statCardValue">
              1
            </div>
            <span className="statCardSub">In Progress</span>
          </div>
        </div>

        {/* Enrolled Courses & Progress List */}
        <div style={{ marginBottom: "36px" }}>
          <h2 className="progressListTitle">
            Active Learning Progress
          </h2>

          <div style={{ display: "grid", gap: "14px" }}>
            {enrolledCourses.map((c) => {
              const progress = completedMap[c.id] || 0;
              return (
                <div
                  key={c.id}
                  className="progressItemCard"
                >
                  <div style={{ maxWidth: "480px" }}>
                    <h3 className="progressItemTitle">{c.title}</h3>
                    <div className="progressItemMeta">
                      {c.category} • {c.duration} • {c.assignments.length} Assignments
                    </div>
                  </div>

                  <div className="progressItemRight">
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px", color: "#60a5fa" }}>
                        <span>Progress</span>
                        <strong>{progress}%</strong>
                      </div>
                      <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "99px", overflow: "hidden" }}>
                        <div style={{ width: `${progress}%`, height: "100%", background: "#3b82f6", borderRadius: "99px" }} />
                      </div>
                    </div>

                    <Link
                      href={`/courses/${c.id}`}
                      className="openCourseBtn"
                    >
                      Open Course →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />

      {authOpen && (
        <AuthModal
          key={authMode}
          open={authOpen}
          initialMode={authMode}
          onClose={() => setAuthOpen(false)}
        />
      )}
    </div>
  );
}
