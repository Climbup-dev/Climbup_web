"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Play, 
  CheckCircle2, 
  Circle, 
  Clock, 
  FileCheck2, 
  BrainCircuit, 
  Award, 
  FolderDown, 
  MessageSquare, 
  Sparkles, 
  Send, 
  ArrowLeft, 
  ExternalLink, 
  Code2, 
  Timer,
  Lock,
  RefreshCw,
  Gauge,
  Settings2
} from "lucide-react";

import Navbar from "@/components/Navbar";
import MobileNavTabs from "@/components/MobileNavTabs";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { 
  fetchCourseById,
  getUserEnrolledCourseIdsAsync, 
  enrollInCourse, 
  getCompletedLessonIdsAsync, 
  toggleLessonCompletion,
  getAssignmentSubmissionAsync,
  submitAssignment,
} from "@/lib/courses/coursesService";
import { Course, CourseLesson, CourseAssignment } from "@/types/courses";
import { LectureChatbot } from "@/components/LectureChatbot";
import { parseTimestampToSeconds } from "@/utils/ragHelpers";
import { getVideoTypeAndEmbedUrl } from "@/utils/videoHelpers";
import "@/styles/ClassroomTabs.css";

type TabType = "overview" | "assignments" | "mcqs" | "resources" | "syllabus" | "rag" | "discussions" | "certificate";

