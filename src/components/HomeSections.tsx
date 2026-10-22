"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  Play, 
  Sparkles, 
  BookOpen, 
  Star, 
  Clock, 
  Layers, 
  FileCheck, 
  ArrowRight
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { fetchAllCourses } from "@/lib/courses/coursesService";
import { Course } from "@/types/courses";
import "@/styles/HomeSections.css";

type EntryMode = "login" | "register";

const AuthModal = dynamic(() => import("@/components/AuthModal"), {
  ssr: false,
  loading: () => null,
});

export default function HomeSections() {
  const { currentUser, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>("login");
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadLiveCourses() {
      try {
        const live = await fetchAllCourses();
        if (isMounted && live && live.length > 0) {
          setCourses(live);
        }
      } catch (err) {
        console.warn("HomeSections fetchAllCourses fallback:", err);
      }
    }
    loadLiveCourses();
    return () => { isMounted = false; };
  }, []);

  const openAuth = (mode: EntryMode) => {
    setEntryMode(mode);
    setAuthOpen(true);
  };

  const displayedCourses = courses;

  return (
    <div className="homeSections">
      {/* ── Section 1: Featured Courses ── */}
      <section className="startupSection" id="featured-courses" style={{ padding: "64px 24px" }}>
        <div className="sectionContainer" style={{ maxWidth: "1240px", margin: "0 auto" }}>
          <div className="sectionIntro" style={{ textAlign: "center", marginBottom: "36px" }}>
            <span style={{
              color: "#60a5fa",
              background: "rgba(37, 99, 235, 0.14)",
              padding: "4px 14px",
              borderRadius: "99px",
              fontSize: "12px",
              fontWeight: 700,
              display: "inline-block",
              marginBottom: "12px",
              letterSpacing: "0.04em",
              textTransform: "uppercase"
            }}>
              Practical Skills Over Rote Learning
            </span>
            <h2 style={{ fontSize: "32px", fontWeight: 800, color: "#fff", marginBottom: "8px", letterSpacing: "-0.02em" }}>
              Hands-on Project Learning Paths
            </h2>
            <p style={{ color: "#94a3b8", maxWidth: "660px", margin: "0 auto", fontSize: "15px", lineHeight: "1.6" }}>
              Writing real code, resolving runtime errors, and building functional applications is how true developers are made. Theory gives definitions — building projects gives real engineering intuition.
            </p>
          </div>


          {/* Course Cards Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "28px",
          }}>
            {displayedCourses.map((course) => (
              <div
                key={course.id}
                style={{
                  background: "linear-gradient(145deg, rgba(10, 21, 40, 0.85), rgba(6, 14, 28, 0.95))",
                  border: "1px solid rgba(59, 130, 246, 0.25)",
                  borderRadius: "18px",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
                }}
              >
                {/* Course Thumbnail */}
                <div style={{ position: "relative", height: "190px", width: "100%", overflow: "hidden" }}>
                  <Image
                    src={course.thumbnail}
                    alt={course.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 380px"
                    style={{ objectFit: "cover" }}
                  />
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to top, rgba(6, 14, 28, 0.95), transparent)",
                  }} />

                  <span style={{
                    position: "absolute",
                    top: "12px",
                    left: "12px",
                    background: "rgba(6, 16, 34, 0.85)",
                    color: "#60a5fa",
                    border: "1px solid rgba(59, 130, 246, 0.4)",
                    padding: "3px 10px",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}>
                    {course.category}
                  </span>

                  <span style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    background: "rgba(0, 0, 0, 0.7)",
                    color: "#fff",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 600,
                  }}>
                    {course.level}
                  </span>
                </div>

                {/* Course Body */}
                <div style={{ padding: "20px", display: "flex", flexDirection: "column", flexGrow: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    <Star size={16} color="#f59e0b" fill="#f59e0b" />
                    <strong style={{ color: "#fff", fontSize: "14px" }}>{course.rating}</strong>
                    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>
                      ({course.reviewsCount.toLocaleString()} reviews)
                    </span>
                  </div>

                  <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "8px", lineHeight: "1.4" }}>
                    {course.title}
                  </h3>

                  <p style={{
                    color: "rgba(255,255,255,0.65)",
                    fontSize: "13px",
                    lineHeight: "1.5",
                    marginBottom: "16px",
                    flexGrow: 1,
                  }}>
                    {course.tagline}
                  </p>

                  {/* Metadata Row */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                    marginBottom: "16px",
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.7)",
                  }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <Clock size={14} color="#3b82f6" /> {course.duration}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <Layers size={14} color="#3b82f6" /> {course.totalLessons} Lessons
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <FileCheck size={14} color="#3b82f6" /> {course.assignments.length} Assignments
                    </span>
                  </div>

                  {/* Action Button */}
                  {currentUser ? (
                    <Link
                      href={`/courses/${course.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        width: "100%",
                        padding: "11px",
                        background: "rgba(37, 99, 235, 0.14)",
                        border: "1px solid rgba(59, 130, 246, 0.4)",
                        borderRadius: "10px",
                        color: "#60a5fa",
                        fontWeight: 700,
                        fontSize: "14px",
                        textDecoration: "none",
                        transition: "all 0.2s ease",
                      }}
                    >
                      Enter Classroom & Projects <ArrowRight size={15} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openAuth("register")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        width: "100%",
                        padding: "11px",
                        background: "rgba(37, 99, 235, 0.14)",
                        border: "1px solid rgba(59, 130, 246, 0.4)",
                        borderRadius: "10px",
                        color: "#60a5fa",
                        fontWeight: 700,
                        fontSize: "14px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      Login to Enter Classroom <ArrowRight size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: "40px" }}>
            <Link
              href="/courses"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 28px",
                background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "15px",
                borderRadius: "12px",
                textDecoration: "none",
                boxShadow: "0 0 25px rgba(37, 99, 235, 0.35)",
              }}
            >
              Browse All Peer Courses <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>



      {(authOpen) && (
        <AuthModal
          key={entryMode}
          open={authOpen}
          initialMode={entryMode}
          onClose={() => setAuthOpen(false)}
        />
      )}
    </div>
  );
}
