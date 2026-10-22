"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  Search, 
  Star, 
  Clock, 
  Layers, 
  FileCheck, 
  BookOpen, 
  ArrowRight,
  Sparkles
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileNavTabs from "@/components/MobileNavTabs";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllCourses } from "@/lib/courses/coursesService";
import { Course, CourseLevel } from "@/types/courses";
import "@/styles/CoursesPage.css";

function CoursesContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const { currentUser, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  useEffect(() => {
    let isMounted = true;
    async function loadLiveCourses() {
      setLoadingCourses(true);
      try {
        const liveCourses = await fetchAllCourses();
        if (isMounted && liveCourses && liveCourses.length > 0) {
          setAllCourses(liveCourses);
        }
      } catch (err) {
        console.error("Failed to fetch live courses from Supabase:", err);
      } finally {
        if (isMounted) setLoadingCourses(false);
      }
    }
    loadLiveCourses();
    return () => { isMounted = false; };
  }, []);

  const filteredCourses = useMemo(() => {
    return allCourses.filter((course) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        course.title.toLowerCase().includes(q) ||
        course.description.toLowerCase().includes(q) ||
        course.category.toLowerCase().includes(q) ||
        course.skillsGained.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [allCourses, searchQuery]);

  const openAuth = (mode: "login" | "register") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <div className="coursesPageWrapper">
      {/* Background & Grid (Identical to Home Hero Section) */}
      <div className="coursesBackgroundWrapper" aria-hidden="true">
        <Image
          src="/hero-bg-v2.webp"
          alt="PractiQ Courses Background"
          className="coursesBgImage"
          fill
          priority
          quality={85}
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />
        <div className="coursesOverlay" />
        <div className="coursesGridPattern" />
        <div className="coursesAmbientGlow" />
      </div>

      <Navbar onLogin={() => openAuth("login")} onSignUp={() => openAuth("register")} />
      <MobileNavTabs />

      {/* Course Catalog Header */}
      <section className="coursesHeroSection">
        <div className="coursesHeroContainer">

          {/* Search Bar */}
          <div className="searchContainer">
            <div className="searchBarWrapper">
              <Search size={18} color="#60a5fa" style={{ marginRight: "10px", flexShrink: 0 }} />
              <input
                type="text"
                className="searchInput"
                placeholder="Search courses, skills, or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="clearSearchBtn"
                  onClick={() => setSearchQuery("")}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Course Grid Content */}
      <main style={{ maxWidth: "1240px", margin: "0 auto", padding: "40px 24px 80px", width: "100%", flexGrow: 1, position: "relative", zIndex: 5 }}>

        {loadingCourses ? (
          <div className="coursesLoadingState" style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 24px",
            minHeight: "360px",
            textAlign: "center"
          }}>
            <div style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              border: "3px solid rgba(52, 211, 153, 0.15)",
              borderTopColor: "#60a5fa",
              animation: "spin 0.9s linear infinite",
              marginBottom: "18px"
            }} />
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#f8fafc", marginBottom: "6px" }}>
              Loading Courses...
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "14px" }}>
              Fetching active courses and hands-on workshops...
            </p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="coursesEmptyState">
            <BookOpen size={48} color="#3b82f6" style={{ margin: "0 auto 16px", opacity: 0.6 }} />
            <h3>No courses found</h3>
            <p>
              Try adjusting your search query to find courses.
            </p>
            <button
              type="button"
              className="resetFiltersBtn"
              onClick={() => setSearchQuery("")}
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="coursesGrid">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="courseCard"
              >
                {/* Thumbnail */}
                <div className="cardThumbnailWrapper">
                  <Image
                    src={course.thumbnail}
                    alt={course.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    className="cardThumbnailImage"
                  />
                  <div className="thumbnailOverlay" />

                  <span className="cardCategoryBadge">
                    {course.category}
                  </span>

                  <span className="cardLevelBadge">
                    {course.level}
                  </span>
                </div>

                {/* Content */}
                <div className="cardBody">
                  {/* Rating & Students */}
                  <div className="cardRatingRow">
                    <div className="cardRatingGroup">
                      <Star size={15} color="#f59e0b" fill="#f59e0b" />
                      <strong>{course.rating}</strong>
                      <span className="cardReviewsCount">
                        ({course.reviewsCount})
                      </span>
                    </div>

                    <span className="cardLearnersCount">
                      {course.studentsEnrolled.toLocaleString()} learners
                    </span>
                  </div>

                  <h2 className="cardTitle">
                    {course.title}
                  </h2>

                  <p className="cardTagline">
                    {course.tagline}
                  </p>

                  {/* Skills badges */}
                  <div className="cardSkillsList">
                    {course.skillsGained.slice(0, 3).map((skill) => (
                      <span
                        key={skill}
                        className="cardSkillBadge"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* Course stats row */}
                  <div className="cardStatsRow">
                    <span className="cardStatItem">
                      <Clock size={14} color="#3b82f6" /> {course.duration}
                    </span>
                    <span className="cardStatItem">
                      <Layers size={14} color="#3b82f6" /> {course.totalLessons} Lessons
                    </span>
                    <span className="cardStatItem">
                      <FileCheck size={14} color="#3b82f6" /> {course.assignments.length} Assignments
                    </span>
                  </div>

                  {/* Instructor & CTA */}
                  <div className="cardFooter">
                    <div className="cardInstructorGroup">
                      <div className="cardInstructorAvatar">
                        <Image
                          src={course.instructor.avatar}
                          alt={course.instructor.name}
                          fill
                          sizes="32px"
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                      <span className="cardInstructorName">
                        {course.instructor.name}
                      </span>
                    </div>

                    {currentUser ? (
                      <Link
                        href={`/courses/${course.id}`}
                        className="cardEnterBtn"
                      >
                        Enter Course <ArrowRight size={14} />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openAuth("register")}
                        className="cardEnterBtn"
                        style={{ border: "none", cursor: "pointer" }}
                      >
                        Login to Enter <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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

export default function CoursesPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#021526" }} />}>
      <CoursesContent />
    </Suspense>
  );
}