export default function CourseClassroomClient({ courseId }: { courseId: string }) {
  const router = useRouter();
  const { currentUser, loading } = useAuth();
  const { showToast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("assignments");
  const [sidebarTab, setSidebarTab] = useState<"curriculum" | "rag">("curriculum");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPlaybackError, setVideoPlaybackError] = useState(false);

  // Cross-browser universal video resolution (YouTube embed/shorts, Google Drive, and MP4/WebM uploads)
  const resolvedVideo = useMemo(() => {
    return getVideoTypeAndEmbedUrl(activeLesson?.videoUrl || "");
  }, [activeLesson?.videoUrl]);

  // Video Speed & Quality Controls State
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [selectedQuality, setSelectedQuality] = useState<string>("Auto (1080p)");
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    const iframe = document.getElementById("classroom-video-player") as HTMLIFrameElement | null;
    if (iframe && resolvedVideo.type === "youtube") {
      try {
        iframe.contentWindow?.postMessage(
          JSON.stringify({
            event: "command",
            func: "setPlaybackRate",
            args: [speed],
          }),
          "*"
        );
      } catch {}
    }
    showToast(`Speed set to ${speed}x`, "info");
  };

  const handleQualityChange = (quality: string) => {
    setSelectedQuality(quality);
    setShowQualityMenu(false);
    const iframe = document.getElementById("classroom-video-player") as HTMLIFrameElement | null;
    if (iframe && resolvedVideo.type === "youtube") {
      const qCode = quality.includes("1080") ? "hd1080" : quality.includes("720") ? "hd720" : quality.includes("480") ? "large" : "medium";
      try {
        iframe.contentWindow?.postMessage(
          JSON.stringify({
            event: "command",
            func: "setPlaybackQuality",
            args: [qCode],
          }),
          "*"
        );
      } catch {}
    }
    showToast(`Streaming Quality: ${quality}`, "info");
  };

  // Enrollment & Progress
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  
  // Assignment State
  const [selectedAssignment, setSelectedAssignment] = useState<CourseAssignment | null>(null);
  const [submissionCode, setSubmissionCode] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [assignmentFeedback, setAssignmentFeedback] = useState<any>(null);

  // MCQ State
  const [activeQuizQuestionIdx, setActiveQuizQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  const [activeTimestampBanner, setActiveTimestampBanner] = useState<string | null>(null);

  // Auth modal
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  // Load course data from Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadLiveCourse() {
      try {
        const loaded = await fetchCourseById(courseId);
        if (loaded && isMounted) {
          setCourse(loaded);
          setActiveLesson((prev) => prev || loaded.modules[0]?.lessons[0] || null);
          setSelectedAssignment((prev) => prev || (loaded.assignments.length > 0 ? loaded.assignments[0] : null));
        }
      } catch (err) {
        console.error("Error loading course from Supabase:", err);
      }
    }
    loadLiveCourse();
    return () => { isMounted = false; };
  }, [courseId]);

  // Load enrollment and completions from Supabase
  useEffect(() => {
    let isMounted = true;
    if (course) {
      getUserEnrolledCourseIdsAsync(currentUser?.id).then((enrolled) => {
        if (isMounted) setIsEnrolled(enrolled.includes(course.id));
      });
      getCompletedLessonIdsAsync(course.id, currentUser?.id).then((completed) => {
        if (isMounted) setCompletedLessonIds(completed);
      });
    }
    return () => { isMounted = false; };
  }, [course, currentUser?.id]);

  // Check saved assignment submission
  useEffect(() => {
    let isMounted = true;
    if (selectedAssignment) {
      getAssignmentSubmissionAsync(selectedAssignment.id, currentUser?.id).then((saved) => {
        if (!isMounted) return;
        if (saved) {
          setAssignmentFeedback(saved);
          setGithubUrl(saved.githubUrl || "");
          setLiveUrl(saved.liveUrl || "");
          setSubmissionCode(saved.submissionText || "");
        } else {
          setAssignmentFeedback(null);
        }
      });
    }
    return () => { isMounted = false; };
  }, [selectedAssignment, currentUser?.id]);

  // Automatically trigger AuthModal if visitor is not logged in
  useEffect(() => {
    if (!loading && !currentUser) {
      setAuthOpen(true);
    }
  }, [loading, currentUser]);

  // Anti-download security restrictions: prevent context menu, drag-to-save, and save shortcuts
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest(".classroomVideoContainer")) {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === "VIDEO" || activeEl.closest(".classroomVideoContainer"))) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "radial-gradient(ellipse at 50% 20%, #0f1d36 0%, #060b13 75%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          padding: "24px"
        }}
      >
        <div
          style={{
            maxWidth: "440px",
            width: "100%",
            background: "rgba(11, 20, 38, 0.85)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(52, 211, 153, 0.2)",
            borderRadius: "20px",
            padding: "36px 28px",
            textAlign: "center",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(16, 185, 129, 0.1)"
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              border: "3px solid rgba(52, 211, 153, 0.15)",
              borderTopColor: "#34d399",
              borderRightColor: "#10b981",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 18px"
            }}
          />
          <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#f8fafc", marginBottom: "6px" }}>
            Verifying Student Session
          </h3>
          <p style={{ color: "#94a3b8", fontSize: "13.5px", margin: 0 }}>
            Authenticating credentials and enrolled course permissions...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={{ minHeight: "100vh", background: "#090d16", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", padding: "24px", textAlign: "center" }}>
        <div style={{
          maxWidth: "480px",
          width: "100%",
          background: "rgba(11, 18, 33, 0.95)",
          border: "1px solid rgba(52, 211, 153, 0.3)",
          borderRadius: "20px",
          padding: "40px 32px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.8), 0 0 40px rgba(16, 185, 129, 0.1)",
        }}>
          <div style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "rgba(52, 211, 153, 0.12)",
            border: "1px solid rgba(52, 211, 153, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px"
          }}>
            <Lock size={28} color="#34d399" />
          </div>
          <h2 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "10px", color: "#f8fafc" }}>
            Student Login Required
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "14.5px", lineHeight: "1.6", marginBottom: "26px" }}>
            Course lectures, assignments, and interactive AI mentoring are reserved for registered ClimbUP students. Please log in or sign up to continue.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => { setAuthMode("login"); setAuthOpen(true); }}
              style={{
                padding: "12px 24px",
                background: "linear-gradient(135deg, #a7f3d0, #34d399 50%, #059669)",
                color: "#021526",
                fontWeight: 700,
                fontSize: "14.5px",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(16, 185, 129, 0.35)"
              }}
            >
              Sign In to Classroom
            </button>
            <Link
              href="/"
              style={{
                padding: "12px 20px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#e2e8f0",
                fontWeight: 600,
                fontSize: "14.5px",
                borderRadius: "10px",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center"
              }}
            >
              Back to Home
            </Link>
          </div>
        </div>

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

  if (!course) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "radial-gradient(ellipse at 50% 20%, #0f1d36 0%, #060b13 75%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          padding: "24px",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Ambient glow decoration */}
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "500px",
            height: "500px",
            background: "radial-gradient(circle, rgba(52, 211, 153, 0.08) 0%, transparent 70%)",
            filter: "blur(60px)",
            pointerEvents: "none"
          }}
        />

        <div
          style={{
            maxWidth: "520px",
            width: "100%",
            background: "rgba(11, 20, 38, 0.85)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(52, 211, 153, 0.25)",
            borderRadius: "24px",
            padding: "44px 36px",
            textAlign: "center",
            boxShadow: "0 30px 80px rgba(0, 0, 0, 0.8), 0 0 50px rgba(16, 185, 129, 0.12)",
            position: "relative",
            zIndex: 1
          }}
        >
          {/* Animated Spinner & Center Badge */}
          <div style={{ position: "relative", width: "76px", height: "76px", margin: "0 auto 24px" }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                border: "3px solid rgba(52, 211, 153, 0.15)",
                borderTopColor: "#34d399",
                borderRightColor: "#10b981",
                borderRadius: "50%",
                animation: "spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite"
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: "8px",
                borderRadius: "50%",
                background: "rgba(52, 211, 153, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(52, 211, 153, 0.2)"
              }}
            >
              <Sparkles size={28} color="#34d399" />
            </div>
          </div>

          <h2
            style={{
              fontSize: "22px",
              fontWeight: 800,
              marginBottom: "10px",
              background: "linear-gradient(135deg, #ffffff 30%, #a7f3d0)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.02em"
            }}
          >
            Preparing Classroom Environment
          </h2>

          <p
            style={{
              color: "#94a3b8",
              fontSize: "14px",
              lineHeight: "1.6",
              maxWidth: "400px",
              margin: "0 auto 26px"
            }}
          >
            Synchronizing interactive video lectures, syllabus materials, and AI doubt assistant...
          </p>

          {/* Shimmering Feature Pills */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "28px"
            }}
          >
            <span
              style={{
                padding: "6px 12px",
                background: "rgba(52, 211, 153, 0.08)",
                border: "1px solid rgba(52, 211, 153, 0.2)",
                borderRadius: "20px",
                fontSize: "12px",
                color: "#6ee7b7",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px"
              }}
            >
              <BrainCircuit size={13} /> 768-dim Vector RAG
            </span>
            <span
              style={{
                padding: "6px 12px",
                background: "rgba(56, 189, 248, 0.08)",
                border: "1px solid rgba(56, 189, 248, 0.2)",
                borderRadius: "20px",
                fontSize: "12px",
                color: "#7dd3fc",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px"
              }}
            >
              <Play size={12} /> Adaptive HD Player
            </span>
            <span
              style={{
                padding: "6px 12px",
                background: "rgba(168, 85, 247, 0.08)",
                border: "1px solid rgba(168, 85, 247, 0.2)",
                borderRadius: "20px",
                fontSize: "12px",
                color: "#d8b4fe",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px"
              }}
            >
              <Award size={13} /> Verified Certificate
            </span>
          </div>

          {/* Navigation fallback */}
          <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "18px" }}>
            <Link
              href="/courses"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "#94a3b8",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none"
              }}
            >
              <ArrowLeft size={14} /> Back to Course Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const allLessons = course.modules.flatMap((m) => m.lessons);
  const totalLessonsCount = allLessons.length;
  const progressPercent = totalLessonsCount > 0 
    ? Math.round((completedLessonIds.length / totalLessonsCount) * 100) 
    : 0;

  const handleEnroll = async () => {
    if (!course) return;
    if (!currentUser) {
      setAuthMode("register");
      setAuthOpen(true);
      return;
    }
    await enrollInCourse(course.id, currentUser.id);
    setIsEnrolled(true);
    showToast(`You have successfully enrolled in ${course.title}!`, "success");
  };

  const handleToggleLesson = async (lessonId: string) => {
    if (!course) return;
    const updated = await toggleLessonCompletion(course.id, lessonId, currentUser?.id);
    setCompletedLessonIds(updated);
    if (!completedLessonIds.includes(lessonId)) {
      showToast("Lesson completed! Progress updated.", "success");
    }
  };

  const handleTimestampJump = (
    secondsOrTime: number | string,
    timeLabelOrSeconds?: string | number
  ) => {
    let seconds: number;
    let label: string;

    if (typeof secondsOrTime === "number") {
      seconds = secondsOrTime;
      label = typeof timeLabelOrSeconds === "string" 
        ? timeLabelOrSeconds 
        : `${Math.floor(seconds / 60)}:${(Math.floor(seconds % 60)).toString().padStart(2, "0")}`;
    } else {
      label = secondsOrTime;
      if (typeof timeLabelOrSeconds === "number") {
        seconds = timeLabelOrSeconds;
      } else {
        seconds = parseTimestampToSeconds(secondsOrTime);
      }
    }

    setActiveTimestampBanner(`Video jumped to [${label}]`);
    setTimeout(() => setActiveTimestampBanner(null), 4000);

    // 1. Direct HTML5 Video Player Instant Jump
    if (resolvedVideo.isDirectVideo && videoRef.current) {
      try {
        videoRef.current.currentTime = seconds;
        videoRef.current.play().catch((err) => {
          console.warn("Autoplay was prevented by browser policy:", err);
        });
      } catch (err) {
        console.error("Error seeking HTML5 video:", err);
      }
      return;
    }

    // 2. YouTube & Iframe Player Instant Jump
    const iframe = document.getElementById("classroom-video-player") as HTMLIFrameElement | null;
    if (iframe && activeLesson?.videoUrl) {
      if (resolvedVideo.type === "youtube") {
        try {
          // Instant seek via YouTube iframe API without reloading
          iframe.contentWindow?.postMessage(
            JSON.stringify({
              event: "command",
              func: "seekTo",
              args: [seconds, true],
            }),
            "*"
          );
          iframe.contentWindow?.postMessage(
            JSON.stringify({
              event: "command",
              func: "playVideo",
              args: [],
            }),
            "*"
          );
        } catch {
          iframe.src = getVideoTypeAndEmbedUrl(activeLesson.videoUrl, seconds).embedUrl;
        }
      }
    }
  };

  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !course) return;
    if (!currentUser) {
      setAuthMode("login");
      setAuthOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitAssignment(
        selectedAssignment.id,
        course.id,
        {
          submissionText: submissionCode,
          githubUrl,
          liveUrl,
        },
        currentUser.id
      );
      setAssignmentFeedback(result);
      showToast("Assignment submitted successfully!", "success");
    } catch (err) {
      console.error("Assignment submission error:", err);
      showToast("Submission failed. Please check network and try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const activeQuiz = course.quizzes[0];

  const handleAnswerSelect = (optionIdx: number) => {
    if (quizSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [activeQuizQuestionIdx]: optionIdx,
    }));
  };

  const handleQuizSubmit = () => {
    if (!activeQuiz) return;
    let correctCount = 0;
    activeQuiz.questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswerIndex) {
        correctCount += 1;
      }
    });
    setQuizScore(correctCount);
    setQuizSubmitted(true);
    showToast(`Quiz completed! You scored ${correctCount}/${activeQuiz.questions.length}`, "success");
  };

  const renderCurriculumList = () => {
    if (!course) return null;
    return (
      <div style={{ overflowY: "auto", padding: "16px", flexGrow: 1 }}>
        {course.modules.map((mod) => (
          <div key={mod.id} style={{ marginBottom: "16px" }}>
            <div style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#9ef8dc",
              padding: "8px 10px",
              background: "rgba(255, 255, 255, 0.05)",
              borderRadius: "8px",
              marginBottom: "6px",
            }}>
              {mod.title}
            </div>

            <div style={{ display: "grid", gap: "4px" }}>
              {mod.lessons.map((lesson) => {
                const isCurrent = activeLesson?.id === lesson.id;
                const isDone = completedLessonIds.includes(lesson.id);

                return (
                  <div
                    key={lesson.id}
                    onClick={() => {
                      setActiveLesson(lesson);
                      if (typeof window !== "undefined" && window.innerWidth <= 1024) {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: isCurrent ? "rgba(56, 211, 153, 0.18)" : "transparent",
                      border: `1px solid ${isCurrent ? "rgba(56, 211, 153, 0.35)" : "transparent"}`,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleLesson(lesson.id);
                        }}
                        style={{ cursor: "pointer", display: "grid", placeItems: "center" }}
                      >
                        {isDone ? (
                          <CheckCircle2 size={16} color="#38d399" />
                        ) : (
                          <Circle size={16} color="rgba(255,255,255,0.4)" />
                        )}
                      </span>
                      <span style={{ fontSize: "13px", color: isCurrent ? "#fff" : "rgba(255, 255, 255, 0.8)", fontWeight: isCurrent ? 700 : 500 }}>
                        {lesson.title}
                      </span>
                    </div>

                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>
                      {lesson.duration}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAiTutor = (height = "600px") => (
    <div style={{ height, minHeight: "420px", maxHeight: "calc(100vh - 180px)", overflow: "hidden" }}>
      <LectureChatbot
        key={activeLesson?.id || "lecture-ai-tutor"}
        lessonId={activeLesson?.id || "lesson_70635d10"}
        sessionId="student_session_1"
        onSeekVideo={handleTimestampJump}
      />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#021526", color: "#fff" }}>
      <Navbar onLogin={() => { setAuthMode("login"); setAuthOpen(true); }} onSignUp={() => { setAuthMode("register"); setAuthOpen(true); }} />
      <MobileNavTabs />

      {/* Top Classroom Bar */}
      <div className="classroomTopBar">
        <div className="classroomTopBarLeft">
          <Link href="/courses" className="allCoursesBackBtn">
            <ArrowLeft size={16} /> All Courses
          </Link>
          <h1 className="classroomCourseTitle">
            {course.title}
          </h1>
        </div>

        {/* Progress & Enrollment Action */}
        <div className="classroomProgressBadge">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
              Progress: <strong style={{ color: "#38d399" }}>{progressPercent}%</strong> ({completedLessonIds.length}/{totalLessonsCount} completed)
            </span>
            <div style={{ width: "90px", height: "8px", background: "rgba(255,255,255,0.1)", borderRadius: "99px", overflow: "hidden" }}>
              <div style={{ width: `${progressPercent}%`, height: "100%", background: "linear-gradient(90deg, #38d399, #00c78c)", transition: "width 0.3s ease" }} />
            </div>
          </div>

          {!isEnrolled ? (
            <button
              type="button"
              onClick={handleEnroll}
              style={{
                background: "linear-gradient(135deg, #38d399, #00c78c)",
                border: "none",
                borderRadius: "8px",
                color: "#021526",
                fontWeight: 800,
                fontSize: "13px",
                padding: "8px 18px",
                cursor: "pointer",
                boxShadow: "0 0 16px rgba(56, 211, 153, 0.4)",
              }}
            >
              Enroll Now (Free)
            </button>
          ) : (
            <span className="enrolledStatusBadge">
              <CheckCircle2 size={14} /> Enrolled Learner
            </span>
          )}
        </div>
      </div>

      {/* Main Classroom Workspace: Video & Activity Left, Curriculum/AI Right */}
      <div className="classroomWorkspace">
        {/* Left Column: Video Player + Tabs */}
        <div className="classroomMainColumn">
          
          {/* Video Player Container (Protected with anti-download restrictions) */}
          <div
            className="classroomVideoContainer"
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
          >
            {/* Player Quick Controls (Speed & Quality options) */}
            {activeLesson?.videoUrl && (
              <div className="classroomPlayerToolbar">
                {/* Playback Speed Control */}
                <div className="playerControlGroup">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSpeedMenu(!showSpeedMenu);
                      setShowQualityMenu(false);
                    }}
                    className="playerControlBtn"
                    title="Change Playback Speed"
                  >
                    <Gauge size={13} /> {playbackSpeed}x
                  </button>
                  {showSpeedMenu && (
                    <div className="playerControlDropdown">
                      <div className="playerControlDropdownTitle">Playback Speed</div>
                      {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleSpeedChange(s)}
                          className={`playerDropdownItem ${playbackSpeed === s ? "active" : ""}`}
                        >
                          <span>{s === 1 ? "1.0x (Normal)" : `${s}x`}</span>
                          {playbackSpeed === s && <CheckCircle2 size={12} color="#38d399" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Video Quality Control */}
                <div className="playerControlGroup">
                  <button
                    type="button"
                    onClick={() => {
                      setShowQualityMenu(!showQualityMenu);
                      setShowSpeedMenu(false);
                    }}
                    className="playerControlBtn"
                    title="Change Video Quality"
                  >
                    <Settings2 size={13} /> {selectedQuality.replace(" (1080p)", "")}
                  </button>
                  {showQualityMenu && (
                    <div className="playerControlDropdown">
                      <div className="playerControlDropdownTitle">Streaming Quality</div>
                      {["Auto (1080p)", "1080p HD", "720p", "480p", "360p"].map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => handleQualityChange(q)}
                          className={`playerDropdownItem ${selectedQuality === q ? "active" : ""}`}
                        >
                          <span>{q}</span>
                          {selectedQuality === q && <CheckCircle2 size={12} color="#38d399" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeLesson?.videoUrl ? (
              resolvedVideo.isDirectVideo ? (
                <>
                  <video
                    key={activeLesson.id || activeLesson.videoUrl}
                    ref={videoRef}
                    id="classroom-video-player-html5"
                    src={resolvedVideo.embedUrl}
                    controls
                    controlsList="nodownload"
                    disablePictureInPicture
                    disableRemotePlayback
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                    playsInline
                    preload="metadata"
                    onCanPlay={() => setVideoPlaybackError(false)}
                    onLoadedData={() => setVideoPlaybackError(false)}
                    onError={(e) => {
                      const err = e.currentTarget.error;
                      if (err && (err.code === 4 || err.code === 2)) {
                        setVideoPlaybackError(true);
                      }
                    }}
                    style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                  />
                  {videoPlaybackError && (
                    <div className="classroomVideoErrorOverlay">
                      <p style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 600 }}>Video playback interrupted or format unsupported.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setVideoPlaybackError(false);
                          if (videoRef.current) {
                            videoRef.current.load();
                            videoRef.current.play().catch(() => {});
                          }
                        }}
                        className="retryVideoBtn"
                      >
                        <RefreshCw size={14} style={{ display: "inline-block", marginRight: "6px" }} />
                        Reload Video
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <iframe
                    key={activeLesson.id || activeLesson.videoUrl}
                    id="classroom-video-player"
                    src={resolvedVideo.embedUrl}
                    title={activeLesson.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    style={{ width: "100%", height: "100%", border: "none" }}
                  />
                  {/* Google Drive Popout blocker: intercepts clicks to the external 'Open in new window' button to prevent downloads */}
                  {resolvedVideo.type === "drive" && (
                    <div
                      className="classroomIframePopoutBlocker"
                      title="ClimbUP Protected Video"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      onContextMenu={(e) => e.preventDefault()}
                    />
                  )}
                </>
              )
            ) : (
              <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#94a3b8" }}>
                <span>Select a lesson to begin</span>
              </div>
            )}

            {/* Timestamp Jump Toast Notification */}
            {activeTimestampBanner && (
              <div style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "rgba(2, 21, 38, 0.95)",
                border: "1px solid #38d399",
                borderRadius: "8px",
                padding: "8px 14px",
                color: "#38d399",
                fontSize: "13px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                animation: "fadeIn 0.2s ease",
              }}>
                <Sparkles size={16} /> {activeTimestampBanner}
              </div>
            )}
          </div>

          {/* Lesson Header Row */}
          <div className="lessonHeaderRow">
            <div className="lessonHeaderInfo">
              <h2>
                {activeLesson?.title}
              </h2>
              <span className="lessonHeaderMeta">
                Duration: {activeLesson?.duration} • Instructor: {course.instructor.name}
              </span>
            </div>

            <button
              type="button"
              onClick={() => activeLesson && handleToggleLesson(activeLesson.id)}
              className={`markCompleteBtn ${activeLesson && completedLessonIds.includes(activeLesson.id) ? "completed" : "pending"}`}
            >
              {activeLesson && completedLessonIds.includes(activeLesson.id) ? (
                <>
                  <CheckCircle2 size={16} color="#38d399" /> Completed
                </>
              ) : (
                <>
                  <Circle size={16} /> Mark as Complete
                </>
              )}
            </button>
          </div>

          {/* ── COURSE ACTIVITY TABS (Unified Mobile & Desktop Activity Tabs) ── */}
          <div className="classroomTabsWrapper">
            <div className="classroomTabsCapsule" role="tablist">
              {[
                { id: "assignments", label: "Assignment", icon: FileCheck2 },
                { id: "mcqs", label: "MCQs Practice", icon: Award },
                { id: "resources", label: "Resources", icon: FolderDown },
                { id: "syllabus", label: "Syllabus", icon: FileCheck2, mobileOnly: true },
                { id: "rag", label: "AI Mentor", icon: Sparkles, mobileOnly: true },
                { id: "overview", label: "Overview", icon: BrainCircuit },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`classroomTabBtn ${isActive ? "active" : ""} ${tab.mobileOnly ? "mobileOnlyTab" : ""}`}
                  >
                    <Icon size={16} /> {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content Area */}
          <div style={{ flexGrow: 1 }}>
            {/* 1. Overview Tab */}
            {activeTab === "overview" && (
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "12px" }}>
                  About this Course & Current Module
                </h3>
                <p style={{ color: "rgba(255, 255, 255, 0.75)", lineHeight: "1.6", fontSize: "15px", marginBottom: "20px" }}>
                  {course.description}
                </p>

                <h4 style={{ fontSize: "16px", fontWeight: 700, color: "#38d399", marginBottom: "10px" }}>
                  What You Will Master:
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "10px", marginBottom: "24px" }}>
                  {course.skillsGained.map((skill) => (
                    <div key={skill} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "rgba(255,255,255,0.85)" }}>
                      <CheckCircle2 size={16} color="#38d399" /> {skill}
                    </div>
                  ))}
                </div>

                <div style={{
                  background: "rgba(7, 48, 73, 0.5)",
                  border: "1px solid rgba(56, 211, 153, 0.25)",
                  borderRadius: "14px",
                  padding: "18px",
                  display: "flex",
                  gap: "16px",
                  alignItems: "center",
                }}>
                  <div style={{ position: "relative", width: "52px", height: "52px", borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
                    <Image src={course.instructor.avatar} alt={course.instructor.name} fill style={{ objectFit: "cover" }} />
                  </div>
                  <div>
                    <h5 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 4px", color: "#fff" }}>
                      Taught by {course.instructor.name}
                    </h5>
                    <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)", margin: 0 }}>
                      {course.instructor.title} — {course.instructor.bio}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Assignment Tab (Option A - Single Clean Professional Workspace) */}
            {activeTab === "assignments" && (
              <div>
                {selectedAssignment ? (
                  <div className="assignmentWorkspaceCard" style={{
                    background: "linear-gradient(180deg, rgba(13, 22, 38, 0.85) 0%, rgba(9, 15, 28, 0.95) 100%)",
                    border: "1px solid rgba(56, 211, 153, 0.22)",
                    borderRadius: "18px",
                    padding: "28px 32px",
                    boxShadow: "0 14px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(56, 211, 153, 0.04)",
                    backdropFilter: "blur(14px)",
                  }}>
                    {/* Header Row */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "14px" }}>
                      <div>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, color: "#38d399", textTransform: "uppercase", letterSpacing: "0.08em", background: "rgba(56, 211, 153, 0.1)", padding: "3px 10px", borderRadius: "6px", marginBottom: "8px" }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#38d399", display: "inline-block", boxShadow: "0 0 8px #38d399" }} />
                          Project Assignment
                        </div>
                        <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.01em" }}>
                          {selectedAssignment.title}
                        </h3>
                      </div>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "12.5px", background: "rgba(56, 211, 153, 0.15)", border: "1px solid rgba(56, 211, 153, 0.35)", color: "#38d399", padding: "6px 14px", borderRadius: "8px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                          <Award size={14} /> Max Score: {selectedAssignment.maxScore} Pts
                        </span>
                        <span style={{ fontSize: "12.5px", color: "rgba(255, 255, 255, 0.7)", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.08)", padding: "6px 14px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                          <Clock size={14} color="#94a3b8" /> Due: {selectedAssignment.dueDate}
                        </span>
                      </div>
                    </div>

                    {/* Problem Statement */}
                    <p style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "15px", lineHeight: "1.7", margin: "0 0 24px" }}>
                      {selectedAssignment.description}
                    </p>

                    {/* Acceptance Criteria */}
                    <div style={{ marginBottom: "26px" }}>
                      <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#38d399", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px", display: "flex", alignItems: "center", gap: "7px" }}>
                        <CheckCircle2 size={16} /> Key Objectives & Acceptance Criteria
                      </h4>
                      <div style={{ display: "grid", gap: "10px" }}>
                        {selectedAssignment.instructions.map((inst, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px", fontSize: "14px", color: "rgba(255, 255, 255, 0.88)", lineHeight: "1.55", background: "rgba(255, 255, 255, 0.03)", padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                            <CheckCircle2 size={16} color="#38d399" style={{ flexShrink: 0, marginTop: "2px" }} />
                            <span>{inst}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Starter Code if provided */}
                    {selectedAssignment.starterCode && (
                      <div style={{ marginBottom: "26px" }}>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                          <Code2 size={14} color="#38d399" /> Starter Code Boilerplate:
                        </div>
                        <pre style={{
                          background: "#010f1c",
                          border: "1px solid rgba(56, 211, 153, 0.2)",
                          borderRadius: "10px",
                          padding: "16px",
                          fontSize: "13px",
                          color: "#9ef8dc",
                          overflowX: "auto",
                          margin: 0,
                          lineHeight: "1.55",
                        }}>
                          <code>{selectedAssignment.starterCode}</code>
                        </pre>
                      </div>
                    )}

                    {/* Submission Feedback Card if exists */}
                    {assignmentFeedback && (
                      <div style={{
                        background: "rgba(56, 211, 153, 0.1)",
                        border: "1px solid rgba(56, 211, 153, 0.4)",
                        borderRadius: "12px",
                        padding: "18px 22px",
                        marginBottom: "26px",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                          <span style={{ color: "#38d399", fontWeight: 800, fontSize: "14.5px", display: "flex", alignItems: "center", gap: "7px" }}>
                            <CheckCircle2 size={18} /> Submission Recorded ({assignmentFeedback.submittedAt})
                          </span>
                          {assignmentFeedback.score !== undefined && (
                            <span style={{ background: "#38d399", color: "#021526", padding: "4px 12px", borderRadius: "6px", fontWeight: 800, fontSize: "13px" }}>
                              Score: {assignmentFeedback.score} / {selectedAssignment.maxScore}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: "0 0 8px", fontSize: "13.5px", color: "rgba(255,255,255,0.9)", lineHeight: "1.5" }}>
                          {assignmentFeedback.feedback}
                        </p>
                        {assignmentFeedback.githubUrl && (
                          <div style={{ fontSize: "12.5px", color: "#9ef8dc" }}>
                            Repository: <a href={assignmentFeedback.githubUrl} target="_blank" rel="noreferrer" style={{ color: "#38d399", textDecoration: "underline" }}>{assignmentFeedback.githubUrl}</a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Interactive Submission Form */}
                    <form onSubmit={handleAssignmentSubmit} style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "24px" }}>
                      <div style={{ marginBottom: "16px" }}>
                        <h4 style={{ fontSize: "16.5px", fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>
                          Submit Your Project Solution
                        </h4>
                        <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", margin: 0 }}>
                          Provide your code repository link and any deployment URL for grading.
                        </p>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", marginBottom: "16px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.75)", marginBottom: "6px" }}>
                            GitHub Repository Link:
                          </label>
                          <input
                            type="url"
                            placeholder="https://github.com/your-username/project"
                            value={githubUrl}
                            onChange={(e) => setGithubUrl(e.target.value)}
                            style={{
                              width: "100%",
                              background: "rgba(2, 21, 38, 0.85)",
                              border: "1px solid rgba(56, 211, 153, 0.3)",
                              borderRadius: "9px",
                              padding: "11px 14px",
                              color: "#fff",
                              fontSize: "13.5px",
                              outline: "none",
                              boxSizing: "border-box",
                              transition: "border-color 160ms ease, box-shadow 160ms ease",
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.75)", marginBottom: "6px" }}>
                            Live Deployed URL (Optional):
                          </label>
                          <input
                            type="url"
                            placeholder="https://my-app.vercel.app"
                            value={liveUrl}
                            onChange={(e) => setLiveUrl(e.target.value)}
                            style={{
                              width: "100%",
                              background: "rgba(2, 21, 38, 0.85)",
                              border: "1px solid rgba(56, 211, 153, 0.3)",
                              borderRadius: "9px",
                              padding: "11px 14px",
                              color: "#fff",
                              fontSize: "13.5px",
                              outline: "none",
                              boxSizing: "border-box",
                              transition: "border-color 160ms ease, box-shadow 160ms ease",
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: "22px" }}>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.75)", marginBottom: "6px" }}>
                          Implementation Notes & Architecture Summary:
                        </label>
                        <textarea
                          rows={4}
                          placeholder="Briefly describe your approach, state management, key components, and challenges solved..."
                          value={submissionCode}
                          onChange={(e) => setSubmissionCode(e.target.value)}
                          style={{
                            width: "100%",
                            background: "rgba(2, 21, 38, 0.85)",
                            border: "1px solid rgba(56, 211, 153, 0.3)",
                            borderRadius: "9px",
                            padding: "12px 14px",
                            color: "#fff",
                            fontSize: "13.5px",
                            fontFamily: "monospace",
                            outline: "none",
                            boxSizing: "border-box",
                            lineHeight: "1.5",
                          }}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        style={{
                          background: "linear-gradient(135deg, #38d399, #00c78c)",
                          border: "none",
                          borderRadius: "10px",
                          color: "#021526",
                          fontWeight: 800,
                          fontSize: "14px",
                          padding: "12px 28px",
                          cursor: submitting ? "not-allowed" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          boxShadow: "0 4px 18px rgba(56, 211, 153, 0.35)",
                          opacity: submitting ? 0.7 : 1,
                          transition: "transform 160ms ease, box-shadow 160ms ease",
                        }}
                      >
                        <Send size={15} />
                        {submitting ? "Evaluating & Submitting..." : "Submit Assignment Solution"}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div style={{ color: "rgba(255,255,255,0.6)", padding: "32px", textAlign: "center", background: "rgba(15, 23, 42, 0.5)", borderRadius: "14px", border: "1px dashed rgba(255, 255, 255, 0.1)" }}>
                    No assignment available for this course yet.
                  </div>
                )}
              </div>
            )}

            {/* 3. MCQs Practice Tab */}
            {activeTab === "mcqs" && activeQuiz && (
              <div className="mcqWorkspaceCard" style={{
                background: "linear-gradient(180deg, rgba(13, 22, 38, 0.85) 0%, rgba(9, 15, 28, 0.95) 100%)",
                border: "1px solid rgba(56, 211, 153, 0.22)",
                borderRadius: "18px",
                padding: "28px 32px",
                boxShadow: "0 14px 40px rgba(0, 0, 0, 0.35)",
                backdropFilter: "blur(14px)",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>
                      {activeQuiz.title}
                    </h3>
                    <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", margin: 0 }}>
                      {activeQuiz.description}
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{
                      background: "rgba(56, 211, 153, 0.15)",
                      color: "#38d399",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}>
                      <Timer size={16} /> 10:00 Timer
                    </span>
                  </div>
                </div>

                {/* Question Navigator */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
                  {activeQuiz.questions.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveQuizQuestionIdx(i)}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        background: activeQuizQuestionIdx === i
                          ? "#38d399"
                          : selectedAnswers[i] !== undefined
                          ? "rgba(56, 211, 153, 0.3)"
                          : "rgba(255, 255, 255, 0.08)",
                        color: activeQuizQuestionIdx === i ? "#021526" : "#fff",
                        fontWeight: 700,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                {/* Current Question */}
                {activeQuiz.questions[activeQuizQuestionIdx] && (
                  <div>
                    <div style={{ fontSize: "13px", color: "#38d399", fontWeight: 700, marginBottom: "8px" }}>
                      Question {activeQuizQuestionIdx + 1} of {activeQuiz.questions.length}
                    </div>

                    <h4 style={{ fontSize: "17px", fontWeight: 700, color: "#fff", marginBottom: "18px", lineHeight: "1.5" }}>
                      {activeQuiz.questions[activeQuizQuestionIdx].question}
                    </h4>

                    {/* Options */}
                    <div style={{ display: "grid", gap: "12px", marginBottom: "24px" }}>
                      {activeQuiz.questions[activeQuizQuestionIdx].options.map((opt, optIdx) => {
                        const isSelected = selectedAnswers[activeQuizQuestionIdx] === optIdx;
                        const isCorrect = optIdx === activeQuiz.questions[activeQuizQuestionIdx].correctAnswerIndex;
                        
                        let borderColor = "rgba(255, 255, 255, 0.15)";
                        let bgColor = "rgba(255, 255, 255, 0.04)";

                        if (quizSubmitted) {
                          if (isCorrect) {
                            borderColor = "#10b981";
                            bgColor = "rgba(16, 185, 129, 0.15)";
                          } else if (isSelected && !isCorrect) {
                            borderColor = "#ef4444";
                            bgColor = "rgba(239, 68, 68, 0.15)";
                          }
                        } else if (isSelected) {
                          borderColor = "#38d399";
                          bgColor = "rgba(56, 211, 153, 0.15)";
                        }

                        return (
                          <div
                            key={optIdx}
                            onClick={() => handleAnswerSelect(optIdx)}
                            style={{
                              padding: "14px 18px",
                              borderRadius: "12px",
                              border: `1px solid ${borderColor}`,
                              background: bgColor,
                              cursor: quizSubmitted ? "default" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <span style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "50%",
                              border: `1px solid ${isSelected ? "#38d399" : "rgba(255,255,255,0.3)"}`,
                              display: "grid",
                              placeItems: "center",
                              fontSize: "12px",
                              fontWeight: 700,
                              color: isSelected ? "#38d399" : "#fff",
                            }}>
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span style={{ fontSize: "14px", color: "#fff" }}>
                              {opt}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Rationale if submitted */}
                    {quizSubmitted && (
                      <div style={{
                        background: "rgba(56, 211, 153, 0.08)",
                        border: "1px solid rgba(56, 211, 153, 0.3)",
                        borderRadius: "12px",
                        padding: "16px",
                        marginBottom: "20px",
                      }}>
                        <div style={{ color: "#38d399", fontWeight: 700, fontSize: "13px", marginBottom: "4px" }}>
                          Explanation & Video Reference:
                        </div>
                        <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.85)" }}>
                          {activeQuiz.questions[activeQuizQuestionIdx].explanation}
                        </p>
                        {activeQuiz.questions[activeQuizQuestionIdx].timestampRef && (
                          <button
                            type="button"
                            onClick={() => handleTimestampJump(activeQuiz.questions[activeQuizQuestionIdx].timestampRef!, 60)}
                            style={{
                              marginTop: "8px",
                              background: "transparent",
                              border: "none",
                              color: "#38d399",
                              fontSize: "12px",
                              cursor: "pointer",
                              padding: 0,
                              textDecoration: "underline",
                            }}
                          >
                            Review video moment at [{activeQuiz.questions[activeQuizQuestionIdx].timestampRef}] →
                          </button>
                        )}
                      </div>
                    )}

                    {/* Quiz Action Buttons */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <button
                        type="button"
                        disabled={activeQuizQuestionIdx === 0}
                        onClick={() => setActiveQuizQuestionIdx((prev) => Math.max(0, prev - 1))}
                        style={{
                          background: "rgba(255, 255, 255, 0.08)",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          color: "#fff",
                          borderRadius: "8px",
                          padding: "8px 16px",
                          cursor: activeQuizQuestionIdx === 0 ? "not-allowed" : "pointer",
                          opacity: activeQuizQuestionIdx === 0 ? 0.5 : 1,
                        }}
                      >
                        Previous
                      </button>

                      {!quizSubmitted ? (
                        <button
                          type="button"
                          onClick={handleQuizSubmit}
                          style={{
                            background: "linear-gradient(135deg, #38d399, #00c78c)",
                            border: "none",
                            borderRadius: "8px",
                            color: "#021526",
                            fontWeight: 800,
                            padding: "9px 20px",
                            cursor: "pointer",
                          }}
                        >
                          Submit Test & See Score
                        </button>
                      ) : (
                        <div style={{ fontWeight: 800, color: "#38d399" }}>
                          Result: {quizScore} / {activeQuiz.questions.length} Correct
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={activeQuizQuestionIdx === activeQuiz.questions.length - 1}
                        onClick={() => setActiveQuizQuestionIdx((prev) => Math.min(activeQuiz.questions.length - 1, prev + 1))}
                        style={{
                          background: "rgba(255, 255, 255, 0.08)",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          color: "#fff",
                          borderRadius: "8px",
                          padding: "8px 16px",
                          cursor: activeQuizQuestionIdx === activeQuiz.questions.length - 1 ? "not-allowed" : "pointer",
                          opacity: activeQuizQuestionIdx === activeQuiz.questions.length - 1 ? 0.5 : 1,
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. Resources Tab */}
            {activeTab === "resources" && (
              <div>
                <div style={{ display: "grid", gap: "10px" }}>
                  {course.resources.map((res) => (
                    <div
                      key={res.id}
                      style={{
                        background: "rgba(15, 23, 42, 0.75)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "14px",
                        padding: "16px 20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "16px",
                        backdropFilter: "blur(12px)",
                        transition: "all 160ms ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <div style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "10px",
                          background: "rgba(56, 211, 153, 0.12)",
                          border: "1px solid rgba(56, 211, 153, 0.25)",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}>
                          {res.fileType === "github" ? <Code2 size={20} color="#38d399" /> : <FolderDown size={20} color="#38d399" />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "14.5px", color: "#fff", marginBottom: "3px" }}>
                            {res.title}
                          </div>
                          <div style={{ fontSize: "12.5px", color: "rgba(255, 255, 255, 0.65)" }}>
                            {res.description} {res.fileSize && <span style={{ color: "rgba(255, 255, 255, 0.4)" }}> • {res.fileSize}</span>}
                          </div>
                        </div>
                      </div>

                      <a
                        href={res.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: "rgba(56, 211, 153, 0.12)",
                          color: "#38d399",
                          border: "1px solid rgba(56, 211, 153, 0.3)",
                          borderRadius: "8px",
                          padding: "8px 16px",
                          fontSize: "12.5px",
                          fontWeight: 700,
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          transition: "all 150ms ease",
                        }}
                      >
                        Access Resource <ExternalLink size={13} />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Discussions Tab */}
            {activeTab === "discussions" && (
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "14px" }}>
                  Classroom Q&A Community
                </h3>
                <div style={{
                  background: "rgba(7, 48, 73, 0.4)",
                  border: "1px solid rgba(56, 211, 153, 0.2)",
                  borderRadius: "14px",
                  padding: "16px",
                  marginBottom: "20px",
                }}>
                  <input
                    type="text"
                    placeholder="Ask a question about this lecture or assignment..."
                    style={{
                      width: "100%",
                      background: "rgba(2, 21, 38, 0.8)",
                      border: "1px solid rgba(56, 211, 153, 0.3)",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      color: "#fff",
                      fontSize: "14px",
                      outline: "none",
                      marginBottom: "10px",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => showToast("Question posted to classroom thread!", "success")}
                    style={{
                      background: "linear-gradient(135deg, #38d399, #00c78c)",
                      border: "none",
                      borderRadius: "8px",
                      color: "#021526",
                      fontWeight: 700,
                      fontSize: "13px",
                      padding: "8px 16px",
                      cursor: "pointer",
                    }}
                  >
                    Post Question
                  </button>
                </div>

                <div style={{ display: "grid", gap: "12px" }}>
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <strong style={{ fontSize: "14px", color: "#38d399" }}>Karthik S.</strong>
                      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>2 hours ago</span>
                    </div>
                    <p style={{ margin: "0 0 6px", fontSize: "13px", color: "rgba(255,255,255,0.85)" }}>
                      How do I handle Supabase session refresh in Vercel Edge middleware without timeout?
                    </p>
                    <div style={{ fontSize: "12px", color: "#9ef8dc" }}>
                      ★ Answered by Instructor Alex: <em>&quot;Use AbortSignal.timeout(3000) inside global fetch so it fails gracefully.&quot;</em>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. Certificate Tab */}
            {activeTab === "certificate" && (
              <div style={{
                background: "radial-gradient(circle at center, rgba(7, 48, 73, 0.8), rgba(2, 21, 38, 0.95))",
                border: "1px solid rgba(56, 211, 153, 0.35)",
                borderRadius: "20px",
                padding: "40px 24px",
                textAlign: "center",
              }}>
                <Award size={56} color="#38d399" style={{ margin: "0 auto 16px" }} />
                <h3 style={{ fontSize: "24px", fontWeight: 800, color: "#fff", marginBottom: "8px" }}>
                  Official Course Certificate of Completion
                </h3>
                <p style={{ color: "rgba(255, 255, 255, 0.7)", maxWidth: "520px", margin: "0 auto 24px", fontSize: "14px" }}>
                  Complete 100% of the lessons and submit all course assignments to unlock your verifiable, shareable digital credential.
                </p>

                <div style={{
                  maxWidth: "400px",
                  margin: "0 auto 24px",
                  background: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "12px",
                  padding: "16px",
                  border: "1px solid rgba(56, 211, 153, 0.2)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
                    <span>Curriculum Completion:</span>
                    <strong style={{ color: "#38d399" }}>{progressPercent}%</strong>
                  </div>
                  <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.1)", borderRadius: "99px", overflow: "hidden" }}>
                    <div style={{ width: `${progressPercent}%`, height: "100%", background: "#38d399" }} />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (progressPercent < 100) {
                      showToast(`You have completed ${progressPercent}%. Finish remaining modules to unlock certificate.`, "error");
                    } else {
                      showToast("Certificate downloaded successfully!", "success");
                    }
                  }}
                  style={{
                    background: progressPercent >= 100 ? "linear-gradient(135deg, #38d399, #00c78c)" : "rgba(255, 255, 255, 0.1)",
                    color: progressPercent >= 100 ? "#021526" : "rgba(255, 255, 255, 0.5)",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: 800,
                    fontSize: "14px",
                    padding: "12px 24px",
                    cursor: "pointer",
                  }}
                >
                  {progressPercent >= 100 ? "Download Verifiable PDF" : "Locked (Complete 100% to Unlock)"}
                </button>
              </div>
            )}

            {/* 7. Syllabus Tab (Mobile Unified Classroom View) */}
            {activeTab === "syllabus" && (
              <div style={{
                background: "linear-gradient(180deg, rgba(13, 22, 38, 0.85) 0%, rgba(9, 15, 28, 0.95) 100%)",
                border: "1px solid rgba(56, 211, 153, 0.22)",
                borderRadius: "18px",
                overflow: "hidden",
                boxShadow: "0 14px 40px rgba(0, 0, 0, 0.35)",
              }}>
                <div style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  fontWeight: 700,
                  fontSize: "15px",
                  color: "#38d399",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <FileCheck2 size={16} /> Course Syllabus & Lessons Playlist
                </div>
                {renderCurriculumList()}
              </div>
            )}

            {/* 8. AI Tutor Tab (Mobile Unified Classroom View) */}
            {activeTab === "rag" && (
              <div style={{
                background: "linear-gradient(180deg, rgba(13, 22, 38, 0.85) 0%, rgba(9, 15, 28, 0.95) 100%)",
                border: "1px solid rgba(56, 211, 153, 0.22)",
                borderRadius: "18px",
                overflow: "hidden",
                boxShadow: "0 14px 40px rgba(0, 0, 0, 0.35)",
              }}>
                {renderAiTutor("580px")}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Desktop Sticky Sidebar (Curriculum Playlist OR RAG AI Chatbot) */}
        <aside className="classroomSidebarColumn">
          {/* Sidebar Mode Switcher */}
          <div className="sidebarTabsCapsule">
            <button
              type="button"
              onClick={() => setSidebarTab("curriculum")}
              className={`sidebarTabBtn ${sidebarTab === "curriculum" ? "active" : ""}`}
            >
              <FileCheck2 size={14} /> Course Syllabus
            </button>

            <button
              type="button"
              onClick={() => setSidebarTab("rag")}
              className={`sidebarTabBtn ${sidebarTab === "rag" ? "active" : ""}`}
            >
              <Sparkles size={14} /> AI Mentor
            </button>
          </div>

          {/* SIDEBAR TAB A: Curriculum List */}
          {sidebarTab === "curriculum" && renderCurriculumList()}

          {/* SIDEBAR TAB B: Live EduRAG Video AI Tutor */}
          {sidebarTab === "rag" && renderAiTutor("100%")}
        </aside>
      </div>

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
