"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Play, 
  BookOpen, 
  ArrowRight,
  Clock,
  CheckCircle2
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileNavTabs from "@/components/MobileNavTabs";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { 
  fetchAllCourses,
  getUserEnrolledCourseIdsAsync, 
  getCompletedLessonIdsAsync 
} from "@/lib/courses/coursesService";
import { Course } from "@/types/courses";
import "@/styles/MyCourses.css";

export default function MyCoursesPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [completionsMap, setCompletionsMap] = useState<Record<string, number>>({});
  const [filterTab, setFilterTab] = useState<"all" | "in-progress" | "completed">("all");
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadUserCourses() {
      setFetching(true);
      try {
        const allCourses = await fetchAllCourses();
        const enrolledIds = await getUserEnrolledCourseIdsAsync(currentUser?.id);
        const matched = allCourses.filter((c) => enrolledIds.includes(c.id));
        if (!isMounted) return;
        setEnrolledCourses(matched);

        const progressObj: Record<string, number> = {};
        for (const c of matched) {
          const completed = await getCompletedLessonIdsAsync(c.id, currentUser?.id);
          const total = c.modules.flatMap((m) => m.lessons).length;
          progressObj[c.id] = total > 0 ? Math.round((completed.length / total) * 100) : 0;
        }
        if (isMounted) setCompletionsMap(progressObj);
      } catch (err) {
        console.error("Failed to load enrolled courses:", err);
      } finally {
        if (isMounted) setFetching(false);
      }
    }
    loadUserCourses();
    return () => { isMounted = false; };
  }, [currentUser?.id]);

  const displayName =
    currentUser?.user_metadata?.full_name ||
    currentUser?.user_metadata?.name ||
    currentUser?.email?.split("@")[0] ||
    "Student";

  const inProgressCourses = enrolledCourses.filter((c: Course) => (completionsMap[c.id] || 0) < 100);
  const completedCourses = enrolledCourses.filter((c: Course) => (completionsMap[c.id] || 0) === 100);

  const displayedCourses: Course[] = 
    filterTab === "in-progress"
      ? inProgressCourses
      : filterTab === "completed"
      ? completedCourses
      : enrolledCourses;

  return (
    <div className="myCoursesWrapper">
      {/* Background & Grid (Identical to Home Hero Section) */}
      <div className="myCoursesBackgroundWrapper" aria-hidden="true">
        <Image
          src="/hero-bg-v2.webp"
          alt="ClimbUP My Courses Background"
          className="myCoursesBgImage"
          fill
          priority
          quality={85}
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />
        <div className="myCoursesOverlay" />
        <div className="myCoursesGridPattern" />
        <div className="myCoursesAmbientGlow" />
      </div>

      <Navbar
        onLogin={() => { setAuthMode("login"); setAuthOpen(true); }}
        onSignUp={() => { setAuthMode("register"); setAuthOpen(true); }}
      />
      <MobileNavTabs />

      <main className="myCoursesMain">
        {/* Executive Header */}
        <div className="dashboardHeader">
          <div>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(56, 211, 153, 0.12)",
              border: "1px solid rgba(56, 211, 153, 0.3)",
              padding: "3px 10px",
              borderRadius: "99px",
              fontSize: "11px",
              fontWeight: 700,
              color: "#34d399",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.04em"
            }}>
              <span style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#34d399",
                boxShadow: "0 0 6px #34d399"
              }} />
              Campus Engineering Collective
            </div>
            <h1 className="dashboardGreetingTitle">
              Welcome back, {displayName}
            </h1>
            <p className="dashboardGreetingSub">
              {enrolledCourses.length === 0
                ? "You haven't enrolled in any courses yet. Start building alongside fellow engineering students."
                : `You have ${enrolledCourses.length} ${enrolledCourses.length === 1 ? "masterclass" : "masterclasses"} in progress with the collective.`}
            </p>
          </div>

          <div className="dashboardHeaderActions">
            <Link href="/courses" className="exploreCatalogBtn">
              <span>Explore Collective Catalog</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Filter Tabs Bar */}
        {enrolledCourses.length > 0 && (
          <div className="dashboardFilterRow">
            <div className="filterTabsList" role="tablist">
              <button
                type="button"
                className={`filterTabBtn ${filterTab === "all" ? "active" : ""}`}
                onClick={() => setFilterTab("all")}
              >
                <span>All Courses</span>
                <span className="tabCountBadge">{enrolledCourses.length}</span>
              </button>
              <button
                type="button"
                className={`filterTabBtn ${filterTab === "in-progress" ? "active" : ""}`}
                onClick={() => setFilterTab("in-progress")}
              >
                <span>In Progress</span>
                <span className="tabCountBadge">{inProgressCourses.length}</span>
              </button>
              <button
                type="button"
                className={`filterTabBtn ${filterTab === "completed" ? "active" : ""}`}
                onClick={() => setFilterTab("completed")}
              >
                <span>Completed</span>
                <span className="tabCountBadge">{completedCourses.length}</span>
              </button>
            </div>
          </div>
        )}

        {/* Enrolled Courses Grid */}
        {displayedCourses.length === 0 ? (
          <div className="enrolledEmptyState">
            <BookOpen size={36} color="#34d399" style={{ margin: "0 auto 12px" }} />
            <h3>
              {filterTab === "completed" 
                ? "No completed courses yet" 
                : "No courses found"}
            </h3>
            <p>
              {filterTab === "completed"
                ? "Keep learning and completing lessons to finish your courses."
                : "Explore our masterclasses and start your learning journey today."}
            </p>
            <Link href="/courses" className="emptyBrowseBtn">
              Explore Courses <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="enrolledGrid">
            {displayedCourses.map((course) => {
              const progress = completionsMap[course.id] || 0;
              const totalLessons = course.modules.flatMap((m) => m.lessons).length;
              const completedCount = Math.round((progress / 100) * totalLessons);
              const nextLesson = course.modules[0]?.lessons[1] || course.modules[0]?.lessons[0];

              return (
                <div key={course.id} className="enrolledCard">
                  <div className="enrolledThumbWrap">
                    <Image
                      src={course.thumbnail}
                      alt={course.title}
                      fill
                      sizes="380px"
                      style={{ objectFit: "cover" }}
                    />
                    <div className="enrolledThumbOverlay" />
                    <span className="enrolledCategoryBadge">
                      {course.category}
                    </span>
                    <span className="enrolledDurationBadge">
                      <Clock size={11} style={{ display: "inline", marginRight: "3px" }} />
                      {course.duration}
                    </span>
                  </div>

                  <div className="enrolledCardBody">
                    <div className="enrolledInstructorRow">
                      <div className="instructorAvatarCircle">
                        {course.instructor.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <span className="instructorNameText">{course.instructor.name}</span>
                    </div>

                    <h3 className="enrolledCardTitle">{course.title}</h3>

                    {nextLesson && progress < 100 && (
                      <p className="nextLessonSnippet">
                        <span className="nextLabel">Next:</span> {nextLesson.title}
                      </p>
                    )}

                    {/* Progress Bar */}
                    <div className="enrolledProgressBlock">
                      <div className="progressLabelRow">
                        <span>{progress === 100 ? "Course Completed" : "Progress"}</span>
                        <strong className="progressPercent">
                          {progress}% {totalLessons > 0 && `(${completedCount}/${totalLessons} lessons)`}
                        </strong>
                      </div>
                      <div className="progressTrack">
                        <div className="progressFill" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    <Link
                      href={`/courses/${course.id}`}
                      className={`enrolledCardBtn ${progress === 100 ? "completed" : ""}`}
                    >
                      {progress === 100 ? (
                        <>
                          <CheckCircle2 size={15} /> Review Course
                        </>
                      ) : progress > 0 ? (
                        <>
                          <Play size={14} fill="currentColor" /> Resume Lesson
                        </>
                      ) : (
                        <>
                          <Play size={14} fill="currentColor" /> Start Learning
                        </>
                      )}
                    </Link>
                  </div>
                </div>
              );
            })}
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
