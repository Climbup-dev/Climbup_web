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
      <section className="featuredCoursesSection" id="featured-courses">
        <div className="featuredSectionContainer">
          <div className="featuredSectionIntro">
            <span className="featuredSectionLabel">
              Practical Skills Over Rote Learning
            </span>
            <h2 className="featuredSectionTitle">
              Hands-on Project Learning Paths
            </h2>
            <p className="featuredSectionDesc">
              Writing real code, resolving runtime errors, and building functional applications is how true developers are made. Theory gives definitions — building projects gives real engineering intuition.
            </p>
          </div>

          {/* Course Cards Grid - Perfectly Centered on Mobile, Tablet & PC */}
          <div className="featuredCoursesGrid">
            {displayedCourses.map((course) => (
              <div key={course.id} className="featuredCourseCard">
                {/* Course Thumbnail */}
                <div className="featuredThumbnailWrapper">
                  <Image
                    src={course.thumbnail}
                    alt={course.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    className="featuredThumbnailImg"
                  />
                  <div className="featuredThumbnailOverlay" />

                  <span className="featuredCategoryBadge">
                    {course.category}
                  </span>

                  <span className="featuredLevelBadge">
                    {course.level}
                  </span>
                </div>

                {/* Course Body */}
                <div className="featuredCardBody">
                  <div className="featuredRatingRow">
                    <div className="featuredRatingGroup">
                      <Star size={15} color="#f59e0b" fill="#f59e0b" />
                      <strong>{course.rating}</strong>
                      <span className="featuredReviewsCount">
                        ({course.reviewsCount.toLocaleString()} reviews)
                      </span>
                    </div>

                    <span className="featuredLearnersCount">
                      {course.studentsEnrolled?.toLocaleString() || "1,200+"} learners
                    </span>
                  </div>

                  <h3 className="featuredCardTitle">
                    {course.title}
                  </h3>

                  <p className="featuredCardTagline">
                    {course.tagline}
                  </p>

                  {/* Metadata Row */}
                  <div className="featuredMetadataRow">
                    <span className="featuredMetaItem">
                      <Clock size={14} /> {course.duration}
                    </span>
                    <span className="featuredMetaItem">
                      <Layers size={14} /> {course.totalLessons} Lessons
                    </span>
                    <span className="featuredMetaItem">
                      <FileCheck size={14} /> {course.assignments.length} Assignments
                    </span>
                  </div>

                  {/* Action Button */}
                  {currentUser ? (
                    <Link
                      href={`/courses/${course.id}`}
                      className="featuredActionBtn"
                    >
                      Enter Classroom & Projects <ArrowRight size={15} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openAuth("register")}
                      className="featuredActionBtn"
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
